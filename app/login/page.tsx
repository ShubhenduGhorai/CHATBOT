import { AuthForm } from '@/components/auth-form';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <AuthForm mode="login" />
    </main>
  );
}
