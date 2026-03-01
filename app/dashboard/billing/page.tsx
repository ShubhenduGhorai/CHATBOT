import { redirect } from 'next/navigation';
import { UpgradePlanButton } from '@/components/upgrade-plan-button';
import { getWorkspaceDashboardData } from '@/lib/dashboard';

function formatUsage(used: number, limit: number | null) {
  if (limit === null) {
    return `${used.toLocaleString()} messages / month`;
  }

  return `${used.toLocaleString()} of ${limit.toLocaleString()} messages used`;
}

function usageProgress(used: number, limit: number | null) {
  if (limit === null || limit === 0) {
    return 0;
  }

  return Math.min(100, Math.round((used / limit) * 100));
}

export default async function DashboardBillingPage() {
  const data = await getWorkspaceDashboardData();
  if (!data) {
    redirect('/login');
  }

  const progress = usageProgress(data.usage.used, data.usage.limit);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Billing</h2>
        <p className="mt-1 text-sm text-slate-600">Track plan usage and upgrade when needed.</p>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Current Plan</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900">{data.plan}</h3>
            <p className="text-sm text-slate-500">Status: {data.status}</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
            {formatUsage(data.usage.used, data.usage.limit)}
          </span>
        </div>

        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-slate-900" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Resets monthly</p>
        </div>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">Pro</h3>
          <p className="mt-1 text-sm text-slate-600">For teams scaling customer support.</p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li>1000 messages / month</li>
            <li>Priority model access</li>
            <li>Advanced chatbot analytics</li>
          </ul>
          <div className="mt-5">
            <UpgradePlanButton workspaceId={data.workspaceId} plan="PRO" />
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">Business</h3>
          <p className="mt-1 text-sm text-slate-600">For high-volume SaaS deployments.</p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li>Unlimited messages</li>
            <li>Best response throughput</li>
            <li>White-label deployment support</li>
          </ul>
          <div className="mt-5">
            <UpgradePlanButton workspaceId={data.workspaceId} plan="BUSINESS" />
          </div>
        </article>
      </div>
    </section>
  );
}
