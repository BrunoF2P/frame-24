import Link from "next/link";
import { copy } from "@/lib/copy/catalog";

export const SiteFooter = () => (
  <footer className="border-t border-border/60 py-4 md:py-5">
    <div className="page-shell flex flex-col gap-3 text-xs text-foreground-muted md:flex-row md:items-center md:justify-between">
      <div className="max-w-[30rem] space-y-1">
        <p className="font-display text-base text-foreground">{copy("brandName")}</p>
        <p>
          {copy("footerDescription")}
        </p>
      </div>
      <nav aria-label="Links do rodapé">
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <li>
            <Link href="/perfil">{copy("footerProfileLink")}</Link>
          </li>
          <li>
            <Link href="/busca">{copy("footerSearchLink")}</Link>
          </li>
          <li>
            <Link href="/cidade/salvador">{copy("footerExplorePrefix")} Salvador</Link>
          </li>
        </ul>
      </nav>
    </div>
  </footer>
);
