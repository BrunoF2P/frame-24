import RegisterForm from "@/components/RegisterForm";
import Link from "next/link";

export default function RegisterTenantPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)]">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-gray-300 hover:text-accent-gold transition">
            <span className="text-xl">🎬</span>
            <span className="font-semibold cinema-gradient-text">Frame24</span>
          </Link>
          <Link href="/" className="text-gray-400 hover:text-accent-gold transition">
            ← Voltar
          </Link>
        </nav>
      </header>

      <main className="flex items-center justify-center px-6 py-12">
        <RegisterForm />
      </main>
    </div>
  );
}
