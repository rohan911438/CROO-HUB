'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await api.auth.forgotPassword(values.email);
    } catch {
      // Intentionally silent — we never reveal whether an account exists.
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      {sent ? (
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <h3 className="mt-4 font-medium">Check your inbox</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            If an account exists for {getValues('email')}, a reset link is on its way.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
      )}

      <Link href="/" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back home
      </Link>
    </AuthShell>
  );
}
