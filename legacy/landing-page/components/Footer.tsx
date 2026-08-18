import Link from "next/link";
import { ExternalLink, Globe } from "lucide-react";

const footerLinks = {
  empresa: [
    { name: "Sobre Nós", href: "/about" },
    { name: "Carreiras", href: "/careers" },
    { name: "Contato", href: "/contact" },
  ],
  produtos: [
    { name: "Funcionalidades", href: "/#features" },
    { name: "Planos e Preços", href: "/#planos" },
      { name: "Cadastro", href: "/register-tenant" },
  ],
  legal: [
    { name: "Termos de Serviço", href: "/terms" },
    { name: "Política de Privacidade", href: "/privacy" },
    { name: "Política de Cookies", href: "/cookies" },
  ],
};

export default function Footer() {
  return (
  <footer className="bg-[var(--background)] border-t border-[var(--border)] mt-20">
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-12 text-gray-300">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-2xl">🎬</span>
            <h3 className="text-2xl font-bold cinema-gradient-text tracking-tight">
              Frame24
            </h3>
          </div>
          <p className="text-sm leading-relaxed max-w-sm text-gray-400">
            A plataforma completa para gestao de cinemas — projetada para escalar com
            o futuro do entretenimento.
          </p>

            <div className="mt-6 flex items-center gap-4">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="text-gray-300 hover:text-accent-gold transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-gray-300 hover:text-accent-gold transition-colors"
              >
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* SEÇÕES DE LINKS */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-sm font-semibold text-gray-100 uppercase tracking-wider mb-4">
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </h4>
              <ul className="space-y-3">
                {links.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-300 hover:text-accent-gold transition-colors duration-150"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* RODAPÉ INFERIOR */}
        <div className="mt-12 border-t border-gray-800 pt-8 text-center">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Frame24 — Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
