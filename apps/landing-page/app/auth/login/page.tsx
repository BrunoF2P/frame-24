import Link from "next/link";
import LoginButton from "./sign-in-button";

const DEFAULT_POST_LOGIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3004";

export default async function LandingLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || DEFAULT_POST_LOGIN_URL;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8">
        <h1 className="text-2xl font-bold text-white mb-3">Entrar no Frame24</h1>
        <p className="text-sm text-gray-400 mb-6">
          Você será redirecionado para a central de acesso segura do Frame24.
        </p>

        <LoginButton callbackUrl={callbackUrl} />

        <div className="mt-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-white transition-colors">
            ← Voltar para a landing
          </Link>
        </div>
      </div>
    </main>
  );
}
