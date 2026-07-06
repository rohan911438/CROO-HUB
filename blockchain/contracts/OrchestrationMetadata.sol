// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IOrchestrationMetadata} from "./interfaces/IOrchestrationMetadata.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title OrchestrationMetadata
/// @author CROO Hub
/// @notice Decentralized audit trail for off-chain multi-agent workflow orchestration. This
///         contract never executes workflows and holds no funds - it only anchors immutable
///         proofs (hashes and URIs) of what ran, which agents participated, and when it finished,
///         so any party can later verify a workflow's execution without trusting the CROO Hub
///         backend's database.
/// @dev Templates are mutable (owner may evolve/deprecate a reusable definition), but recorded
///      *executions* are write-once: there is no update or delete path for a {WorkflowExecution}
///      after {recordExecution}, by design, so the proof stays immutable.
contract OrchestrationMetadata is IOrchestrationMetadata, AccessControl, Pausable {
    /// @notice Maximum number of participating agents/agentIds recordable per execution, bounding
    ///         gas cost and preventing storage-bloat griefing.
    uint256 public constant MAX_PARTICIPANTS = 50;

    /// @notice Optional agent registry used to validate `agentIds` when supplied. Validation is
    ///         skipped for any execution that provides an empty `agentIds` array (address-only
    ///         participants, e.g. off-chain-only agents not yet registered on-chain).
    IAgentRegistry public immutable agentRegistry;

    uint256 private _nextTemplateId = 1;
    uint256 private _nextExecutionId = 1;

    mapping(uint256 => WorkflowTemplate) private _templates;
    mapping(uint256 => WorkflowExecution) private _executions;

    mapping(address => uint256[]) private _executionsByOwner;
    mapping(uint256 => uint256[]) private _executionsByAgentId;
    mapping(bytes32 => uint256) private _executionIdByWorkflowRef;

    error TemplateDoesNotExist(uint256 templateId);
    error ExecutionDoesNotExist(uint256 executionId);
    error NotTemplateOwner(uint256 templateId, address caller);
    error TemplateNotActive(uint256 templateId);
    error EmptyName();
    error TooManyParticipants();
    error ParticipantArrayLengthMismatch();
    error UnknownAgentId(uint256 agentId);
    error InvalidTimestamps();
    error DuplicateWorkflowRef(bytes32 workflowRef);
    error ZeroAddress();

    modifier templateExists(uint256 templateId) {
        if (_templates[templateId].createdAt == 0) revert TemplateDoesNotExist(templateId);
        _;
    }

    /// @param admin Address granted `DEFAULT_ADMIN_ROLE` at deployment (pause authority only;
    ///        registration/recording remain permissionless since this contract moves no funds).
    /// @param agentRegistry_ Address of the deployed {AgentRegistry}, used to validate optional
    ///        `agentIds` passed to {recordExecution}.
    constructor(address admin, address agentRegistry_) {
        if (admin == address(0) || agentRegistry_ == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        agentRegistry = IAgentRegistry(agentRegistry_);
    }

    /// @inheritdoc IOrchestrationMetadata
    function registerTemplate(
        string calldata name,
        string calldata metadataURI,
        bytes32 templateHash,
        string calldata version
    ) external whenNotPaused returns (uint256 templateId) {
        if (bytes(name).length == 0) revert EmptyName();

        templateId = _nextTemplateId++;
        WorkflowTemplate storage template = _templates[templateId];
        template.templateId = templateId;
        template.owner = msg.sender;
        template.name = name;
        template.metadataURI = metadataURI;
        template.templateHash = templateHash;
        template.version = version;
        template.createdAt = block.timestamp;
        template.updatedAt = block.timestamp;
        template.active = true;

        emit TemplateRegistered(templateId, msg.sender, name, block.timestamp);
    }

    /// @inheritdoc IOrchestrationMetadata
    function updateTemplate(
        uint256 templateId,
        string calldata metadataURI,
        bytes32 templateHash,
        string calldata version
    ) external whenNotPaused templateExists(templateId) {
        WorkflowTemplate storage template = _templates[templateId];
        if (template.owner != msg.sender) revert NotTemplateOwner(templateId, msg.sender);
        if (!template.active) revert TemplateNotActive(templateId);

        template.metadataURI = metadataURI;
        template.templateHash = templateHash;
        template.version = version;
        template.updatedAt = block.timestamp;

        emit TemplateUpdated(templateId, msg.sender, block.timestamp);
    }

    /// @inheritdoc IOrchestrationMetadata
    function deactivateTemplate(uint256 templateId) external templateExists(templateId) {
        WorkflowTemplate storage template = _templates[templateId];
        if (template.owner != msg.sender) revert NotTemplateOwner(templateId, msg.sender);
        if (!template.active) revert TemplateNotActive(templateId);

        template.active = false;
        template.updatedAt = block.timestamp;

        emit TemplateDeactivated(templateId, msg.sender, block.timestamp);
    }

    /// @inheritdoc IOrchestrationMetadata
    function recordExecution(
        uint256 templateId,
        bytes32 workflowRef,
        address[] calldata participatingAgents,
        uint256[] calldata agentIds,
        bytes32 executionProofHash,
        bytes32 completionHash,
        string calldata version,
        uint256 startedAt,
        uint256 completedAt,
        ExecutionStatus status
    ) external whenNotPaused returns (uint256 executionId) {
        if (templateId != 0 && _templates[templateId].createdAt == 0) revert TemplateDoesNotExist(templateId);
        if (participatingAgents.length > MAX_PARTICIPANTS) revert TooManyParticipants();
        if (agentIds.length != 0 && agentIds.length != participatingAgents.length) {
            revert ParticipantArrayLengthMismatch();
        }
        if (completedAt < startedAt) revert InvalidTimestamps();
        if (workflowRef != bytes32(0) && _executionIdByWorkflowRef[workflowRef] != 0) {
            revert DuplicateWorkflowRef(workflowRef);
        }

        for (uint256 i = 0; i < agentIds.length; i++) {
            if (!agentRegistry.agentExists(agentIds[i])) revert UnknownAgentId(agentIds[i]);
        }

        executionId = _nextExecutionId++;
        WorkflowExecution storage execution = _executions[executionId];
        execution.executionId = executionId;
        execution.templateId = templateId;
        execution.workflowRef = workflowRef;
        execution.owner = msg.sender;
        execution.participatingAgents = participatingAgents;
        execution.agentIds = agentIds;
        execution.executionProofHash = executionProofHash;
        execution.completionHash = completionHash;
        execution.version = version;
        execution.startedAt = startedAt;
        execution.completedAt = completedAt;
        execution.recordedAt = block.timestamp;
        execution.status = status;

        _executionsByOwner[msg.sender].push(executionId);
        for (uint256 i = 0; i < agentIds.length; i++) {
            _executionsByAgentId[agentIds[i]].push(executionId);
        }
        if (workflowRef != bytes32(0)) {
            _executionIdByWorkflowRef[workflowRef] = executionId;
        }

        emit WorkflowExecutionRecorded(
            executionId,
            templateId,
            workflowRef,
            msg.sender,
            executionProofHash,
            completionHash,
            status,
            block.timestamp
        );
    }

    /// @notice Pauses new template registration and execution recording in an emergency.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Resumes template registration and execution recording.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @inheritdoc IOrchestrationMetadata
    function getTemplate(uint256 templateId) external view templateExists(templateId) returns (WorkflowTemplate memory) {
        return _templates[templateId];
    }

    /// @inheritdoc IOrchestrationMetadata
    function getExecution(uint256 executionId) external view returns (WorkflowExecution memory) {
        if (_executions[executionId].recordedAt == 0) revert ExecutionDoesNotExist(executionId);
        return _executions[executionId];
    }

    /// @notice Returns the executionId recorded for a given backend `workflowRef`, or 0 if none.
    function getExecutionIdByWorkflowRef(bytes32 workflowRef) external view returns (uint256) {
        return _executionIdByWorkflowRef[workflowRef];
    }

    /// @notice Returns every executionId owned/recorded by `owner_`.
    function getExecutionsByOwner(address owner_) external view returns (uint256[] memory) {
        return _executionsByOwner[owner_];
    }

    /// @notice Returns every executionId that included `agentId` as a participant.
    function getExecutionsByAgentId(uint256 agentId) external view returns (uint256[] memory) {
        return _executionsByAgentId[agentId];
    }

    function totalTemplates() external view returns (uint256) {
        return _nextTemplateId - 1;
    }

    function totalExecutions() external view returns (uint256) {
        return _nextExecutionId - 1;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
