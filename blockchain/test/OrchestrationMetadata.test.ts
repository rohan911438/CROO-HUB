import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers } from "hardhat";
import { deployFixture, sampleAgentInput } from "./fixtures";

describe("OrchestrationMetadata", function () {
  it("registers, updates, and deactivates a workflow template (owner-only)", async function () {
    const { orchestration, agentOwner, other } = await loadFixture(deployFixture);
    const hash = ethers.keccak256(ethers.toUtf8Bytes("template-v1"));

    await expect(orchestration.connect(agentOwner).registerTemplate("Weekly Research", "ipfs://tpl", hash, "1.0.0"))
      .to.emit(orchestration, "TemplateRegistered")
      .withArgs(1n, agentOwner.address, "Weekly Research", anyValue);

    await expect(
      orchestration.connect(other).updateTemplate(1, "ipfs://tpl-v2", hash, "1.0.1"),
    ).to.be.revertedWithCustomError(orchestration, "NotTemplateOwner");

    await expect(orchestration.connect(agentOwner).updateTemplate(1, "ipfs://tpl-v2", hash, "1.0.1")).to.emit(
      orchestration,
      "TemplateUpdated",
    );

    await expect(orchestration.connect(agentOwner).deactivateTemplate(1)).to.emit(
      orchestration,
      "TemplateDeactivated",
    );
    await expect(
      orchestration.connect(agentOwner).updateTemplate(1, "ipfs://x", hash, "2.0.0"),
    ).to.be.revertedWithCustomError(orchestration, "TemplateNotActive");
  });

  it("records an immutable execution proof referencing registered agent ids", async function () {
    const { orchestration, agentRegistry, agentOwner, other } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());

    const workflowRef = ethers.keccak256(ethers.toUtf8Bytes("mongo-workflow-doc-id"));
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("trace"));
    const completionHash = ethers.keccak256(ethers.toUtf8Bytes("result"));
    const startedAt = await time.latest();
    const completedAt = startedAt + 60;

    await expect(
      orchestration
        .connect(other)
        .recordExecution(0, workflowRef, [agentOwner.address], [1], proofHash, completionHash, "1.0.0", startedAt, completedAt, 0),
    )
      .to.emit(orchestration, "WorkflowExecutionRecorded")
      .withArgs(1n, 0n, workflowRef, other.address, proofHash, completionHash, 0, anyValue);

    const execution = await orchestration.getExecution(1);
    expect(execution.owner).to.equal(other.address);
    expect(execution.agentIds).to.deep.equal([1n]);
    expect(execution.status).to.equal(0n);

    expect(await orchestration.getExecutionIdByWorkflowRef(workflowRef)).to.equal(1n);
    expect(await orchestration.getExecutionsByOwner(other.address)).to.deep.equal([1n]);
    expect(await orchestration.getExecutionsByAgentId(1)).to.deep.equal([1n]);
  });

  it("rejects execution records referencing an unknown template or agent id", async function () {
    const { orchestration, other } = await loadFixture(deployFixture);
    const startedAt = await time.latest();

    await expect(
      orchestration
        .connect(other)
        .recordExecution(999, ethers.ZeroHash, [], [], ethers.ZeroHash, ethers.ZeroHash, "1.0.0", startedAt, startedAt, 0),
    ).to.be.revertedWithCustomError(orchestration, "TemplateDoesNotExist");

    await expect(
      orchestration
        .connect(other)
        .recordExecution(
          0,
          ethers.ZeroHash,
          [other.address],
          [42],
          ethers.ZeroHash,
          ethers.ZeroHash,
          "1.0.0",
          startedAt,
          startedAt,
          0,
        ),
    ).to.be.revertedWithCustomError(orchestration, "UnknownAgentId");
  });

  it("rejects mismatched participant/agentId array lengths and duplicate workflowRefs", async function () {
    const { orchestration, agentRegistry, agentOwner, other } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const startedAt = await time.latest();
    const workflowRef = ethers.keccak256(ethers.toUtf8Bytes("dup"));

    await expect(
      orchestration
        .connect(other)
        .recordExecution(
          0,
          workflowRef,
          [other.address, agentOwner.address],
          [1],
          ethers.ZeroHash,
          ethers.ZeroHash,
          "1.0.0",
          startedAt,
          startedAt,
          0,
        ),
    ).to.be.revertedWithCustomError(orchestration, "ParticipantArrayLengthMismatch");

    await orchestration
      .connect(other)
      .recordExecution(0, workflowRef, [other.address], [1], ethers.ZeroHash, ethers.ZeroHash, "1.0.0", startedAt, startedAt, 0);

    await expect(
      orchestration
        .connect(other)
        .recordExecution(0, workflowRef, [other.address], [1], ethers.ZeroHash, ethers.ZeroHash, "1.0.0", startedAt, startedAt, 0),
    ).to.be.revertedWithCustomError(orchestration, "DuplicateWorkflowRef");
  });

  it("has no update/delete path for a recorded execution (immutability by omission)", async function () {
    const { orchestration } = await loadFixture(deployFixture);
    expect((orchestration as any).updateExecution).to.be.undefined;
    expect((orchestration as any).deleteExecution).to.be.undefined;
  });
});
