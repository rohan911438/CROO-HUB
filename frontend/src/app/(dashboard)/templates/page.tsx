'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search, Shield, TrendingUp, PenLine, ScanText, Link as LinkIcon, Copy, LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockTemplates } from '@/lib/mock-data';
import { toast } from 'sonner';

const iconMap: Record<string, LucideIcon> = {
  search: Search,
  shield: Shield,
  'trending-up': TrendingUp,
  'pen-line': PenLine,
  'scan-text': ScanText,
  link: LinkIcon,
};

export default function TemplatesPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = mockTemplates.filter(
    (t) => t.name.toLowerCase().includes(query.toLowerCase()) || t.category.toLowerCase().includes(query.toLowerCase()),
  );

  function applyTemplate(name: string) {
    toast.success(`"${name}" duplicated`, { description: 'Opened as a new draft in Orchestration Studio.' });
    router.push('/orchestration');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Workflow Templates</h2>
          <p className="mt-1 text-sm text-muted-foreground">Start from a proven pipeline and customize it in the Orchestration Studio.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search templates…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t, i) => {
          const Icon = iconMap[t.icon] ?? Search;
          return (
            <motion.div key={t.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="flex h-full flex-col p-5 transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  {t.featured && <Badge variant="default">Featured</Badge>}
                </div>
                <h3 className="mt-4 font-semibold">{t.name}</h3>
                <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{t.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                  <Badge variant="outline">{t.category}</Badge>
                  <span className="text-xs text-muted-foreground">{t.usageCount} uses</span>
                </div>
                <Button variant="gradient" className="mt-4 w-full" onClick={() => applyTemplate(t.name)}>
                  <Copy className="h-4 w-4" /> Duplicate & customize
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
