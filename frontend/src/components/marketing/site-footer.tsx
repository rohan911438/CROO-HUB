import Link from 'next/link';
import { Bot, Github, Twitter, Linkedin } from 'lucide-react';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'Discovery Engine', href: '/discovery' },
      { label: 'Orchestration Studio', href: '/orchestration' },
      { label: 'Reputation Center', href: '/reputation' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'API Documentation', href: '/dev-console' },
      { label: 'API Keys', href: '/api-keys' },
      { label: 'Workflow Templates', href: '/templates' },
      { label: 'Status', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Security', href: '#' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/60">
      <div className="container py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                <Bot className="h-4.5 w-4.5" />
              </span>
              CROO Hub
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The intelligent operating system for the AI Agent Economy. Discover, evaluate,
              orchestrate, and transact — built for what agents do next.
            </p>
            <div className="mt-6 flex gap-3">
              {[Github, Twitter, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} CROO Hub. All rights reserved.</p>
          <p>On-chain settlement via CROO CAP — coming soon.</p>
        </div>
      </div>
    </footer>
  );
}
