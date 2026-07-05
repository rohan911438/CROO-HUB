import { connectDatabase, disconnectDatabase } from '../config/db';
import { hashPassword } from '../utils/hash';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Agent } from '../models/Agent';
import { Template } from '../models/Template';
import { Review } from '../models/Review';
import { Transaction } from '../models/Transaction';
import { Notification } from '../models/Notification';
import { Workflow } from '../models/Workflow';
import { Setting } from '../models/Setting';
import { agentSeedData } from './data/agents';
import { templateSeedData } from './data/templates';

const shouldDestroyOnly = process.argv.includes('--destroy');

async function destroyAll() {
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    Agent.deleteMany({}),
    Template.deleteMany({}),
    Review.deleteMany({}),
    Transaction.deleteMany({}),
    Notification.deleteMany({}),
    Workflow.deleteMany({}),
    Setting.deleteMany({}),
  ]);
  console.log('[seed] All collections cleared.');
}

async function seed() {
  await destroyAll();

  const org = await Organization.create({
    name: 'CROO Labs',
    slug: 'croo-labs',
    plan: 'pro',
    seats: 12,
    billingEmail: 'billing@croolabs.dev',
  });

  const demoPasswordHash = await hashPassword('Password123!');

  const demoUser = await User.create({
    name: 'Jordan Reyes',
    email: 'demo@croohub.ai',
    passwordHash: demoPasswordHash,
    role: 'owner',
    organization: org._id,
    isEmailVerified: true,
    onboardingCompleted: true,
    avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=jordan-reyes',
    lastLoginAt: new Date(),
  });

  const teammate = await User.create({
    name: 'Priya Nandan',
    email: 'priya@croohub.ai',
    passwordHash: demoPasswordHash,
    role: 'admin',
    organization: org._id,
    isEmailVerified: true,
    onboardingCompleted: true,
    avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=priya-nandan',
  });

  org.members = [demoUser._id, teammate._id];
  await org.save();

  await Setting.create({ user: demoUser._id });
  await Setting.create({ user: teammate._id });

  const agents = await Agent.insertMany(
    agentSeedData.map((a) => ({
      ...a,
      owner: demoUser._id,
      versionHistory: [
        { version: a.version, notes: 'Current stable release.', releasedAt: new Date() },
        { version: '0.9.0', notes: 'Initial public beta.', releasedAt: new Date(Date.now() - 90 * 86400000) },
      ],
      apiEndpoints: [
        { method: 'POST', path: '/invoke', description: 'Run the agent against a task payload' },
        { method: 'GET', path: '/status', description: 'Retrieve current agent health and queue depth' },
      ],
      usageExamples: [
        {
          title: 'Basic invocation',
          code: `await croo.agents.invoke('${a.slug}', {\n  input: 'Describe your task here',\n});`,
        },
      ],
    })),
  );

  console.log(`[seed] Inserted ${agents.length} agents.`);

  const templates = await Template.insertMany(templateSeedData);
  console.log(`[seed] Inserted ${templates.length} templates.`);

  const reviewSamples = [
    { rating: 5, title: 'Rock solid for literature reviews', body: 'Atlas cut our research time by 70%. Citation accuracy has been flawless across 40+ briefs.' },
    { rating: 4, title: 'Great, occasional latency spikes', body: 'Very accurate but response time varies under heavy load. Still our default research agent.' },
    { rating: 5, title: 'Caught a critical bug before launch', body: 'Sentinel flagged a reentrancy pattern our internal review missed. Worth every call.' },
  ];

  for (let i = 0; i < Math.min(reviewSamples.length, agents.length); i++) {
    await Review.create({
      agent: agents[i]._id,
      author: i % 2 === 0 ? demoUser._id : teammate._id,
      ...reviewSamples[i],
    });
  }

  const workflow = await Workflow.create({
    owner: demoUser._id,
    organization: org._id,
    name: 'Weekly Competitive Research',
    description: 'Automated weekly research brief on competitor product launches.',
    status: 'saved',
    nodes: templateSeedData[0].nodes,
    edges: templateSeedData[0].edges,
    templateSource: templates[0]._id,
    runCount: 6,
    lastRunAt: new Date(Date.now() - 2 * 86400000),
    executionLogs: [
      { timestamp: new Date(Date.now() - 2 * 86400000), level: 'info', message: 'Workflow run completed (simulation).' },
    ],
  });
  console.log(`[seed] Inserted workflow: ${workflow.name}`);

  const statuses: Array<'completed' | 'processing' | 'escrow_hold' | 'pending' | 'failed'> = [
    'completed',
    'completed',
    'processing',
    'escrow_hold',
    'pending',
    'failed',
  ];

  for (let i = 0; i < 12; i++) {
    const agent = agents[i % agents.length];
    const status = statuses[i % statuses.length];
    await Transaction.create({
      organization: org._id,
      initiator: demoUser._id,
      agent: agent._id,
      workflow: i % 3 === 0 ? workflow._id : undefined,
      amount: Number((Math.random() * 25 + 0.5).toFixed(2)),
      currency: 'USDC',
      status,
      description: `Payment for ${agent.name} task execution`,
      invoiceNumber: `INV-${1000 + i}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      settlementMethod: 'placeholder_offchain',
      escrow: {
        isEscrow: status === 'escrow_hold',
        releaseCondition: status === 'escrow_hold' ? 'Job completion confirmed by initiator' : undefined,
        heldAt: status === 'escrow_hold' ? new Date() : undefined,
      },
    });
  }
  console.log('[seed] Inserted 12 transactions.');

  const notificationSamples: Array<{ type: 'workflow' | 'transaction' | 'reputation' | 'agent' | 'security' | 'system'; title: string; body: string }> = [
    { type: 'workflow', title: 'Workflow run completed', body: '"Weekly Competitive Research" finished successfully with 4/4 steps passing.' },
    { type: 'transaction', title: 'Payment settled', body: 'Invoice INV-1002 was marked completed for Atlas Research Agent.' },
    { type: 'reputation', title: 'Reputation milestone reached', body: 'Sentinel Verification Agent crossed 98 reputation score.' },
    { type: 'agent', title: 'New agent available', body: 'Warden Security Audit Agent is now verified and live in the marketplace.' },
    { type: 'security', title: 'New sign-in detected', body: 'A new session was started from Chrome on Windows.' },
  ];

  for (const n of notificationSamples) {
    await Notification.create({ user: demoUser._id, ...n });
  }
  console.log('[seed] Inserted notifications.');

  console.log('\n[seed] Done. Demo credentials:');
  console.log('  email:    demo@croohub.ai');
  console.log('  password: Password123!');
}

async function run() {
  await connectDatabase();
  if (shouldDestroyOnly) {
    await destroyAll();
  } else {
    await seed();
  }
  await disconnectDatabase();
  process.exit(0);
}

run().catch((error) => {
  console.error('[seed] Failed', error);
  process.exit(1);
});
