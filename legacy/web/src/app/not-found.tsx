import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/catalog";

export default function NotFound() {
  return (
    <AppShell>
      <main className="page-shell flex min-h-[70vh] items-center py-10">
        <section className="max-w-xl space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-accent-red-300">{copy("stateNotFoundEyebrow")}</p>
          <h1 className="text-4xl font-semibold text-foreground">{copy("stateNotFoundTitle")}</h1>
          <p className="text-sm text-foreground-muted">{copy("stateNotFoundDescription")}</p>
          <Button asChild size="sm">
            <Link href="/">{copy("stateNotFoundHome")}</Link>
          </Button>
        </section>
      </main>
    </AppShell>
  );
}
