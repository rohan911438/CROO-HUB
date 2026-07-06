// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IOrchestrationMetadata
/// @author CROO Hub
/// @notice Interface for the CROO Hub Orchestration Metadata contract - an immutable, decentralized
///         audit trail proving which workflow executed, which agents participated, and when it
///         completed. This contract never executes workflows; all orchestration happens off-chain
///         in the CROO Hub backend.
interface IOrchestrationMetadata {
    /// @notice Reported outcome of a recorded workflow execution.
    enum ExecutionStatus {
        Completed,
        Failed,
        Partial
    }

    /// @notice A reusable workflow definition. Templates may be updated/deprecated by their owner;
    ///         only recorded *executions* are immutable.
    struct WorkflowTemplate {
        uint256 templateId;
        address owner;
        string name;
        string metadataURI;
        bytes32 templateHash;
        string version;
        uint256 createdAt;
        uint256 updatedAt;
        bool active;
    }

    /// @notice An immutable proof that a specific workflow run executed off-chain.
    struct WorkflowExecution {
        uint256 executionId;
        uint256 templateId; // 0 if this was an ad-hoc workflow with no template
        bytes32 workflowRef; // correlates to the backend's MongoDB workflow document
        address owner;
        address[] participatingAgents;
        uint256[] agentIds; // optional AgentRegistry ids, empty if not applicable/available
        bytes32 executionProofHash;
        bytes32 completionHash;
        string version;
        uint256 startedAt;
        uint256 completedAt;
        uint256 recordedAt;
        ExecutionStatus status;
    }

    event TemplateRegistered(uint256 indexed templateId, address indexed owner, string name, uint256 timestamp);
    event TemplateUpdated(uint256 indexed templateId, address indexed owner, uint256 timestamp);
    event TemplateDeactivated(uint256 indexed templateId, address indexed owner, uint256 timestamp);
    event WorkflowExecutionRecorded(
        uint256 indexed executionId,
        uint256 indexed templateId,
        bytes32 indexed workflowRef,
        address owner,
        bytes32 executionProofHash,
        bytes32 completionHash,
        ExecutionStatus status,
        uint256 recordedAt
    );

    /// @notice Registers a new reusable workflow template.
    function registerTemplate(
        string calldata name,
        string calldata metadataURI,
        bytes32 templateHash,
        string calldata version
    ) external returns (uint256 templateId);

    /// @notice Updates an existing template's metadata. Owner-only.
    function updateTemplate(
        uint256 templateId,
        string calldata metadataURI,
        bytes32 templateHash,
        string calldata version
    ) external;

    /// @notice Deactivates a template so it is no longer recommended for new executions.
    function deactivateTemplate(uint256 templateId) external;

    /// @notice Records an immutable proof of a completed (or failed) workflow execution.
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
    ) external returns (uint256 executionId);

    /// @notice Returns a workflow template by id.
    function getTemplate(uint256 templateId) external view returns (WorkflowTemplate memory);

    /// @notice Returns a recorded workflow execution by id.
    function getExecution(uint256 executionId) external view returns (WorkflowExecution memory);
}
