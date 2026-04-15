"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/catalog";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <AppShell>
            <main className="page-shell flex min-h-[70vh] items-center py-10">
              <div className="glass-panel max-w-xl rounded-2xl border border-border p-8">
                <p className="text-xs uppercase tracking-[0.26em] text-accent-red-300">{copy("stateErrorEyebrow")}</p>
                <h1 className="mt-3 font-display text-5xl">{copy("stateErrorTitle")}</h1>
                <p className="mt-4 text-foreground-muted">
                  {copy("stateErrorDescription")}
                </p>
                <p className="mt-3 text-sm text-foreground-muted">{error.message}</p>
                <Button className="mt-6" onClick={() => reset()} type="button">
                  {copy("stateErrorRetry")}
                </Button>
              </div>
            </main>
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
