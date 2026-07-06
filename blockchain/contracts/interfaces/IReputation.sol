// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IReputation
/// @author CROO Hub
/// @notice Interface for the CROO Hub Reputation contract, the immutable, objective performance
///         ledger for registered AI agents. Reputation is only ever written by contracts holding
///         {RECORDER_ROLE} (in practice, the EscrowCommerce contract) as the direct consequence of
///         a settled escrow - never from arbitrary user input - so that scores stay tamper
///         resistant and tied to real economic activity.
interface IReputation {
    /// @notice Aggregated, always-current performance record for one agent.
    /// @dev Historical time-series data is intentionally NOT stored on-chain (see
    ///      {ReputationUpdated}); indexers/backends reconstruct history from events to keep
    ///      on-chain storage O(1) per agent regardless of job volume.
    struct AgentReputation {
        uint256 completedJobs;
        uint256 successfulJobs;
        uint256 failedJobs;
        uint256 totalResponseLatency;
        uint256 totalExecutionDuration;
        uint256 totalRevenue;
        uint256 reviewCount;
        uint256 cumulativeRatingScore;
        uint256 reputationScore;
        uint256 trustScore;
        bool verifiedBadge;
        uint256 lastActivityAt;
    }

    event ReputationUpdated(
        uint256 indexed agentId,
        uint256 indexed escrowId,
        bool success,
        uint256 reputationScore,
        uint256 trustScore,
        uint256 timestamp
    );
    event ReviewSubmitted(
        uint256 indexed agentId,
        uint256 indexed escrowId,
        address indexed reviewer,
        uint8 rating,
        uint256 timestamp
    );
    event VerifiedBadgeChanged(uint256 indexed agentId, bool verifiedBadge, uint256 timestamp);

    /// @notice Records a successfully settled escrow as a completed, successful job for `agentId`.
    /// @dev Restricted to {RECORDER_ROLE}. Also registers `buyer` as the sole address eligible to
    ///      call {submitReview} for `escrowId`.
    function recordSuccessfulJob(
        uint256 agentId,
        uint256 escrowId,
        address buyer,
        uint256 responseLatency,
        uint256 executionDuration,
        uint256 revenueAmount
    ) external;

    /// @notice Records a failed/refunded/disputed-against-agent escrow as a completed, failed job.
    /// @dev Restricted to {RECORDER_ROLE}.
    function recordFailedJob(uint256 agentId, uint256 escrowId, address buyer, uint256 responseLatency) external;

    /// @notice Lets the buyer of a settled escrow submit a single 1-5 star rating for the agent.
    function submitReview(uint256 escrowId, uint8 rating) external;

    /// @notice Returns the full performance summary for `agentId`, suitable for dashboards.
    function getReputationSummary(uint256 agentId) external view returns (AgentReputation memory);
}
