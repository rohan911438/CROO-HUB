'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Github, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { api, ApiError } from '@/lib/api';
import { storeTokens } from '@/lib/auth';

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
    terms: z.boolean().refine((v) => v, 'You must accept the terms'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const { accessToken, refreshToken } = await api.auth.register({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      storeTokens(accessToken, refreshToken);
      toast.success('Account created', { description: 'Check your inbox to verify your email.' });
      router.push('/verify-email');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not reach the CROO Hub API. Is the backend running?';
      toast.error('Sign up failed', { description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start building agent workflows in minutes.">
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" type="button">
          <Github className="h-4 w-4" /> GitHub
        </Button>
        <Button variant="outline" type="button">
          Google
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Jordan Reyes" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" placeholder="••••••••" {...register('confirmPassword')} />
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        <div className="flex items-start gap-2 pt-1">
          <Checkbox
            id="terms"
            checked={watch('terms')}
            onCheckedChange={(v) => setValue('terms', v === true)}
          />
          <Label htmlFor="terms" className="text-xs font-normal text-muted-foreground">
            I agree to the Terms of Service and Privacy Policy
          </Label>
        </div>
        {errors.terms && <p className="text-xs text-destructive">{errors.terms.message}</p>}

        <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/" className="text-foreground underline-offset-4 hover:underline">
          Connect your wallet
        </Link>
      </p>
    </AuthShell>
  );
}
