'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AuthMode } from '@/types/auth';

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isRegister = mode === 'register';
  const endpoint = useMemo(() => `/api/auth/${mode}`, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Authentication failed');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Unexpected error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{isRegister ? 'Create account' : 'Sign in'}</h1>
      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        {isRegister ? (
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            name="name"
            type="text"
            placeholder="Full name"
            required
          />
        ) : null}
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          name="email"
          type="email"
          placeholder="Email"
          required
        />
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={8}
        />
        {isRegister ? (
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            name="workspaceName"
            type="text"
            placeholder="Workspace name"
            required
          />
        ) : null}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-70"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
        <Link href={isRegister ? '/login' : '/register'} className="text-slate-900 underline">
          {isRegister ? 'Login' : 'Register'}
        </Link>
      </p>
    </section>
  );
}
