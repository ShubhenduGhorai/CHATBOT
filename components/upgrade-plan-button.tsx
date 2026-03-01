'use client';

import { useState } from 'react';

type Plan = 'PRO' | 'BUSINESS';

type UpgradePlanButtonProps = {
  workspaceId: string;
  plan: Plan;
};

export function UpgradePlanButton({ workspaceId, plan }: UpgradePlanButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, plan })
      });

      const payload = (await response.json()) as {
        checkout?: { url?: string };
        error?: string;
      };

      if (!response.ok || !payload.checkout?.url) {
        setError(payload.error ?? 'Unable to start checkout');
        return;
      }

      window.location.href = payload.checkout.url;
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={isLoading}
        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isLoading ? 'Redirecting...' : `Upgrade to ${plan}`}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
