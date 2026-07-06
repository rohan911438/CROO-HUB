// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IEscrowCommerce
/// @author CROO Hub
/// @notice Interface for the CROO Hub Escrow and Commerce contract - trustless USDC payments
///         between buyers and AI agents. Kept minimal and stable so future settlement rails
///         (e.g. CROO CAP) can integrate against a predictable surface.
interface IEscrowCommerce {
    /// @notice Lifecycle states of an escrow. Transitions are strictly one-directional; see
    ///         {EscrowCommerce} for the full state machine diagram.
    enum EscrowStatus {
        Created, // buyer funded, awaiting agent acceptance
        Accepted, // agent accepted, work in progress
        Completed, // agent marked work delivered, awaiting buyer release
        Released, // terminal: funds paid to agent
        Refunded, // terminal: funds returned to buyer (timeout/cancellation pre-accept)
        Cancelled, // terminal: buyer cancelled before agent acceptance
        Disputed, // either party raised a dispute, frozen pending arbitration
        Resolved // terminal: arbitrator split funds between buyer/agent
    }

    /// @notice Full on-chain record for one escrow.
    struct Escrow {
        uint256 id;
        address buyer;
        uint256 agentId;
        address agentPayoutAddress;
        uint256 amount;
        uint256 deadline;
        bytes32 workflowId;
        EscrowStatus status;
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 completedAt;
        uint256 updatedAt;
        address disputeRaisedBy;
    }

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed buyer,
        uint256 indexed agentId,
        uint256 amount,
        uint256 deadline,
        bytes32 workflowId
    );
    event EscrowAccepted(uint256 indexed escrowId, address indexed agentPayoutAddress, uint256 timestamp);
    event WorkCompleted(uint256 indexed escrowId, bytes32 completionProofHash, uint256 timestamp);
    event PaymentReleased(uint256 indexed escrowId, address indexed to, uint256 amount, uint256 fee, uint256 timestamp);
    event EscrowRefunded(uint256 indexed escrowId, address indexed to, uint256 amount, uint256 timestamp);
    event EscrowCancelled(uint256 indexed escrowId, uint256 timestamp);
    event EscrowTimedOut(uint256 indexed escrowId, uint256 timestamp);
    event DisputeRaised(uint256 indexed escrowId, address indexed raisedBy, string reason, uint256 timestamp);
    event DisputeResolved(
        uint256 indexed escrowId,
        uint256 buyerAmount,
        uint256 agentAmount,
        address indexed arbitrator,
        uint256 timestamp
    );

    /// @notice Creates a new escrow and pulls `amount` of the configured USDC token from the caller.
    function createEscrow(
        uint256 agentId,
        uint256 amount,
        uint256 deadline,
        bytes32 workflowId
    ) external returns (uint256 escrowId);

    /// @notice Accepts an escrow on behalf of the agent. Callable only by the agent's current owner.
    function acceptEscrow(uint256 escrowId) external;

    /// @notice Marks the agent's work as delivered, pending buyer review/release.
    function markCompleted(uint256 escrowId, bytes32 completionProofHash) external;

    /// @notice Releases escrowed funds to the agent. Callable by the buyer, or by the agent after
    ///         the auto-release grace period once work has been marked completed.
    function releasePayment(uint256 escrowId) external;

    /// @notice Cancels an escrow that has not yet been accepted, refunding the buyer in full.
    function cancelEscrow(uint256 escrowId) external;

    /// @notice Refunds the buyer once `deadline` has passed without a completed/released escrow.
    function claimTimeoutRefund(uint256 escrowId) external;

    /// @notice Raises a dispute, freezing the escrow pending arbitration.
    function raiseDispute(uint256 escrowId, string calldata reason) external;

    /// @notice Splits escrowed funds between buyer and agent. Restricted to {ARBITRATOR_ROLE}.
    function resolveDispute(uint256 escrowId, uint256 buyerAmount, uint256 agentAmount) external;

    /// @notice Returns the full record for `escrowId`.
    function getEscrow(uint256 escrowId) external view returns (Escrow memory);
}
