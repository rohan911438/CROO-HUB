function grid(nodes: { id: string; type: string; label: string; agentSlug?: string }[]) {
  return nodes.map((n, i) => ({
    ...n,
    position: { x: 80 + i * 260, y: 120 + (i % 2) * 80 },
    config: {},
  }));
}

function chain(ids: string[]) {
  return ids.slice(0, -1).map((id, i) => ({
    id: `e-${id}-${ids[i + 1]}`,
    source: id,
    target: ids[i + 1],
    animated: true,
  }));
}

export const templateSeedData = [
  {
    name: 'Research Pipeline',
    slug: 'research-pipeline',
    description: 'Plan a research task, gather sources, verify claims, and store the final brief.',
    category: 'Research',
    icon: 'search',
    nodes: grid([
      { id: 'n1', type: 'planner', label: 'Planner Agent', agentSlug: 'nomad-planner-agent' },
      { id: 'n2', type: 'research', label: 'Research Agent', agentSlug: 'atlas-research-agent' },
      { id: 'n3', type: 'verification', label: 'Verification Agent', agentSlug: 'sentinel-verification-agent' },
      { id: 'n4', type: 'storage', label: 'Storage Agent', agentSlug: 'vault-storage-agent' },
    ]),
    edges: chain(['n1', 'n2', 'n3', 'n4']),
    usageCount: 812,
    featured: true,
  },
  {
    name: 'Smart Contract Audit',
    slug: 'smart-contract-audit',
    description: 'Run static analysis, security scanning, and blockchain state verification on a contract.',
    category: 'Security',
    icon: 'shield',
    nodes: grid([
      { id: 'n1', type: 'planner', label: 'Planner Agent', agentSlug: 'nomad-planner-agent' },
      { id: 'n2', type: 'security', label: 'Security Audit Agent', agentSlug: 'warden-security-agent' },
      { id: 'n3', type: 'blockchain', label: 'Blockchain Agent', agentSlug: 'ledger-blockchain-agent' },
      { id: 'n4', type: 'verification', label: 'Verification Agent', agentSlug: 'sentinel-verification-agent' },
    ]),
    edges: chain(['n1', 'n2', 'n3', 'n4']),
    usageCount: 356,
    featured: true,
  },
  {
    name: 'Market Analysis',
    slug: 'market-analysis',
    description: 'Aggregate market signals, analyze trends, and generate an executive summary report.',
    category: 'Analytics',
    icon: 'trending-up',
    nodes: grid([
      { id: 'n1', type: 'planner', label: 'Planner Agent', agentSlug: 'nomad-planner-agent' },
      { id: 'n2', type: 'analytics', label: 'Market Analysis Agent', agentSlug: 'pulse-market-analysis-agent' },
      { id: 'n3', type: 'content', label: 'Content Generation Agent', agentSlug: 'forge-content-agent' },
    ]),
    edges: chain(['n1', 'n2', 'n3']),
    usageCount: 501,
    featured: true,
  },
  {
    name: 'Content Generation',
    slug: 'content-generation',
    description: 'Plan, draft, and translate long-form content across multiple languages.',
    category: 'Content',
    icon: 'pen-line',
    nodes: grid([
      { id: 'n1', type: 'planner', label: 'Planner Agent', agentSlug: 'nomad-planner-agent' },
      { id: 'n2', type: 'content', label: 'Content Generation Agent', agentSlug: 'forge-content-agent' },
      { id: 'n3', type: 'translation', label: 'Translation Agent', agentSlug: 'lexicon-translation-agent' },
    ]),
    edges: chain(['n1', 'n2', 'n3']),
    usageCount: 274,
    featured: false,
  },
  {
    name: 'OCR Workflow',
    slug: 'ocr-workflow',
    description: 'Extract text from scanned documents, structure the data, and persist to storage.',
    category: 'Document Processing',
    icon: 'scan-text',
    nodes: grid([
      { id: 'n1', type: 'ocr', label: 'OCR Agent', agentSlug: 'optix-ocr-agent' },
      { id: 'n2', type: 'extraction', label: 'Data Extraction Agent', agentSlug: 'cipher-data-agent' },
      { id: 'n3', type: 'storage', label: 'Storage Agent', agentSlug: 'vault-storage-agent' },
    ]),
    edges: chain(['n1', 'n2', 'n3']),
    usageCount: 198,
    featured: false,
  },
  {
    name: 'Blockchain Monitoring',
    slug: 'blockchain-monitoring',
    description: 'Continuously monitor on-chain events and verify anomalies against expected state.',
    category: 'Blockchain',
    icon: 'link',
    nodes: grid([
      { id: 'n1', type: 'blockchain', label: 'Blockchain Agent', agentSlug: 'ledger-blockchain-agent' },
      { id: 'n2', type: 'verification', label: 'Verification Agent', agentSlug: 'sentinel-verification-agent' },
      { id: 'n3', type: 'storage', label: 'Storage Agent', agentSlug: 'vault-storage-agent' },
    ]),
    edges: chain(['n1', 'n2', 'n3']),
    usageCount: 143,
    featured: false,
  },
];
