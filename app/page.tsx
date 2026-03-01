import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-6 p-6">
      <h1 className="text-4xl font-bold tracking-tight">chatbot SaaS</h1>
      <p className="max-w-xl text-slate-600">
        Production-ready baseline for a multi-tenant chatbot platform with Next.js, Prisma, and
        PostgreSQL.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-md bg-slate-900 px-4 py-2 text-white">
          Login
        </Link>
        <Link href="/register" className="rounded-md border border-slate-300 px-4 py-2">
          Register
        </Link>
      </div>
    </main>
  );
}
