import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getWorkspaceDashboardData } from '@/lib/dashboard';

type DashboardLayoutProps = {
  children: ReactNode;
};

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/chatbots', label: 'Chatbots' },
  { href: '/dashboard/billing', label: 'Billing' }
] as const;

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const data = await getWorkspaceDashboardData();
  if (!data) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Workspace</p>
            <h1 className="text-lg font-semibold text-slate-900">{data.workspaceName}</h1>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium">
            {data.plan} plan
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-2">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
