import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getWorkspaceDashboardData } from '@/lib/dashboard';

function usageLabel(used: number, limit: number | null) {
  if (limit === null) {
    return `${used.toLocaleString()} / Unlimited`;
  }
  return `${used.toLocaleString()} / ${limit.toLocaleString()}`;
}

export default async function DashboardPage() {
  const data = await getWorkspaceDashboardData();
  if (!data) {
    redirect('/login');
  }

  const recent = data.chatbots.slice(0, 3);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">Monitor chatbots, usage, and subscription.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active Chatbots</p>
          <p className="mt-3 text-3xl font-semibold">{data.chatbots.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Monthly Usage</p>
          <p className="mt-3 text-3xl font-semibold">{usageLabel(data.usage.used, data.usage.limit)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Subscription</p>
          <p className="mt-3 text-3xl font-semibold">{data.plan}</p>
          <p className="mt-1 text-sm text-slate-500">{data.status}</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold">Recent Chatbots</h3>
          <div className="mt-4 space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">No chatbots created yet.</p>
            ) : (
              recent.map((bot) => (
                <div
                  key={bot.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <p className="font-medium">{bot.name}</p>
                  <p className="text-xs text-slate-500">
                    {bot.messageCountMonth.toLocaleString()} messages this month
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold">Quick Actions</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard/chatbots"
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium hover:bg-slate-50"
            >
              Manage Chatbots
            </Link>
            <Link
              href="/dashboard/billing"
              className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white"
            >
              Upgrade Plan
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
