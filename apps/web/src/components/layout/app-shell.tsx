import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const AppShell = ({
  children,
  citySlug,
}: {
  children: ReactNode;
  citySlug?: string;
}) => (
  <>
    <AppHeader citySlug={citySlug} />
    <main className="min-h-screen">{children}</main>
    <SiteFooter />
  </>
);
