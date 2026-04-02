"use client";

import { useRouter } from "next/navigation";
import { useCompanies } from "@/hooks/use-companies";
import { useEffect, useMemo } from "react";
import Image from "next/image";

interface Company {
  id: string;
  corporate_name: string;
  trade_name?: string | null;
  tenant_slug: string;
  logo_url?: string | null;
  city?: string | null;
  state?: string | null;
}

export default function Home() {
  const { data: companies, isLoading } = useCompanies();
  const router = useRouter();
  const companiesList = useMemo(
    () => ((companies as Company[] | undefined) ?? []),
    [companies],
  );

  // Se houver apenas uma empresa, redireciona automaticamente
  useEffect(() => {
    const [company] = companiesList;

    if (companiesList.length === 1 && company) {
      router.push(`/${company.tenant_slug}`);
    }
  }, [companiesList, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  // Se só tem uma empresa, mostra loading enquanto redireciona
  if (companiesList.length === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-white text-xl">Redirecionando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">
            Frame<span className="text-red-500">24</span>
          </h1>
          <p className="text-zinc-400 text-xl">Escolha sua rede de cinemas</p>
        </div>

        <div className="space-y-4">
          {companiesList.map((company) => (
            <button
              key={company.id}
              onClick={() => router.push(`/${company.tenant_slug}`)}
              className="w-full group relative bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800 hover:border-red-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-red-500/10 text-left"
            >
              <div className="flex items-center gap-4">
                {company.logo_url && (
                  <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                    <Image
                      src={company.logo_url}
                      alt={company.trade_name || company.corporate_name}
                      width={64}
                      height={64}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-red-400 transition-colors">
                    {company.trade_name || company.corporate_name}
                  </h3>
                  {company.city && company.state && (
                    <p className="text-zinc-400 text-sm">
                      📍 {company.city}, {company.state}
                    </p>
                  )}
                </div>
                <div className="text-zinc-600 group-hover:text-red-400 transition-colors">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
