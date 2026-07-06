// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IReputation} from "./interfaces/IReputation.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title Reputation
/// @author CROO Hub
/// @notice Immutable, objective performance ledger for registered AI agents. Scores are derived
///         exclusively from verified task completion (settled escrows) and buyer reviews tied to
///         those settlements - never from arbitrary user input - so reputation cannot be gamed by
///         self-reporting.
/// @dev Only addresses holding {RECORDER_ROLE} (in practice, the deployed EscrowCommerce contract)
///      may write completion outcomes. Scoring math lives in small `internal` functions
///      (`_computeReputationScore`, `_computeTrustScore`, `_qualifiesForBadge`) so future
///      ML-driven or governance-weighted formulas can replace them without any storage migration.
///      Full historical time series is intentionally NOT kept in storage - only the latest
///      aggregate per agent - to keep per-agent storage O(1) regardless of job volume. The
///      {ReputationUpdated} event carries every field on every change, so the CROO Hub backend can
///      reconstruct complete history into MongoDB by indexing events.
contract Reputation is IReputation, AccessControl {
    /// @notice Role allowed to record job outcomes. Granted to the EscrowCommerce contract.
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    uint256 private constant BPS_DENOMINATOR = 10_000;
    uint256 private constant SUCCESS_WEIGHT_BPS = 6_000; // 60% of reputationScore
    uint256 private constant RATING_WEIGHT_BPS = 4_000; // 40% of reputationScore
    uint256 private constant MAX_RATING = 5;

    /// @notice Number of completed jobs at which an agent's trust-score volume multiplier saturates.
    uint256 public constant VOLUME_CONFIDENCE_CAP = 50;

    /// @notice Minimum completed jobs required before the automatic verified badge can be granted.
    uint256 public constant MIN_JOBS_FOR_BADGE = 10;

    /// @notice Minimum success rate (bps) required before the automatic verified badge can be granted.
    uint256 public constant MIN_SUCCESS_RATE_FOR_BADGE_BPS = 9_500; // 95%

    IAgentRegistry public immutable agentRegistry;

    mapping(uint256 => AgentReputation) private _reputations;

    /// @dev escrowId => buyer address eligible to submit a review for that settlement.
    mapping(uint256 => address) private _eligibleReviewer;
    /// @dev escrowId => agentId the review applies to.
    mapping(uint256 => uint256) private _reviewAgentId;
    /// @dev escrowId => whether a review has already been submitted.
    mapping(uint256 => bool) private _reviewed;
    /// @dev escrowId => whether an outcome has already been recorded (prevents double counting).
    mapping(uint256 => bool) private _outcomeRecorded;

    error UnknownAgent(uint256 agentId);
    error EscrowAlreadyRecorded(uint256 escrowId);
    error NotEligibleReviewer(uint256 escrowId, address caller);
    error AlreadyReviewed(uint256 escrowId);
    error InvalidRating(uint8 rating);
    error InvalidAgentRegistry();

    /// @param admin Address granted `DEFAULT_ADMIN_ROLE` at deployment.
    /// @param agentRegistry_ Address of the deployed {AgentRegistry}, used to validate agent ids.
    constructor(address admin, address agentRegistry_) {
        if (admin == address(0) || agentRegistry_ == address(0)) revert InvalidAgentRegistry();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        agentRegistry = IAgentRegistry(agentRegistry_);
    }

    /// @inheritdoc IReputation
    function recordSuccessfulJob(
        uint256 agentId,
        uint256 escrowId,
        address buyer,
        uint256 responseLatency,
        uint256 executionDuration,
        uint256 revenueAmount
    ) external onlyRole(RECORDER_ROLE) {
        _guardOutcome(agentId, escrowId);
        _outcomeRecorded[escrowId] = true;

        AgentReputation storage rep = _reputations[agentId];
        rep.completedJobs += 1;
        rep.successfulJobs += 1;
        rep.totalResponseLatency += responseLatency;
        rep.totalExecutionDuration += executionDuration;
        rep.totalRevenue += revenueAmount;
        rep.lastActivityAt = block.timestamp;

        _eligibleReviewer[escrowId] = buyer;
        _reviewAgentId[escrowId] = agentId;

        _recompute(agentId);
        emit ReputationUpdated(agentId, escrowId, true, rep.reputationScore, rep.trustScore, block.timestamp);
    }

    /// @inheritdoc IReputation
    function recordFailedJob(
        uint256 agentId,
        uint256 escrowId,
        address buyer,
        uint256 responseLatency
    ) external onlyRole(RECORDER_ROLE) {
        _guardOutcome(agentId, escrowId);
        _outcomeRecorded[escrowId] = true;

        AgentReputation storage rep = _reputations[agentId];
        rep.completedJobs += 1;
        rep.failedJobs += 1;
        rep.totalResponseLatency += responseLatency;
        rep.lastActivityAt = block.timestamp;

        _eligibleReviewer[escrowId] = buyer;
        _reviewAgentId[escrowId] = agentId;

        _recompute(agentId);
        emit ReputationUpdated(agentId, escrowId, false, rep.reputationScore, rep.trustScore, block.timestamp);
    }

    /// @inheritdoc IReputation
    function submitReview(uint256 escrowId, uint8 rating) external {
        if (rating == 0 || rating > MAX_RATING) revert InvalidRating(rating);
        if (_eligibleReviewer[escrowId] != msg.sender) revert NotEligibleReviewer(escrowId, msg.sender);
        if (_reviewed[escrowId]) revert AlreadyReviewed(escrowId);

        _reviewed[escrowId] = true;
        uint256 agentId = _reviewAgentId[escrowId];

        AgentReputation storage rep = _reputations[agentId];
        rep.reviewCount += 1;
        rep.cumulativeRatingScore += rating;

        _recompute(agentId);
        emit ReviewSubmitted(agentId, escrowId, msg.sender, rating, block.timestamp);
        emit ReputationUpdated(agentId, escrowId, true, rep.reputationScore, rep.trustScore, block.timestamp);
    }

    /// @inheritdoc IReputation
    function getReputationSummary(uint256 agentId) external view returns (AgentReputation memory) {
        return _reputations[agentId];
    }

    // ---------------------------------------------------------------------
    // Internal scoring - isolated so the formulas can evolve independently
    // of storage layout (e.g. swapped for an ML-derived or governance-voted
    // model) without any migration of existing data.
    // ---------------------------------------------------------------------

    function _guardOutcome(uint256 agentId, uint256 escrowId) private view {
        if (!agentRegistry.agentExists(agentId)) revert UnknownAgent(agentId);
        if (_outcomeRecorded[escrowId]) revert EscrowAlreadyRecorded(escrowId);
    }

    function _recompute(uint256 agentId) private {
        AgentReputation storage rep = _reputations[agentId];
        rep.reputationScore = _computeReputationScore(rep);
        rep.trustScore = _computeTrustScore(rep);
        rep.verifiedBadge = _qualifiesForBadge(rep);
    }

    /// @dev Weighted blend of success rate and average buyer rating, both normalized to bps
    ///      (0-10000). Replaceable independently of storage.
    function _computeReputationScore(AgentReputation memory rep) internal pure returns (uint256) {
        uint256 successRateBps = rep.completedJobs == 0
            ? 0
            : (rep.successfulJobs * BPS_DENOMINATOR) / rep.completedJobs;

        uint256 avgRatingBps = rep.reviewCount == 0
            ? 0
            : (rep.cumulativeRatingScore * BPS_DENOMINATOR) / (rep.reviewCount * MAX_RATING);

        if (rep.reviewCount == 0) {
            // No reviews yet: score is driven entirely by objective success rate.
            return successRateBps;
        }

        return (successRateBps * SUCCESS_WEIGHT_BPS + avgRatingBps * RATING_WEIGHT_BPS) / BPS_DENOMINATOR;
    }

    /// @dev Dampens the reputation score by a volume-based confidence multiplier so a handful of
    ///      lucky jobs cannot outrank a long, proven track record. Multiplier saturates at
    ///      {VOLUME_CONFIDENCE_CAP} completed jobs.
    function _computeTrustScore(AgentReputation memory rep) internal pure returns (uint256) {
        uint256 reputationScore = _computeReputationScore(rep);
        uint256 confidenceBps = rep.completedJobs >= VOLUME_CONFIDENCE_CAP
            ? BPS_DENOMINATOR
            : (rep.completedJobs * BPS_DENOMINATOR) / VOLUME_CONFIDENCE_CAP;

        return (reputationScore * confidenceBps) / BPS_DENOMINATOR;
    }

    /// @dev Automatic, objective verification badge criteria - no manual gate.
    function _qualifiesForBadge(AgentReputation memory rep) internal pure returns (bool) {
        if (rep.completedJobs < MIN_JOBS_FOR_BADGE) return false;
        uint256 successRateBps = (rep.successfulJobs * BPS_DENOMINATOR) / rep.completedJobs;
        return successRateBps >= MIN_SUCCESS_RATE_FOR_BADGE_BPS;
    }
}
