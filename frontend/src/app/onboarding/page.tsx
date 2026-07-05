'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Building2, Sparkles, Users, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const useCases = [
  { id: 'research', label: 'Research & analysis', icon: Sparkles },
  { id: 'ops', label: 'Workflow automation', icon: Bot },
  { id: 'security', label: 'Security & audits', icon: Building2 },
  { id: 'content', label: 'Content operations', icon: Users },
];

const steps = ['Organization', 'Use case', 'Invite team'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState('');
  const [useCase, setUseCase] = useState<string | null>(null);
  const [invites, setInvites] = useState('');

  function next() {
    if (step === steps.length - 1) {
      router.push('/dashboard');
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mesh px-4">
      <Card className="w-full max-w-lg p-8 shadow-glow">
        <div className="mb-8 flex items-center justify-between">
          {steps.map((label, i) => (
            <div key={label} className="flex flex-1 items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-colors',
                  i < step && 'border-primary bg-primary text-primary-foreground',
                  i === step && 'border-primary text-primary',
                  i > step && 'border-border text-muted-foreground',
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn('mx-2 h-px flex-1', i < step ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div>
                <h2 className="text-xl font-semibold">Set up your organization</h2>
                <p className="mt-1 text-sm text-muted-foreground">This is the workspace your team will share.</p>
                <div className="mt-6 space-y-1.5">
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input id="orgName" placeholder="CROO Labs" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="text-xl font-semibold">What will you use CROO Hub for?</h2>
                <p className="mt-1 text-sm text-muted-foreground">We&apos;ll tailor your dashboard and recommended agents.</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {useCases.map((uc) => (
                    <button
                      key={uc.id}
                      type="button"
                      onClick={() => setUseCase(uc.id)}
                      className={cn(
                        'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors',
                        useCase === uc.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                      )}
                    >
                      <uc.icon className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{uc.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-xl font-semibold">Invite your team</h2>
                <p className="mt-1 text-sm text-muted-foreground">Optional — you can always invite teammates later.</p>
                <div className="mt-6 space-y-1.5">
                  <Label htmlFor="invites">Email addresses</Label>
                  <Input id="invites" placeholder="teammate@company.com, another@company.com" value={invites} onChange={(e) => setInvites(e.target.value)} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button variant="gradient" onClick={next}>
            {step === steps.length - 1 ? 'Go to dashboard' : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
