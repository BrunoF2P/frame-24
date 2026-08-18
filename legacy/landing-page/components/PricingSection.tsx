import Link from "next/link";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Essencial",
    price: "R$ 499",
    perks: "Por cinema/mes",
    description:
      "Ideal para cinemas independentes e redes pequenas que precisam de estabilidade.",
    features: [
      "Vendas de Ingressos (Ate 2 caixas)",
      "Gestao de Estoque da Bomboniere",
      "Relatorios de Vendas Basicos",
      "Suporte por Email (SLA 24h)",
      "Usuarios Ilimitados",
    ],
    isRecommended: false,
    cta: "Iniciar Teste Essencial",
  },
  {
    name: "Multiplex",
    price: "R$ 899",
    perks: "Por cinema/mes",
    description:
      "Plano completo para redes com multiplas salas. Otimizacao e controle total.",
    features: [
      "Todos os recursos Essenciais",
      "Programacao de Filmes Inteligente",
      "Painel de Indicadores em Tempo Real",
      "Gestao de Fidelidade e Promocoes",
      "Integracao Fiscal Avancada",
    ],
    isRecommended: true,
    cta: "Comecar o Multiplex PRO",
  },
  {
    name: "Enterprise",
    price: "Fale Conosco",
    perks: "Customizado",
    description:
      "Solucao customizada para grandes cadeias com requisitos complexos.",
    features: [
      "Todos os recursos Multiplex",
      "Suporte 24/7 Dedicado (SLA 1h)",
      "Integracao com Sistemas Existentes",
      "Personalizacao de Layouts",
      "Consultoria Estrategica Mensal",
    ],
    isRecommended: false,
    cta: "Solicitar Demonstracao",
  },
];

const PricingSection = () => {
  return (
    <section
      id="planos"
      className="py-28 md:py-36 bg-[var(--background)] text-white relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.08),_transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20 animate-fade-in-up">
          <h2 className="text-5xl font-extrabold tracking-tight mb-6 cinema-gradient-text">
            Planos que Evoluem com o Seu Cinema
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Flexibilidade, escalabilidade e suporte em cada etapa do
            seu crescimento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {PLANS.map((plan, index) => (
            <div
              key={plan.name}
              className={`cinema-card flex flex-col p-8 rounded-2xl border animate-fade-in-up
              ${
                plan.isRecommended
                  ? "bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-accent-red shadow-[0_0_40px_-10px_rgba(239,68,68,0.35)] scale-105"
                  : "bg-gray-900/90 border-[var(--border)] hover:border-accent-red/30"
              }`}
              style={{ animationDelay: `${0.15 + index * 0.12}s` }}
            >
              {plan.isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-bold bg-accent-red text-white rounded-full shadow-lg">
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-3xl font-bold text-white text-center">
                  {plan.name}
                </h3>
                <div className="mt-6 text-center">
                  <p className="text-5xl font-extrabold text-white">
                    {plan.price}
                  </p>
                  <p className="mt-1 text-gray-400 text-sm">{plan.perks}</p>
                </div>

                <p className="mt-6 text-gray-300 text-sm text-center leading-relaxed">
                  {plan.description}
                </p>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-accent-gold mr-2 mt-0.5" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/register-tenant"
                className={`mt-10 block w-full text-center px-4 py-3 rounded-lg font-semibold transition-all duration-200
                ${
                  plan.isRecommended
                    ? "bg-accent-red hover:bg-accent-red-hover text-white shadow-accent-red/30 shadow-lg"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center animate-fade-in-up animate-fade-in-up-3">
          <p className="text-gray-400">
            Ainda em duvida?{" "}
            <Link
              href="#contact"
              className="text-accent-gold hover:underline font-semibold ml-1"
            >
              Fale com um especialista.
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
