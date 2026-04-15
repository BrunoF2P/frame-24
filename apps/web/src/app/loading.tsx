import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell>
      <main className="page-shell space-y-8 py-8">
        <Skeleton className="h-[420px] w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[420px]" />
          ))}
        </div>
      </main>
    </AppShell>
  );
}
