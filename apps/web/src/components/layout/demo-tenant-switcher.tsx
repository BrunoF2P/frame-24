"use client";

import { useMemo } from "react";
import { useCompanies } from "@/hooks/use-companies";
import {
  getTenantSlugFromHost,
  getTenantSlugFromPathname,
  normalizeHost,
} from "@/lib/tenant-routing";

type PublicCompany = {
  id?: string;
  tenant_slug?: string;
  trade_name?: string | null;
  corporate_name?: string | null;
  website?: string | null;
};

const isEnabled = () =>
  process.env.NEXT_PUBLIC_ENABLE_TENANT_SWITCHER === "true" ||
  process.env.NODE_ENV !== "production";

const buildTenantHref = (tenantSlug: string) => {
  if (typeof window === "undefined") {
    return `/${tenantSlug}`;
  }

  const currentHost = normalizeHost(window.location.host);
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : "";
  const baseDomain = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "")
    .split(",")
    .map(normalizeHost)
    .find(Boolean);

  const suffixes = [
    ...(baseDomain ? [baseDomain] : []),
    "lvh.me",
    "localhost",
  ];
  const suffix = suffixes.find(
    (domain) => currentHost.endsWith(`.${domain}`) || currentHost === domain,
  );

  if (suffix && currentHost !== suffix) {
    return `${protocol}//${tenantSlug}.${suffix}${port}/`;
  }

  return `/${tenantSlug}`;
};

export function DemoTenantSwitcher() {
  const { data } = useCompanies();
  const companies = Array.isArray(data) ? (data as PublicCompany[]) : [];
  const currentTenant = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return (
      getTenantSlugFromHost(window.location.host) ??
      getTenantSlugFromPathname(window.location.pathname)
    );
  }, []);

  if (!isEnabled() || companies.length < 2) {
    return null;
  }

  return (
    <label className="hidden items-center gap-2 text-xs text-foreground-muted lg:flex">
      <span>Empresa</span>
      <select
        aria-label="Trocar empresa"
        className="h-9 rounded-[var(--radius-sm)] border border-border bg-background px-2 text-sm text-foreground"
        value={currentTenant ?? ""}
        onChange={(event) => {
          const tenantSlug = event.target.value;
          if (tenantSlug) {
            window.location.href = buildTenantHref(tenantSlug);
          }
        }}
      >
        {companies.map((company) => {
          const slug = company.tenant_slug ?? "";
          return (
            <option key={company.id ?? slug} value={slug}>
              {company.trade_name ?? company.corporate_name ?? slug}
            </option>
          );
        })}
      </select>
    </label>
  );
}
