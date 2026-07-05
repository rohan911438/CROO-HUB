'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);

  async function resend() {
    setResending(true);
    await new Promise((r) => setTimeout(r, 700));
    setResending(false);
    toast.success('Verification email resent');
  }

  return (
    <AuthShell title="Verify your email" subtitle="One more step before you can start orchestrating agents.">
      <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-primary" />
        <h3 className="mt-4 font-medium">Check your inbox</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a verification link to your email address. Click it to activate your account.
        </p>
        <Button variant="outline" className="mt-6 w-full" onClick={resend} disabled={resending}>
          {resending && <Loader2 className="h-4 w-4 animate-spin" />}
          Resend verification email
        </Button>
      </div>

      <Link href="/onboarding" className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground">
        Already verified? Continue to onboarding →
      </Link>
    </AuthShell>
  );
}
