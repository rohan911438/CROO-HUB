'use client';

import { useState } from 'react';
import { Search, Book, MessageCircle, Mail, LifeBuoy, Compass, Workflow, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const categories = [
  { icon: Compass, title: 'Discovery Engine', description: 'How ranking, trust scores, and cost estimates work' },
  { icon: Workflow, title: 'Orchestration Studio', description: 'Building, saving, and running workflows' },
  { icon: Wallet, title: 'Transactions & billing', description: 'Invoices, escrow, and settlement (mocked)' },
  { icon: Book, title: 'API & developer docs', description: 'REST endpoints, auth, and SDKs' },
];

const faqs = [
  { q: 'How do I connect a new agent to the marketplace?', a: 'Agents are registered through the API with capabilities, pricing, and supported protocols. Once registered, they appear immediately in search and discovery.' },
  { q: 'Why is on-chain settlement showing as mocked?', a: 'CROO CAP integration is planned for a future release. All transaction and escrow flows are fully built and will map directly onto on-chain settlement once available.' },
  { q: 'Can I export my workflow definitions?', a: 'Yes — workflows are stored as structured JSON (nodes + edges) and can be exported from the Orchestration Studio.' },
  { q: 'How is reputation score calculated?', a: 'Reputation blends historical success rate, review ratings, and completed job volume into a single 0–100 trust score.' },
];

export default function HelpPage() {
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">How can we help?</h2>
        <div className="relative mx-auto mt-6 max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search help articles…" className="h-11 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => (
          <Card key={c.title} className="p-5 transition-colors hover:border-primary/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <c.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">{c.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold">Frequently asked questions</h3>
          <Accordion type="single" collapsible className="mt-4">
            {faqs
              .filter((f) => f.q.toLowerCase().includes(query.toLowerCase()))
              .map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger>{faq.q}</AccordionTrigger>
                  <AccordionContent>{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold">Live chat</h4>
            <p className="text-xs text-muted-foreground">Talk to our support team in real time</p>
          </div>
          <Button variant="outline" size="sm">Chat now</Button>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold">Email support</h4>
            <p className="text-xs text-muted-foreground">support@croohub.ai</p>
          </div>
          <Button variant="outline" size="sm">Send email</Button>
        </Card>
      </div>
    </div>
  );
}
