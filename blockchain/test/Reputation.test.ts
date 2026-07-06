import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { deployFixture, sampleAgentInput } from "./fixtures";

describe("Reputation", function () {
  it("only allows RECORDER_ROLE to record job outcomes", async function () {
    const { reputation, agentRegistry, agentOwner, buyer, other } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());

    await expect(
      reputation.connect(other).recordSuccessfulJob(1, 1, buyer.address, 10, 20, 1000),
    ).to.be.reverted;
  });

  it("reverts recording for an agent id that does not exist in the registry", async function () {
    const { reputation, admin, buyer } = await loadFixture(deployFixture);
    const RECORDER_ROLE = await reputation.RECORDER_ROLE();
    await reputation.connect(admin).grantRole(RECORDER_ROLE, admin.address);

    await expect(
      reputation.connect(admin).recordSuccessfulJob(999, 1, buyer.address, 10, 20, 1000),
    ).to.be.revertedWithCustomError(reputation, "UnknownAgent");
  });

  it("accumulates successful jobs and computes reputation/trust scores", async function () {
    const { reputation, agentRegistry, admin, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const RECORDER_ROLE = await reputation.RECORDER_ROLE();
    await reputation.connect(admin).grantRole(RECORDER_ROLE, admin.address);

    await reputation.connect(admin).recordSuccessfulJob(1, 1, buyer.address, 10, 100, 5_000_000);
    let summary = await reputation.getReputationSummary(1);
    expect(summary.completedJobs).to.equal(1n);
    expect(summary.successfulJobs).to.equal(1n);
    expect(summary.reputationScore).to.equal(10_000n); // 100% success, no reviews yet -> pure success rate

    await reputation.connect(admin).recordFailedJob(1, 2, buyer.address, 15);
    summary = await reputation.getReputationSummary(1);
    expect(summary.completedJobs).to.equal(2n);
    expect(summary.failedJobs).to.equal(1n);
    expect(summary.reputationScore).to.equal(5_000n); // 1/2 success rate
  });

  it("dampens trust score for low job volume relative to reputation score", async function () {
    const { reputation, agentRegistry, admin, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const RECORDER_ROLE = await reputation.RECORDER_ROLE();
    await reputation.connect(admin).grantRole(RECORDER_ROLE, admin.address);

    await reputation.connect(admin).recordSuccessfulJob(1, 1, buyer.address, 10, 100, 1_000_000);
    const summary = await reputation.getReputationSummary(1);
    // VOLUME_CONFIDENCE_CAP = 50, completedJobs = 1 => confidence = 1/50 = 200 bps
    expect(summary.trustScore).to.equal((summary.reputationScore * 200n) / 10_000n);
    expect(summary.trustScore).to.be.lessThan(summary.reputationScore);
  });

  it("lets only the eligible buyer submit a single review per escrow", async function () {
    const { reputation, agentRegistry, admin, agentOwner, buyer, other } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const RECORDER_ROLE = await reputation.RECORDER_ROLE();
    await reputation.connect(admin).grantRole(RECORDER_ROLE, admin.address);
    await reputation.connect(admin).recordSuccessfulJob(1, 42, buyer.address, 10, 100, 1_000_000);

    await expect(reputation.connect(other).submitReview(42, 5)).to.be.revertedWithCustomError(
      reputation,
      "NotEligibleReviewer",
    );

    await expect(reputation.connect(buyer).submitReview(42, 0)).to.be.revertedWithCustomError(
      reputation,
      "InvalidRating",
    );
    await expect(reputation.connect(buyer).submitReview(42, 6)).to.be.revertedWithCustomError(
      reputation,
      "InvalidRating",
    );

    await expect(reputation.connect(buyer).submitReview(42, 5))
      .to.emit(reputation, "ReviewSubmitted")
      .withArgs(1n, 42n, buyer.address, 5, anyValue);

    await expect(reputation.connect(buyer).submitReview(42, 4)).to.be.revertedWithCustomError(
      reputation,
      "AlreadyReviewed",
    );

    const summary = await reputation.getReputationSummary(1);
    expect(summary.reviewCount).to.equal(1n);
    expect(summary.cumulativeRatingScore).to.equal(5n);
  });

  it("auto-grants the verified badge only after enough volume and success rate", async function () {
    const { reputation, agentRegistry, admin, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const RECORDER_ROLE = await reputation.RECORDER_ROLE();
    await reputation.connect(admin).grantRole(RECORDER_ROLE, admin.address);

    for (let i = 0; i < 9; i++) {
      await reputation.connect(admin).recordSuccessfulJob(1, i + 1, buyer.address, 10, 100, 1000);
    }
    let summary = await reputation.getReputationSummary(1);
    expect(summary.verifiedBadge).to.equal(false); // only 9 completed jobs, MIN_JOBS_FOR_BADGE = 10

    await reputation.connect(admin).recordSuccessfulJob(1, 10, buyer.address, 10, 100, 1000);
    summary = await reputation.getReputationSummary(1);
    expect(summary.verifiedBadge).to.equal(true); // 10 jobs, 100% success >= 95%
  });

  it("prevents double-recording the same escrowId outcome", async function () {
    const { reputation, agentRegistry, admin, agentOwner, buyer } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    const RECORDER_ROLE = await reputation.RECORDER_ROLE();
    await reputation.connect(admin).grantRole(RECORDER_ROLE, admin.address);

    await reputation.connect(admin).recordSuccessfulJob(1, 7, buyer.address, 10, 100, 1000);
    await expect(
      reputation.connect(admin).recordFailedJob(1, 7, buyer.address, 10),
    ).to.be.revertedWithCustomError(reputation, "EscrowAlreadyRecorded");
  });
});
