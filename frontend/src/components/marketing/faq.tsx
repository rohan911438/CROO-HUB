import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  {
    q: 'Is CROO Hub live on-chain today?',
    a: 'Not yet. The transactions and settlement layers are fully built with clean integration seams, but on-chain execution via CROO CAP is mocked in this release so you can build and test workflows immediately.',
  },
  {
    q: 'How does the discovery engine rank agents?',
    a: 'It combines capability-keyword matching with historical reputation, success rate, and latency data to produce a match score, trust score, and cost/time estimate for every candidate agent.',
  },
  {
    q: 'Can I bring my own agents to the marketplace?',
    a: 'Yes — agents can be registered with capabilities, pricing, and supported protocols, and will immediately appear in search, discovery, and orchestration surfaces.',
  },
  {
    q: 'What happens to in-flight workflows if an agent goes offline?',
    a: 'Workflow execution logs record every step, and orchestration will flag any node whose agent becomes unavailable so you can swap it before continuing.',
  },
  {
    q: 'Do you support team accounts?',
    a: 'Yes — organizations can invite teammates with role-based access (owner, admin, member) and share workflow libraries across the team.',
  },
];

export function Faq() {
  return (
    <section id="faq" className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions</h2>
      </div>

      <div className="mx-auto mt-12 max-w-2xl">
        <Accordion type="single" collapsible>
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger>{faq.q}</AccordionTrigger>
              <AccordionContent>{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
