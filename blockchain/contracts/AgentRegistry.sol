// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title AgentRegistry
/// @author CROO Hub
/// @notice Decentralized identity and registration layer for AI agents in the CROO ecosystem.
///         Stores canonical, owner-controlled agent metadata on-chain so escrow, reputation,
///         orchestration, and the future CROO Agent Store all resolve a single source of truth
///         for "who owns this agent" and "is this agent currently usable".
/// @dev No AI inference or business logic executes here. This is a trust-minimized identity and
///      pointer store; rich metadata (long-form docs, schemas, pricing tables) is expected to
///      live off-chain at `metadataURI` (IPFS-ready). Follows checks-effects-interactions even
///      though no external calls are made, for defense in depth against future extensions.
contract AgentRegistry is IAgentRegistry, AccessControl, Pausable {
    /// @notice Role allowed to grant/revoke the on-chain verification badge for agents.
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /// @notice Maximum entries allowed in a capabilities/protocols/chains array per agent. Bounds
    ///         gas cost of registration/update and prevents storage-bloat griefing.
    uint256 public constant MAX_ARRAY_LENGTH = 20;

    /// @notice Auto-incrementing id counter. Id 0 is never assigned, so callers may safely treat
    ///         `agentId == 0` as "unset" in their own storage.
    uint256 private _nextAgentId = 1;

    /// @dev agentId => Agent record.
    mapping(uint256 => Agent) private _agents;

    /// @dev owner => list of agentIds ever owned (append-only; includes agents later transferred
    ///      away or removed, so consumers should cross-check current state via `getAgent`).
    mapping(address => uint256[]) private _agentsByOwner;

    error AgentDoesNotExist(uint256 agentId);
    error NotAgentOwner(uint256 agentId, address caller);
    error AgentNotActive(uint256 agentId);
    error AgentAlreadyPaused(uint256 agentId);
    error AgentNotPaused(uint256 agentId);
    error InvalidOwnerAddress();
    error EmptyName();
    error ArrayTooLong(string field);

    modifier whenAgentExists(uint256 agentId) {
        if (_agents[agentId].registeredAt == 0) revert AgentDoesNotExist(agentId);
        _;
    }

    modifier onlyAgentOwner(uint256 agentId) {
        if (_agents[agentId].registeredAt == 0) revert AgentDoesNotExist(agentId);
        if (_agents[agentId].owner != msg.sender) revert NotAgentOwner(agentId, msg.sender);
        _;
    }

    /// @param admin Address granted `DEFAULT_ADMIN_ROLE` and `VERIFIER_ROLE` at deployment.
    constructor(address admin) {
        if (admin == address(0)) revert InvalidOwnerAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);
    }

    /// @notice Registers a new AI agent identity owned by the caller.
    /// @param input Agent metadata fields, see {IAgentRegistry-AgentInput}.
    /// @return agentId The newly assigned unique agent identifier (never 0).
    function registerAgent(AgentInput calldata input) external whenNotPaused returns (uint256 agentId) {
        _validateInput(input);

        agentId = _nextAgentId++;
        Agent storage agent = _agents[agentId];
        agent.owner = msg.sender;
        agent.name = input.name;
        agent.description = input.description;
        agent.category = input.category;
        agent.capabilities = input.capabilities;
        agent.pricingModel = input.pricingModel;
        agent.protocols = input.protocols;
        agent.chains = input.chains;
        agent.metadataURI = input.metadataURI;
        agent.endpointHash = input.endpointHash;
        agent.version = input.version;
        agent.available = true;
        agent.active = true;
        agent.registeredAt = block.timestamp;
        agent.updatedAt = block.timestamp;

        _agentsByOwner[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, input.name, input.category, block.timestamp);
    }

    /// @notice Updates the metadata of an existing, active agent. Owner-only.
    /// @dev Full-replace semantics: callers must resubmit every field (the backend/frontend is
    ///      expected to prefill from {getAgent}), which keeps the contract free of a combinatorial
    ///      explosion of partial-update functions.
    function updateAgent(uint256 agentId, AgentInput calldata input) external whenNotPaused onlyAgentOwner(agentId) {
        Agent storage agent = _agents[agentId];
        if (!agent.active) revert AgentNotActive(agentId);
        _validateInput(input);

        agent.name = input.name;
        agent.description = input.description;
        agent.category = input.category;
        agent.capabilities = input.capabilities;
        agent.pricingModel = input.pricingModel;
        agent.protocols = input.protocols;
        agent.chains = input.chains;
        agent.metadataURI = input.metadataURI;
        agent.endpointHash = input.endpointHash;
        agent.version = input.version;
        agent.updatedAt = block.timestamp;

        emit AgentUpdated(agentId, msg.sender, block.timestamp);
    }

    /// @notice Marks an agent temporarily unavailable (e.g. offline/maintenance) without removing
    ///         its identity or history. Paused agents cannot be selected for new escrows.
    function pauseAgent(uint256 agentId) external onlyAgentOwner(agentId) {
        Agent storage agent = _agents[agentId];
        if (!agent.active) revert AgentNotActive(agentId);
        if (!agent.available) revert AgentAlreadyPaused(agentId);
        agent.available = false;
        agent.updatedAt = block.timestamp;
        emit AgentPaused(agentId, msg.sender, block.timestamp);
    }

    /// @notice Reactivates a previously paused agent, making it selectable for new escrows again.
    function reactivateAgent(uint256 agentId) external onlyAgentOwner(agentId) {
        Agent storage agent = _agents[agentId];
        if (!agent.active) revert AgentNotActive(agentId);
        if (agent.available) revert AgentNotPaused(agentId);
        agent.available = true;
        agent.updatedAt = block.timestamp;
        emit AgentReactivated(agentId, msg.sender, block.timestamp);
    }

    /// @notice Permanently deactivates an agent (soft delete). The id and its full history remain
    ///         resolvable forever (existing escrows/reputation/orchestration records reference it),
    ///         but it can no longer be updated, reactivated, or selected for new escrows.
    function removeAgent(uint256 agentId) external onlyAgentOwner(agentId) {
        Agent storage agent = _agents[agentId];
        if (!agent.active) revert AgentNotActive(agentId);
        agent.active = false;
        agent.available = false;
        agent.updatedAt = block.timestamp;
        emit AgentRemoved(agentId, msg.sender, block.timestamp);
    }

    /// @notice Transfers ownership (and all modification rights) of an agent to a new wallet.
    function transferAgentOwnership(uint256 agentId, address newOwner) external onlyAgentOwner(agentId) {
        if (newOwner == address(0)) revert InvalidOwnerAddress();
        Agent storage agent = _agents[agentId];
        if (!agent.active) revert AgentNotActive(agentId);

        address previousOwner = agent.owner;
        agent.owner = newOwner;
        agent.updatedAt = block.timestamp;
        _agentsByOwner[newOwner].push(agentId);

        emit AgentOwnershipTransferred(agentId, previousOwner, newOwner, block.timestamp);
    }

    /// @notice Grants the on-chain verification badge to an agent. Restricted to {VERIFIER_ROLE}.
    function verifyAgent(uint256 agentId) external onlyRole(VERIFIER_ROLE) whenAgentExists(agentId) {
        _agents[agentId].verified = true;
        _agents[agentId].updatedAt = block.timestamp;
        emit AgentVerified(agentId, msg.sender, block.timestamp);
    }

    /// @notice Revokes the on-chain verification badge from an agent. Restricted to {VERIFIER_ROLE}.
    function revokeVerification(uint256 agentId) external onlyRole(VERIFIER_ROLE) whenAgentExists(agentId) {
        _agents[agentId].verified = false;
        _agents[agentId].updatedAt = block.timestamp;
        emit AgentVerificationRevoked(agentId, msg.sender, block.timestamp);
    }

    /// @notice Pauses registration/updates contract-wide in an emergency. Restricted to admin.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Resumes registration/updates. Restricted to admin.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @inheritdoc IAgentRegistry
    function getAgent(uint256 agentId) external view whenAgentExists(agentId) returns (Agent memory) {
        return _agents[agentId];
    }

    /// @inheritdoc IAgentRegistry
    function getAgentOwner(uint256 agentId) external view whenAgentExists(agentId) returns (address) {
        return _agents[agentId].owner;
    }

    /// @inheritdoc IAgentRegistry
    function isAgentActive(uint256 agentId) external view returns (bool) {
        return _agents[agentId].active;
    }

    /// @inheritdoc IAgentRegistry
    function isAgentAvailable(uint256 agentId) external view returns (bool) {
        return _agents[agentId].active && _agents[agentId].available;
    }

    /// @inheritdoc IAgentRegistry
    function agentExists(uint256 agentId) external view returns (bool) {
        return _agents[agentId].registeredAt != 0;
    }

    /// @inheritdoc IAgentRegistry
    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    /// @notice Returns every agentId ever owned by `owner_` (see storage note above).
    function getAgentsByOwner(address owner_) external view returns (uint256[] memory) {
        return _agentsByOwner[owner_];
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _validateInput(AgentInput calldata input) private pure {
        if (bytes(input.name).length == 0) revert EmptyName();
        if (input.capabilities.length > MAX_ARRAY_LENGTH) revert ArrayTooLong("capabilities");
        if (input.protocols.length > MAX_ARRAY_LENGTH) revert ArrayTooLong("protocols");
        if (input.chains.length > MAX_ARRAY_LENGTH) revert ArrayTooLong("chains");
    }
}
