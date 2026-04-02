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
    { name: "Registro (Demo)", href: "/register-tenant" },
  ],
  legal: [
    { name: "Termos de Serviço", href: "/terms" },
    { name: "Política de Privacidade", href: "/privacy" },
    { name: "Política de Cookies", href: "/cookies" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-gray-800 mt-20">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-12 text-gray-300">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* LOGO + DESCRIÇÃO */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold text-red-500 mb-4 tracking-tight">
              Frame24
            </h3>
            <p className="text-sm leading-relaxed max-w-sm text-gray-400">
              O ERP premier para a gestão de cinema — projetado para escalar com
              o futuro do entretenimento.
            </p>

            <div className="mt-6 flex items-center gap-4">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="text-gray-300 hover:text-red-500 transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-gray-300 hover:text-red-500 transition-colors"
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
                      className="text-sm text-gray-300 hover:text-red-500 transition-colors duration-150"
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
