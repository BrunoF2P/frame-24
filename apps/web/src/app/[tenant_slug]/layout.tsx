import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";

async function ensureTenantExists(tenantSlug: string) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const response = await fetch(`${apiBase}/v1/public/companies/${tenantSlug}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      notFound();
    }
  } catch {
    notFound();
  }
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = await params;
  await ensureTenantExists(tenant_slug);

  return (
    <div className="min-h-screen bg-zinc-950">
      <AppHeader tenantSlug={tenant_slug} />
      {children}
    </div>
  );
}
