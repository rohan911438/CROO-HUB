// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IEscrowCommerce} from "./interfaces/IEscrowCommerce.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {IReputation} from "./interfaces/IReputation.sol";

/// @title EscrowCommerce
/// @author CROO Hub
/// @notice Trustless USDC escrow for AI agent service requests. Buyers lock funds for a specific
///         agent; funds unlock only through explicit, auditable state transitions - never through
///         implicit or unilateral action. This is the sole component of CROO Hub authorized to
///         move value; it performs no AI inference or off-chain business logic.
/// @dev Every fund-moving function is `nonReentrant` and follows checks-effects-interactions:
///      status is updated to a terminal/next state *before* any external token transfer or call
///      into {AgentRegistry}/{Reputation}. Reputation sync is best-effort (wrapped in try/catch)
///      so a misconfigured or reverting Reputation contract can never trap escrowed funds.
///
///      State machine:
///      Created --accept--> Accepted --markCompleted--> Completed --release--> Released (terminal)
///      Created --cancel--> Cancelled (terminal)
///      Created/Accepted --timeout (deadline passed)--> Refunded (terminal)
///      Accepted/Completed --dispute--> Disputed --resolve--> Resolved (terminal)
contract EscrowCommerce is IEscrowCommerce, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role allowed to resolve disputes and split escrowed funds.
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    uint256 private constant BPS_DENOMINATOR = 10_000;

    /// @notice Maximum protocol fee that can ever be configured (10%).
    uint256 public constant MAX_FEE_BPS = 1_000;

    /// @notice Grace period after work is marked completed during which the agent may self-release
    ///         payment if the buyer neither releases funds nor raises a dispute.
    uint256 public constant RELEASE_GRACE_PERIOD = 3 days;

    /// @notice USDC (or USDC-compatible) token used for all escrow payments.
    IERC20 public immutable usdc;

    /// @notice Agent identity registry used to resolve/validate the assigned agent.
    IAgentRegistry public immutable agentRegistry;

    /// @notice Reputation ledger updated on settlement. Settable post-deploy in case Reputation is
    ///         redeployed; a zero address disables reputation sync without affecting payments.
    IReputation public reputation;

    /// @notice Recipient of protocol fees.
    address public feeRecipient;

    /// @notice Current protocol fee in basis points, applied only to the agent's payout on release.
    uint256 public feeBps;

    uint256 private _nextEscrowId = 1;
    mapping(uint256 => Escrow) private _escrows;

    error InvalidAmount();
    error InvalidDeadline();
    error AgentNotAvailableForEscrow(uint256 agentId);
    error EscrowDoesNotExist(uint256 escrowId);
    error UnexpectedStatus(uint256 escrowId, EscrowStatus actual);
    error NotBuyer(uint256 escrowId, address caller);
    error NotAssignedAgent(uint256 escrowId, address caller);
    error NotBuyerOrAgent(uint256 escrowId, address caller);
    error NotReleaseAuthorized(uint256 escrowId, address caller);
    error EscrowExpired(uint256 escrowId);
    error EscrowNotExpired(uint256 escrowId);
    error InvalidSplit(uint256 escrowId, uint256 expected, uint256 provided);
    error FeeTooHigh(uint256 feeBps);
    error ZeroAddress();

    event ReputationContractUpdated(address indexed previousReputation, address indexed newReputation);
    event FeeConfigUpdated(uint256 feeBps, address feeRecipient);
    event ReputationSyncFailed(uint256 indexed escrowId, uint256 indexed agentId, bytes reason);

    modifier escrowExists(uint256 escrowId) {
        if (_escrows[escrowId].createdAt == 0) revert EscrowDoesNotExist(escrowId);
        _;
    }

    /// @param admin Address granted `DEFAULT_ADMIN_ROLE` and `ARBITRATOR_ROLE` at deployment.
    /// @param usdc_ Address of the USDC (or USDC-compatible) ERC20 token.
    /// @param agentRegistry_ Address of the deployed {AgentRegistry}.
    /// @param reputation_ Address of the deployed {Reputation} contract (may be address(0) initially).
    /// @param feeRecipient_ Initial protocol fee recipient.
    /// @param feeBps_ Initial protocol fee in basis points (must be <= {MAX_FEE_BPS}).
    constructor(
        address admin,
        address usdc_,
        address agentRegistry_,
        address reputation_,
        address feeRecipient_,
        uint256 feeBps_
    ) {
        if (admin == address(0) || usdc_ == address(0) || agentRegistry_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ARBITRATOR_ROLE, admin);

        usdc = IERC20(usdc_);
        agentRegistry = IAgentRegistry(agentRegistry_);
        reputation = IReputation(reputation_);
        feeRecipient = feeRecipient_ == address(0) ? admin : feeRecipient_;
        feeBps = feeBps_;
    }

    // ---------------------------------------------------------------------
    // Buyer actions
    // ---------------------------------------------------------------------

    /// @inheritdoc IEscrowCommerce
    function createEscrow(
        uint256 agentId,
        uint256 amount,
        uint256 deadline,
        bytes32 workflowId
    ) external whenNotPaused nonReentrant returns (uint256 escrowId) {
        if (amount == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (!agentRegistry.isAgentAvailable(agentId)) revert AgentNotAvailableForEscrow(agentId);

        escrowId = _nextEscrowId++;
        Escrow storage escrow = _escrows[escrowId];
        escrow.id = escrowId;
        escrow.buyer = msg.sender;
        escrow.agentId = agentId;
        escrow.amount = amount;
        escrow.deadline = deadline;
        escrow.workflowId = workflowId;
        escrow.status = EscrowStatus.Created;
        escrow.createdAt = block.timestamp;
        escrow.updatedAt = block.timestamp;

        emit EscrowCreated(escrowId, msg.sender, agentId, amount, deadline, workflowId);

        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @inheritdoc IEscrowCommerce
    function cancelEscrow(uint256 escrowId) external nonReentrant escrowExists(escrowId) {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.buyer != msg.sender) revert NotBuyer(escrowId, msg.sender);
        if (escrow.status != EscrowStatus.Created) revert UnexpectedStatus(escrowId, escrow.status);

        escrow.status = EscrowStatus.Cancelled;
        escrow.updatedAt = block.timestamp;

        emit EscrowCancelled(escrowId, block.timestamp);
        usdc.safeTransfer(escrow.buyer, escrow.amount);
    }

    /// @inheritdoc IEscrowCommerce
    function claimTimeoutRefund(uint256 escrowId) external nonReentrant escrowExists(escrowId) {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.buyer != msg.sender) revert NotBuyer(escrowId, msg.sender);
        if (escrow.status != EscrowStatus.Created && escrow.status != EscrowStatus.Accepted) {
            revert UnexpectedStatus(escrowId, escrow.status);
        }
        if (block.timestamp <= escrow.deadline) revert EscrowNotExpired(escrowId);

        bool wasAccepted = escrow.status == EscrowStatus.Accepted;
        escrow.status = EscrowStatus.Refunded;
        escrow.updatedAt = block.timestamp;

        emit EscrowTimedOut(escrowId, block.timestamp);
        emit EscrowRefunded(escrowId, escrow.buyer, escrow.amount, block.timestamp);

        usdc.safeTransfer(escrow.buyer, escrow.amount);

        if (wasAccepted && address(reputation) != address(0)) {
            uint256 responseLatency = escrow.acceptedAt - escrow.createdAt;
            try reputation.recordFailedJob(escrow.agentId, escrowId, escrow.buyer, responseLatency) {
                // no-op
            } catch (bytes memory reason) {
                emit ReputationSyncFailed(escrowId, escrow.agentId, reason);
            }
        }
    }

    /// @notice Releases escrowed funds to the agent. Callable by the buyer at any time once work
    ///         is {EscrowStatus.Completed}, or by the assigned agent after {RELEASE_GRACE_PERIOD}
    ///         has elapsed without buyer action.
    /// @inheritdoc IEscrowCommerce
    function releasePayment(uint256 escrowId) external nonReentrant escrowExists(escrowId) {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.status != EscrowStatus.Completed) revert UnexpectedStatus(escrowId, escrow.status);

        bool isBuyer = msg.sender == escrow.buyer;
        bool isAgentAfterGrace = msg.sender == escrow.agentPayoutAddress &&
            block.timestamp >= escrow.completedAt + RELEASE_GRACE_PERIOD;
        if (!isBuyer && !isAgentAfterGrace) revert NotReleaseAuthorized(escrowId, msg.sender);

        escrow.status = EscrowStatus.Released;
        escrow.updatedAt = block.timestamp;

        (uint256 net, uint256 fee) = _payout(escrow.agentPayoutAddress, escrow.amount);
        emit PaymentReleased(escrowId, escrow.agentPayoutAddress, net, fee, block.timestamp);

        _syncSuccess(escrow, escrowId, net);
    }

    // ---------------------------------------------------------------------
    // Agent actions
    // ---------------------------------------------------------------------

    /// @inheritdoc IEscrowCommerce
    function acceptEscrow(uint256 escrowId) external whenNotPaused escrowExists(escrowId) {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.status != EscrowStatus.Created) revert UnexpectedStatus(escrowId, escrow.status);
        if (block.timestamp > escrow.deadline) revert EscrowExpired(escrowId);
        if (agentRegistry.getAgentOwner(escrow.agentId) != msg.sender) revert NotAssignedAgent(escrowId, msg.sender);
        if (!agentRegistry.isAgentActive(escrow.agentId)) revert AgentNotAvailableForEscrow(escrow.agentId);

        escrow.status = EscrowStatus.Accepted;
        escrow.agentPayoutAddress = msg.sender;
        escrow.acceptedAt = block.timestamp;
        escrow.updatedAt = block.timestamp;

        emit EscrowAccepted(escrowId, msg.sender, block.timestamp);
    }

    /// @inheritdoc IEscrowCommerce
    function markCompleted(uint256 escrowId, bytes32 completionProofHash) external escrowExists(escrowId) {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.status != EscrowStatus.Accepted) revert UnexpectedStatus(escrowId, escrow.status);
        if (escrow.agentPayoutAddress != msg.sender) revert NotAssignedAgent(escrowId, msg.sender);

        escrow.status = EscrowStatus.Completed;
        escrow.completedAt = block.timestamp;
        escrow.updatedAt = block.timestamp;

        emit WorkCompleted(escrowId, completionProofHash, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Disputes
    // ---------------------------------------------------------------------

    /// @inheritdoc IEscrowCommerce
    function raiseDispute(uint256 escrowId, string calldata reason) external escrowExists(escrowId) {
        Escrow storage escrow = _escrows[escrowId];
        bool isBuyer = msg.sender == escrow.buyer;
        bool isAgent = msg.sender == escrow.agentPayoutAddress;
        if (!isBuyer && !isAgent) revert NotBuyerOrAgent(escrowId, msg.sender);
        if (escrow.status != EscrowStatus.Accepted && escrow.status != EscrowStatus.Completed) {
            revert UnexpectedStatus(escrowId, escrow.status);
        }

        escrow.status = EscrowStatus.Disputed;
        escrow.disputeRaisedBy = msg.sender;
        escrow.updatedAt = block.timestamp;

        emit DisputeRaised(escrowId, msg.sender, reason, block.timestamp);
    }

    /// @inheritdoc IEscrowCommerce
    function resolveDispute(
        uint256 escrowId,
        uint256 buyerAmount,
        uint256 agentAmount
    ) external nonReentrant onlyRole(ARBITRATOR_ROLE) escrowExists(escrowId) {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.status != EscrowStatus.Disputed) revert UnexpectedStatus(escrowId, escrow.status);
        if (buyerAmount + agentAmount != escrow.amount) {
            revert InvalidSplit(escrowId, escrow.amount, buyerAmount + agentAmount);
        }

        escrow.status = EscrowStatus.Resolved;
        escrow.updatedAt = block.timestamp;

        if (buyerAmount > 0) {
            usdc.safeTransfer(escrow.buyer, buyerAmount);
        }

        uint256 net;
        uint256 fee;
        if (agentAmount > 0) {
            (net, fee) = _payout(escrow.agentPayoutAddress, agentAmount);
        }

        emit DisputeResolved(escrowId, buyerAmount, agentAmount, msg.sender, block.timestamp);
        if (agentAmount > 0) {
            emit PaymentReleased(escrowId, escrow.agentPayoutAddress, net, fee, block.timestamp);
        }

        if (agentAmount >= buyerAmount) {
            _syncSuccess(escrow, escrowId, net);
        } else {
            _syncFailure(escrow, escrowId);
        }
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    /// @notice Updates the address of the Reputation contract synced on settlement.
    function setReputationContract(address reputation_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address previous = address(reputation);
        reputation = IReputation(reputation_);
        emit ReputationContractUpdated(previous, reputation_);
    }

    /// @notice Updates the protocol fee configuration.
    function setFeeConfig(uint256 feeBps_, address feeRecipient_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_);
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        feeBps = feeBps_;
        feeRecipient = feeRecipient_;
        emit FeeConfigUpdated(feeBps_, feeRecipient_);
    }

    /// @notice Pauses new escrow creation/acceptance in an emergency. Does not freeze existing
    ///         escrows' refund/release/dispute paths, so buyer/agent funds are never trapped.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Resumes escrow creation/acceptance.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @inheritdoc IEscrowCommerce
    function getEscrow(uint256 escrowId) external view escrowExists(escrowId) returns (Escrow memory) {
        return _escrows[escrowId];
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev Applies the protocol fee and transfers the net amount to `to`, the fee to
    ///      `feeRecipient`. Returns the net amount paid and the fee taken.
    function _payout(address to, uint256 grossAmount) private returns (uint256 net, uint256 fee) {
        fee = (grossAmount * feeBps) / BPS_DENOMINATOR;
        net = grossAmount - fee;
        if (net > 0) usdc.safeTransfer(to, net);
        if (fee > 0) usdc.safeTransfer(feeRecipient, fee);
    }

    /// @dev Best-effort sync of a successful settlement into Reputation. Never reverts the
    ///      caller's payment flow if Reputation is unset or its call fails.
    function _syncSuccess(Escrow storage escrow, uint256 escrowId, uint256 revenueAmount) private {
        if (address(reputation) == address(0)) return;
        uint256 responseLatency = escrow.acceptedAt - escrow.createdAt;
        uint256 executionDuration = escrow.completedAt - escrow.acceptedAt;
        try
            reputation.recordSuccessfulJob(
                escrow.agentId,
                escrowId,
                escrow.buyer,
                responseLatency,
                executionDuration,
                revenueAmount
            )
        {
            // no-op
        } catch (bytes memory reason) {
            emit ReputationSyncFailed(escrowId, escrow.agentId, reason);
        }
    }

    /// @dev Best-effort sync of a failed settlement (agent lost the dispute) into Reputation.
    function _syncFailure(Escrow storage escrow, uint256 escrowId) private {
        if (address(reputation) == address(0)) return;
        uint256 responseLatency = escrow.acceptedAt == 0 ? 0 : escrow.acceptedAt - escrow.createdAt;
        try reputation.recordFailedJob(escrow.agentId, escrowId, escrow.buyer, responseLatency) {
            // no-op
        } catch (bytes memory reason) {
            emit ReputationSyncFailed(escrowId, escrow.agentId, reason);
        }
    }
}
