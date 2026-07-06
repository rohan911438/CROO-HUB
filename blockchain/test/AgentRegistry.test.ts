import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers } from "hardhat";
import { deployFixture, sampleAgentInput } from "./fixtures";

describe("AgentRegistry", function () {
  it("registers a new agent with correct metadata and default flags", async function () {
    const { agentRegistry, agentOwner } = await loadFixture(deployFixture);

    await expect(agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput()))
      .to.emit(agentRegistry, "AgentRegistered")
      .withArgs(1n, agentOwner.address, "ResearchBot", "research", anyValue);

    const agent = await agentRegistry.getAgent(1);
    expect(agent.owner).to.equal(agentOwner.address);
    expect(agent.active).to.equal(true);
    expect(agent.available).to.equal(true);
    expect(agent.verified).to.equal(false);
    expect(await agentRegistry.totalAgents()).to.equal(1n);
    expect(await agentRegistry.isAgentActive(1)).to.equal(true);
    expect(await agentRegistry.isAgentAvailable(1)).to.equal(true);
  });

  it("rejects registration with an empty name", async function () {
    const { agentRegistry, agentOwner } = await loadFixture(deployFixture);
    await expect(
      agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput({ name: "" })),
    ).to.be.revertedWithCustomError(agentRegistry, "EmptyName");
  });

  it("rejects arrays longer than MAX_ARRAY_LENGTH", async function () {
    const { agentRegistry, agentOwner } = await loadFixture(deployFixture);
    const tooMany = Array.from({ length: 21 }, (_, i) => `cap-${i}`);
    await expect(
      agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput({ capabilities: tooMany })),
    ).to.be.revertedWithCustomError(agentRegistry, "ArrayTooLong");
  });

  it("only allows the owner to update an agent", async function () {
    const { agentRegistry, agentOwner, other } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());

    await expect(
      agentRegistry.connect(other).updateAgent(1, sampleAgentInput({ name: "Hacked" })),
    ).to.be.revertedWithCustomError(agentRegistry, "NotAgentOwner");

    await expect(agentRegistry.connect(agentOwner).updateAgent(1, sampleAgentInput({ name: "ResearchBot v2" })))
      .to.emit(agentRegistry, "AgentUpdated")
      .withArgs(1n, agentOwner.address, anyValue);

    expect((await agentRegistry.getAgent(1)).name).to.equal("ResearchBot v2");
  });

  it("supports pause -> reactivate lifecycle and rejects double transitions", async function () {
    const { agentRegistry, agentOwner } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());

    await expect(agentRegistry.connect(agentOwner).pauseAgent(1)).to.emit(agentRegistry, "AgentPaused");
    expect(await agentRegistry.isAgentAvailable(1)).to.equal(false);

    await expect(agentRegistry.connect(agentOwner).pauseAgent(1)).to.be.revertedWithCustomError(
      agentRegistry,
      "AgentAlreadyPaused",
    );

    await expect(agentRegistry.connect(agentOwner).reactivateAgent(1)).to.emit(agentRegistry, "AgentReactivated");
    expect(await agentRegistry.isAgentAvailable(1)).to.equal(true);

    await expect(agentRegistry.connect(agentOwner).reactivateAgent(1)).to.be.revertedWithCustomError(
      agentRegistry,
      "AgentNotPaused",
    );
  });

  it("removes an agent permanently and blocks further mutation", async function () {
    const { agentRegistry, agentOwner } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());

    await expect(agentRegistry.connect(agentOwner).removeAgent(1)).to.emit(agentRegistry, "AgentRemoved");
    expect(await agentRegistry.isAgentActive(1)).to.equal(false);
    expect(await agentRegistry.isAgentAvailable(1)).to.equal(false);

    await expect(
      agentRegistry.connect(agentOwner).updateAgent(1, sampleAgentInput()),
    ).to.be.revertedWithCustomError(agentRegistry, "AgentNotActive");
    await expect(agentRegistry.connect(agentOwner).removeAgent(1)).to.be.revertedWithCustomError(
      agentRegistry,
      "AgentNotActive",
    );
  });

  it("transfers ownership and grants modification rights to the new owner only", async function () {
    const { agentRegistry, agentOwner, other } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());

    await expect(agentRegistry.connect(agentOwner).transferAgentOwnership(1, other.address))
      .to.emit(agentRegistry, "AgentOwnershipTransferred")
      .withArgs(1n, agentOwner.address, other.address, anyValue);

    expect(await agentRegistry.getAgentOwner(1)).to.equal(other.address);

    await expect(
      agentRegistry.connect(agentOwner).pauseAgent(1),
    ).to.be.revertedWithCustomError(agentRegistry, "NotAgentOwner");
    await expect(agentRegistry.connect(other).pauseAgent(1)).to.emit(agentRegistry, "AgentPaused");
  });

  it("rejects transferring ownership to the zero address", async function () {
    const { agentRegistry, agentOwner } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());
    await expect(
      agentRegistry.connect(agentOwner).transferAgentOwnership(1, ethers.ZeroAddress),
    ).to.be.revertedWithCustomError(agentRegistry, "InvalidOwnerAddress");
  });

  it("restricts verification badge grants/revocations to VERIFIER_ROLE", async function () {
    const { agentRegistry, agentOwner, admin, other } = await loadFixture(deployFixture);
    await agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput());

    await expect(agentRegistry.connect(other).verifyAgent(1)).to.be.reverted;

    await expect(agentRegistry.connect(admin).verifyAgent(1)).to.emit(agentRegistry, "AgentVerified");
    expect((await agentRegistry.getAgent(1)).verified).to.equal(true);

    await expect(agentRegistry.connect(admin).revokeVerification(1)).to.emit(
      agentRegistry,
      "AgentVerificationRevoked",
    );
    expect((await agentRegistry.getAgent(1)).verified).to.equal(false);
  });

  it("reverts on operations against a non-existent agent id", async function () {
    const { agentRegistry, agentOwner } = await loadFixture(deployFixture);
    await expect(agentRegistry.getAgent(999)).to.be.revertedWithCustomError(agentRegistry, "AgentDoesNotExist");
    await expect(agentRegistry.connect(agentOwner).pauseAgent(999)).to.be.revertedWithCustomError(
      agentRegistry,
      "AgentDoesNotExist",
    );
  });

  it("blocks registration while the contract is paused, by admin only", async function () {
    const { agentRegistry, admin, agentOwner, other } = await loadFixture(deployFixture);

    await expect(agentRegistry.connect(other).pause()).to.be.reverted;

    await agentRegistry.connect(admin).pause();
    await expect(agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput())).to.be.revertedWithCustomError(
      agentRegistry,
      "EnforcedPause",
    );

    await agentRegistry.connect(admin).unpause();
    await expect(agentRegistry.connect(agentOwner).registerAgent(sampleAgentInput())).to.not.be.reverted;
  });
});

