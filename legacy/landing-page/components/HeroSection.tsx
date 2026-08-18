import Link from "next/link";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden pt-24 pb-32 bg-[var(--background)] border-b border-[var(--border)]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-accent-red/10 rounded-full blur-[100px] animate-spotlight" />
        <div className="absolute bottom-10 right-[15%] w-80 h-80 bg-accent-gold/8 rounded-full blur-[120px] animate-spotlight" style={{ animationDelay: "2s" }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-center">
          <div className="lg:col-span-6 xl:col-span-5 text-center lg:text-left space-y-8">
            <div className="inline-flex items-center space-x-2 bg-accent-red/10 px-4 py-2 rounded-full border border-accent-red/30 animate-fade-in-up">
              <span className="text-accent-red font-semibold text-sm tracking-wide">
                GESTAO PARA CINEMAS
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight text-gray-100 animate-fade-in-up animate-fade-in-up-1">
              Domine a Gestao do Seu{" "}
              <span className="cinema-gradient-text">Cinema</span>
            </h1>

            <h2 className="text-2xl font-semibold text-accent-gold tracking-tight animate-fade-in-up animate-fade-in-up-2">
              Redefina eficiencia. Amplie margens. Simplifique operacoes.
            </h2>

            <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 animate-fade-in-up animate-fade-in-up-3">
              Uma plataforma unica para controle total de bilheteria, estoque,
              programacao e relatorios financeiros — com painel analitico
              em tempo real.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-4 animate-fade-in-up animate-fade-in-up-4">
              <Link
                href="/register-tenant"
                className="px-8 py-3 rounded-full font-semibold text-white
                bg-gradient-to-r from-accent-red to-accent-red-hover
                hover:shadow-lg hover:shadow-accent-red/30
                transform hover:scale-105
                transition-all duration-300"
              >
                Solicitar Demonstracao
              </Link>

              <Link
                href="#planos"
                className="px-8 py-3 rounded-full font-semibold text-gray-100
                border-2 border-gray-600 hover:border-accent-gold
                hover:text-accent-gold transition-all duration-300
                transform hover:scale-105"
              >
                Consultar Planos
              </Link>
            </div>
          </div>

          <div className="mt-20 lg:mt-0 lg:col-span-6 xl:col-span-7 flex justify-center lg:justify-end relative animate-fade-in-up animate-fade-in-up-5">
            <div className="absolute inset-x-1/4 top-1/4 h-2/3 -z-10 bg-accent-red/15 rounded-full blur-3xl opacity-60 animate-pulse-glow" />

            <div className="relative w-full max-w-2xl h-[520px] lg:h-[620px]">
              <div className="absolute top-0 left-0 w-3/4 transform -rotate-6 shadow-2xl shadow-accent-red/20 hover:rotate-0 transition-transform duration-700 cinema-card rounded-xl border border-[var(--border)]">
                <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden p-6 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-4xl block mb-3">📊</span>
                    <span className="text-sm text-gray-400 font-medium">
                      Painel de Indicadores em Tempo Real
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute top-1/3 right-0 w-1/3 transform rotate-12 scale-95 shadow-2xl shadow-accent-gold/15 hover:rotate-0 transition-transform duration-700 delay-100 cinema-card rounded-lg border border-[var(--border)]">
                <div className="aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden p-4 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-3xl block mb-2">🎬</span>
                    <span className="text-xs text-gray-400 font-medium">
                      Programacao de Sessoes
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 right-1/4 w-1/4 transform scale-110 shadow-2xl shadow-accent-red/30 hover:scale-125 transition-transform duration-700 delay-200 cinema-card rounded-2xl border-2 border-[var(--border)]">
                <div className="aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden p-3 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-2xl block mb-1">🎫</span>
                    <span className="text-xs text-gray-400 font-medium">
                      Vendas e Check-in
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
