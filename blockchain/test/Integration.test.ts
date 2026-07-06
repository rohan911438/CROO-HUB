import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { deployFixture, sampleAgentInput, ONE_USDC } from "./fixtures";

describe("CROO Hub integration", function () {
  it("runs a full agent lifecycle: register -> escrow settle -> reputation -> review -> workflow proof", async function () {
    const { agentRegistry, escrow, reputation, orchestration, usdc, agentOwner, buyer } = await loadFixture(
      deployFixture,
    );

    // 1. Agent identity
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    expect(await agentRegistry.isAgentAvailable(1)).to.equal(true);

    // 2. Trustless commerce
    const amount = 250n * ONE_USDC;
    const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
    const workflowRef = ethers.keccak256(ethers.toUtf8Bytes("workflow-doc-abc123"));

    await escrow.connect(buyer).createEscrow(1, amount, deadline, workflowRef);
    await escrow.connect(agentOwner).acceptEscrow(1);
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("execution-trace"));
    await escrow.connect(agentOwner).markCompleted(1, proofHash);
    await escrow.connect(buyer).releasePayment(1);

    expect((await escrow.getEscrow(1)).status).to.equal(3n); // Released
    expect(await usdc.balanceOf(agentOwner.address)).to.equal(amount);

    // 3. Reputation updated automatically from the settled escrow, not user input
    let summary = await reputation.getReputationSummary(1);
    expect(summary.completedJobs).to.equal(1n);
    expect(summary.successfulJobs).to.equal(1n);
    expect(summary.reputationScore).to.equal(10_000n);

    // 4. Buyer leaves a review tied to that exact settlement
    await reputation.connect(buyer).submitReview(1, 5);
    summary = await reputation.getReputationSummary(1);
    expect(summary.reviewCount).to.equal(1n);

    // 5. Immutable workflow execution proof, cross-referencing the agent and the escrow's workflowId
    const startedAt = (await time.latest()) - 120;
    const completedAt = await time.latest();
    await orchestration
      .connect(buyer)
      .recordExecution(0, workflowRef, [agentOwner.address], [1], proofHash, proofHash, "1.0.0", startedAt, completedAt, 0);

    const execution = await orchestration.getExecution(1);
    expect(execution.workflowRef).to.equal(workflowRef);
    expect(execution.agentIds).to.deep.equal([1n]);
    expect(await orchestration.getExecutionsByAgentId(1)).to.deep.equal([1n]);
  });

  it("keeps modules independently functional if Reputation is unset on EscrowCommerce", async function () {
    const { agentRegistry, escrow, admin, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    await escrow.connect(admin).setReputationContract(ethers.ZeroAddress);

    const amount = 50n * ONE_USDC;
    const deadline = (await time.latest()) + 3600;
    await escrow.connect(buyer).createEscrow(1, amount, deadline, ethers.ZeroHash);
    await escrow.connect(agentOwner).acceptEscrow(1);
    await escrow.connect(agentOwner).markCompleted(1, ethers.ZeroHash);

    // Payment still settles even though reputation sync is disabled.
    await expect(escrow.connect(buyer).releasePayment(1)).to.emit(escrow, "PaymentReleased");
    expect((await escrow.getEscrow(1)).status).to.equal(3n);
  });
});
