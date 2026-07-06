// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentRegistry
/// @author CROO Hub
/// @notice Minimal, stable interface for the CROO Hub Agent Registry - the on-chain decentralized
///         identity layer for AI agents. Other CROO Hub contracts (escrow, reputation,
///         orchestration) and future modules (e.g. the CROO Agent Store) should depend only on
///         this interface, never on the registry's storage layout, so the registry implementation
///         can be upgraded or replaced without breaking integrations.
interface IAgentRegistry {
    /// @notice Coarse pricing model advertised by an agent, used for on-chain filtering.
    ///         Fine-grained pricing (exact rates, tiers, currencies) lives off-chain in the
    ///         agent's `metadataURI` document.
    enum PricingModel {
        Free,
        PayPerUse,
        Subscription,
        Custom
    }

    /// @notice Full on-chain record for a registered AI agent.
    /// @dev Arrays (`capabilities`, `protocols`, `chains`) are bounded to
    ///      {AgentRegistry-MAX_ARRAY_LENGTH} entries to keep gas costs predictable.
    struct Agent {
        address owner;
        string name;
        string description;
        string category;
        string[] capabilities;
        PricingModel pricingModel;
        string[] protocols;
        string[] chains;
        string metadataURI;
        bytes32 endpointHash;
        string version;
        bool verified;
        bool available;
        bool active;
        uint256 registeredAt;
        uint256 updatedAt;
    }

    /// @notice Write payload shared by {registerAgent} and {updateAgent}, kept as a struct to
    ///         avoid stack-too-deep errors and to give the CROO Agent Store a single stable
    ///         shape to submit when it starts writing directly to this registry.
    struct AgentInput {
        string name;
        string description;
        string category;
        string[] capabilities;
        PricingModel pricingModel;
        string[] protocols;
        string[] chains;
        string metadataURI;
        bytes32 endpointHash;
        string version;
    }

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        string name,
        string category,
        uint256 timestamp
    );
    event AgentUpdated(uint256 indexed agentId, address indexed owner, uint256 timestamp);
    event AgentPaused(uint256 indexed agentId, address indexed owner, uint256 timestamp);
    event AgentReactivated(uint256 indexed agentId, address indexed owner, uint256 timestamp);
    event AgentRemoved(uint256 indexed agentId, address indexed owner, uint256 timestamp);
    event AgentOwnershipTransferred(
        uint256 indexed agentId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );
    event AgentVerified(uint256 indexed agentId, address indexed verifier, uint256 timestamp);
    event AgentVerificationRevoked(uint256 indexed agentId, address indexed verifier, uint256 timestamp);

    /// @notice Returns the full on-chain record for `agentId`. Reverts if it does not exist.
    function getAgent(uint256 agentId) external view returns (Agent memory);

    /// @notice Returns the current owner wallet of `agentId`. Reverts if it does not exist.
    function getAgentOwner(uint256 agentId) external view returns (address);

    /// @notice Returns true if `agentId` exists and has not been removed by its owner.
    function isAgentActive(uint256 agentId) external view returns (bool);

    /// @notice Returns true if `agentId` is active AND currently accepting new work.
    function isAgentAvailable(uint256 agentId) external view returns (bool);

    /// @notice Returns true if `agentId` has ever been registered.
    function agentExists(uint256 agentId) external view returns (bool);

    /// @notice Returns the total number of agents ever registered (including removed ones).
    function totalAgents() external view returns (uint256);
}
