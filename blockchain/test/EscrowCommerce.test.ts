import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers } from "hardhat";
import { deployFixture, sampleAgentInput, ONE_USDC } from "./fixtures";

const DAY = 24 * 60 * 60;

async function futureDeadline(offsetSeconds = 7 * DAY) {
  return (await time.latest()) + offsetSeconds;
}

describe("EscrowCommerce", function () {
  it("creates an escrow and pulls USDC from the buyer", async function () {
    const { escrow, usdc, agentRegistry, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());

    const amount = 100n * ONE_USDC;
    const deadline = await futureDeadline();
    const buyerBalanceBefore = await usdc.balanceOf(buyer.address);

    await expect(escrow.connect(buyer).createEscrow(1, amount, deadline, ethers.ZeroHash))
      .to.emit(escrow, "EscrowCreated")
      .withArgs(1n, buyer.address, 1n, amount, deadline, ethers.ZeroHash);

    expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBalanceBefore - amount);
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(amount);

    const record = await escrow.getEscrow(1);
    expect(record.status).to.equal(0n); // Created
  });

  it("rejects escrow creation for an unavailable/unknown agent, zero amount, or past deadline", async function () {
    const { escrow, agentRegistry, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const deadline = await futureDeadline();

    await expect(
      escrow.connect(buyer).createEscrow(999, 100n * ONE_USDC, deadline, ethers.ZeroHash),
    ).to.be.revertedWithCustomError(escrow, "AgentNotAvailableForEscrow");

    await expect(
      escrow.connect(buyer).createEscrow(1, 0, deadline, ethers.ZeroHash),
    ).to.be.revertedWithCustomError(escrow, "InvalidAmount");

    await expect(
      escrow.connect(buyer).createEscrow(1, 100n * ONE_USDC, (await time.latest()) - 1, ethers.ZeroHash),
    ).to.be.revertedWithCustomError(escrow, "InvalidDeadline");

    await agentRegistry.connect(agentOwner).pauseAgent(1);
    await expect(
      escrow.connect(buyer).createEscrow(1, 100n * ONE_USDC, deadline, ethers.ZeroHash),
    ).to.be.revertedWithCustomError(escrow, "AgentNotAvailableForEscrow");
  });

  it("only the assigned agent owner can accept, and only while Created and unexpired", async function () {
    const { escrow, agentRegistry, agentOwner, buyer, other } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const deadline = await futureDeadline();
    await escrow.connect(buyer).createEscrow(1, 100n * ONE_USDC, deadline, ethers.ZeroHash);

    await expect(escrow.connect(other).acceptEscrow(1)).to.be.revertedWithCustomError(escrow, "NotAssignedAgent");

    await expect(escrow.connect(agentOwner).acceptEscrow(1))
      .to.emit(escrow, "EscrowAccepted")
      .withArgs(1n, agentOwner.address, anyValue);

    await expect(escrow.connect(agentOwner).acceptEscrow(1)).to.be.revertedWithCustomError(
      escrow,
      "UnexpectedStatus",
    );
  });

  it("runs the full happy path: create -> accept -> complete -> release, paying the agent and applying fees", async function () {
    const { escrow, usdc, agentRegistry, reputation, admin, agentOwner, buyer } = await loadFixture(deployFixture);
    await escrow.connect(admin).setFeeConfig(500, admin.address); // 5%
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const amount = 100n * ONE_USDC;
    const deadline = await futureDeadline();

    await escrow.connect(buyer).createEscrow(1, amount, deadline, ethers.ZeroHash);
    await escrow.connect(agentOwner).acceptEscrow(1);

    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof"));
    await expect(escrow.connect(agentOwner).markCompleted(1, proofHash))
      .to.emit(escrow, "WorkCompleted")
      .withArgs(1n, proofHash, anyValue);

    const agentBalanceBefore = await usdc.balanceOf(agentOwner.address);
    const adminBalanceBefore = await usdc.balanceOf(admin.address);

    await expect(escrow.connect(buyer).releasePayment(1))
      .to.emit(escrow, "PaymentReleased")
      .withArgs(1n, agentOwner.address, amount - (amount * 500n) / 10_000n, (amount * 500n) / 10_000n, anyValue);

    expect(await usdc.balanceOf(agentOwner.address)).to.equal(agentBalanceBefore + amount - (amount * 500n) / 10_000n);
    expect(await usdc.balanceOf(admin.address)).to.equal(adminBalanceBefore + (amount * 500n) / 10_000n);

    const record = await escrow.getEscrow(1);
    expect(record.status).to.equal(3n); // Released

    const summary = await reputation.getReputationSummary(1);
    expect(summary.completedJobs).to.equal(1n);
    expect(summary.successfulJobs).to.equal(1n);
  });

  it("lets the agent self-release after the grace period if the buyer is unresponsive", async function () {
    const { escrow, agentRegistry, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const deadline = await futureDeadline();
    await escrow.connect(buyer).createEscrow(1, 100n * ONE_USDC, deadline, ethers.ZeroHash);
    await escrow.connect(agentOwner).acceptEscrow(1);
    await escrow.connect(agentOwner).markCompleted(1, ethers.ZeroHash);

    await expect(escrow.connect(agentOwner).releasePayment(1)).to.be.revertedWithCustomError(
      escrow,
      "NotReleaseAuthorized",
    );

    await time.increase(3 * DAY + 1);
    await expect(escrow.connect(agentOwner).releasePayment(1)).to.emit(escrow, "PaymentReleased");
  });

  it("lets the buyer cancel only before acceptance, refunding in full", async function () {
    const { escrow, usdc, agentRegistry, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const amount = 100n * ONE_USDC;
    const deadline = await futureDeadline();
    await escrow.connect(buyer).createEscrow(1, amount, deadline, ethers.ZeroHash);

    const balanceBefore = await usdc.balanceOf(buyer.address);
    await expect(escrow.connect(buyer).cancelEscrow(1)).to.emit(escrow, "EscrowCancelled");
    expect(await usdc.balanceOf(buyer.address)).to.equal(balanceBefore + amount);

    await escrow.connect(buyer).createEscrow(1, amount, deadline, ethers.ZeroHash);
    await escrow.connect(agentOwner).acceptEscrow(2);
    await expect(escrow.connect(buyer).cancelEscrow(2)).to.be.revertedWithCustomError(escrow, "UnexpectedStatus");
  });

  it("refunds the buyer on timeout whether or not the agent had accepted", async function () {
    const { escrow, usdc, reputation, agentRegistry, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const amount = 100n * ONE_USDC;
    const shortDeadline = await futureDeadline(DAY);

    // Case 1: never accepted.
    await escrow.connect(buyer).createEscrow(1, amount, shortDeadline, ethers.ZeroHash);
    await time.increase(DAY + 1);
    const balanceBefore = await usdc.balanceOf(buyer.address);
    await expect(escrow.connect(buyer).claimTimeoutRefund(1)).to.emit(escrow, "EscrowRefunded");
    expect(await usdc.balanceOf(buyer.address)).to.equal(balanceBefore + amount);

    // Case 2: accepted but never delivered -> also records a failed job.
    const deadline2 = await futureDeadline(DAY);
    await escrow.connect(buyer).createEscrow(1, amount, deadline2, ethers.ZeroHash);
    await escrow.connect(agentOwner).acceptEscrow(2);
    await time.increase(DAY + 1);
    await expect(escrow.connect(buyer).claimTimeoutRefund(2)).to.emit(escrow, "EscrowRefunded");
    const summary = await reputation.getReputationSummary(1);
    expect(summary.failedJobs).to.equal(1n);
  });

  it("rejects timeout refund before the deadline has passed", async function () {
    const { escrow, agentRegistry, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const deadline = await futureDeadline();
    await escrow.connect(buyer).createEscrow(1, 100n * ONE_USDC, deadline, ethers.ZeroHash);
    await expect(escrow.connect(buyer).claimTimeoutRefund(1)).to.be.revertedWithCustomError(
      escrow,
      "EscrowNotExpired",
    );
  });

  it("handles disputes: raise then arbitrate a split resolution", async function () {
    const { escrow, usdc, reputation, agentRegistry, admin, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const amount = 100n * ONE_USDC;
    const deadline = await futureDeadline();
    await escrow.connect(buyer).createEscrow(1, amount, deadline, ethers.ZeroHash);
    await escrow.connect(agentOwner).acceptEscrow(1);

    await expect(escrow.connect(buyer).raiseDispute(1, "work not as described")).to.emit(escrow, "DisputeRaised");

    await expect(
      escrow.connect(buyer).resolveDispute(1, 60n * ONE_USDC, 40n * ONE_USDC),
    ).to.be.reverted; // not arbitrator

    await expect(
      escrow.connect(admin).resolveDispute(1, 60n * ONE_USDC, 41n * ONE_USDC),
    ).to.be.revertedWithCustomError(escrow, "InvalidSplit");

    const buyerBalanceBefore = await usdc.balanceOf(buyer.address);
    const agentBalanceBefore = await usdc.balanceOf(agentOwner.address);

    await expect(escrow.connect(admin).resolveDispute(1, 60n * ONE_USDC, 40n * ONE_USDC))
      .to.emit(escrow, "DisputeResolved")
      .withArgs(1n, 60n * ONE_USDC, 40n * ONE_USDC, admin.address, anyValue);

    expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBalanceBefore + 60n * ONE_USDC);
    expect(await usdc.balanceOf(agentOwner.address)).to.equal(agentBalanceBefore + 40n * ONE_USDC);

    // Buyer got more than the agent -> counted as a failed job for the agent.
    const summary = await reputation.getReputationSummary(1);
    expect(summary.failedJobs).to.equal(1n);
  });

  it("prevents raising a dispute from an unrelated address or in the wrong status", async function () {
    const { escrow, agentRegistry, agentOwner, buyer, other } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const deadline = await futureDeadline();
    await escrow.connect(buyer).createEscrow(1, 100n * ONE_USDC, deadline, ethers.ZeroHash);

    await expect(escrow.connect(other).raiseDispute(1, "x")).to.be.revertedWithCustomError(
      escrow,
      "NotBuyerOrAgent",
    );
    await expect(escrow.connect(buyer).raiseDispute(1, "x")).to.be.revertedWithCustomError(
      escrow,
      "UnexpectedStatus",
    );
  });

  it("blocks new escrow creation/acceptance while paused without freezing exits", async function () {
    const { escrow, agentRegistry, admin, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const deadline = await futureDeadline();
    await escrow.connect(buyer).createEscrow(1, 100n * ONE_USDC, deadline, ethers.ZeroHash);

    await escrow.connect(admin).pause();
    await expect(
      escrow.connect(buyer).createEscrow(1, 100n * ONE_USDC, deadline, ethers.ZeroHash),
    ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    await expect(escrow.connect(agentOwner).acceptEscrow(1)).to.be.revertedWithCustomError(escrow, "EnforcedPause");

    // Buyer can still exit a pre-existing escrow while paused.
    await expect(escrow.connect(buyer).cancelEscrow(1)).to.emit(escrow, "EscrowCancelled");
  });

  it("rejects fee configuration above MAX_FEE_BPS", async function () {
    const { escrow, admin } = await loadFixture(deployFixture);
    await expect(escrow.connect(admin).setFeeConfig(1001, admin.address)).to.be.revertedWithCustomError(
      escrow,
      "FeeTooHigh",
    );
  });
});
