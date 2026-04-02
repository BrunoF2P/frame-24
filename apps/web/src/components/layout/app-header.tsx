"use client";

import { useCompany } from "@/hooks/use-company";
import { useComplexes } from "@/hooks/use-complexes";
import { useFilters } from "@/store/use-filters";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface Company {
  id: string;
  corporate_name: string;
  trade_name?: string | null;
  tenant_slug: string;
}

interface Complex {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
}

export function AppHeader({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const { data: company } = useCompany(tenantSlug);
  const { data: complexes } = useComplexes(tenantSlug);
  const { selectedComplexId, setComplex, selectedCity, setCity } = useFilters();

  const complexesList = (complexes as unknown as Complex[]) || [];
  const companyData = (company as Company | undefined) ?? undefined;

  // Extrair cidades únicas
  const cities = Array.from(
    new Set(complexesList.map((c) => c.city).filter(Boolean)),
  );

  // Filtrar complexos por cidade
  const filteredComplexes = selectedCity
    ? complexesList.filter((c) => c.city === selectedCity)
    : complexesList;

  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/${tenantSlug}`)}
              className="text-2xl font-bold text-white hover:text-red-400 transition-colors"
            >
              Frame<span className="text-red-500">24</span>
            </button>
            <div className="h-8 w-px bg-zinc-700" />
            <div className="text-sm">
              <div className="text-zinc-400">Rede:</div>
              <div className="text-white font-medium">
                {companyData?.trade_name || companyData?.corporate_name}
              </div>
            </div>
          </div>

          {/* Filtros e Auth */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            {/* Seletor de Cidade */}
            {cities.length > 1 && (
              <select
                value={selectedCity || ""}
                onChange={(e) => {
                  setCity(e.target.value || null);
                  setComplex(null); // Reset complex when city changes
                }}
                className="bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 hover:border-red-500/50 transition-colors focus:outline-none focus:border-red-500 cursor-pointer hidden md:block"
              >
                <option value="">Todas as cidades</option>
                {cities.map((city) => (
                  <option key={city} value={city!}>
                    {city}
                  </option>
                ))}
              </select>
            )}

            {/* Seletor de Complexo */}
            {filteredComplexes.length > 0 && (
              <select
                value={selectedComplexId || ""}
                onChange={(e) => setComplex(e.target.value || null)}
                className="bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 hover:border-red-500/50 transition-colors focus:outline-none focus:border-red-500 cursor-pointer min-w-[200px] hidden md:block"
              >
                <option value="">Todos os cinemas</option>
                {filteredComplexes.map((complex) => (
                  <option key={complex.id} value={complex.id}>
                    {complex.name}
                    {complex.city && ` - ${complex.city}`}
                  </option>
                ))}
              </select>
            )}

            <div className="h-8 w-px bg-zinc-700 hidden md:block" />

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push(`/${tenantSlug}/profile`)}
                  className="text-right hidden sm:block hover:opacity-80 transition-opacity"
                >
                  <div className="text-sm font-medium text-white">
                    {user?.name}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {user?.loyalty_level} • {user?.accumulated_points} pts
                  </div>
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 rounded-lg border border-zinc-700 hover:border-red-500/50 transition-all duration-200 text-sm"
                >
                  Sair
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(`/${tenantSlug}/auth/login`)}
                  className="px-4 py-2 text-zinc-300 hover:text-white font-medium transition-colors text-sm"
                >
                  Entrar
                </button>
                <button
                  onClick={() => router.push(`/${tenantSlug}/auth/register`)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-500/20 text-sm"
                >
                  Cadastrar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
