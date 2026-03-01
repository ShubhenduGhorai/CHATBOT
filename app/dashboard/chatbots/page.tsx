import { redirect } from 'next/navigation';
import { CopyButton } from '@/components/copy-button';
import { getWorkspaceDashboardData } from '@/lib/dashboard';
import { env } from '@/lib/config/env';

function getEmbedCode(apiKey: string) {
  return `<script src="${env.NEXT_PUBLIC_APP_URL}/api/widget/${apiKey}"></script>`;
}

export default async function DashboardChatbotsPage() {
  const data = await getWorkspaceDashboardData();
  if (!data) {
    redirect('/login');
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Chatbots</h2>
        <p className="mt-1 text-sm text-slate-600">Manage API keys and embed scripts for each bot.</p>
      </div>

      <div className="grid gap-4">
        {data.chatbots.length === 0 ? (
          <article className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No chatbots found in this workspace.
          </article>
        ) : (
          data.chatbots.map((bot) => {
            const embedCode = getEmbedCode(bot.apiKey);

            return (
              <article key={bot.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{bot.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {bot.messageCountMonth.toLocaleString()} messages this month
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <CopyButton value={bot.apiKey} label="Copy API key" />
                    <CopyButton value={embedCode} label="Copy embed code" />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">API key</p>
                    <p className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                      {bot.apiKey}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Embed code</p>
                    <p className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                      {embedCode}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
