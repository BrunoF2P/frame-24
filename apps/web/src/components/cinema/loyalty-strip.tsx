import type { LoyaltyState } from "@/types/storefront";
import { Icon } from "@/components/ui/icon";

export const LoyaltyStrip = ({ loyalty }: { loyalty: LoyaltyState }) => (
  <div className="rounded-[var(--radius-lg)] border border-gold-500/20 bg-gold-300/6 p-4">
    <div className="flex items-center gap-3">
      <div className="rounded-[var(--radius-md)] bg-gold-300/16 p-2.5 text-gold-300">
        <Icon name="sparkles" size="md" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-gold-300">Benefícios Premiere</p>
        <p className="text-base font-semibold text-foreground">{loyalty.points} pontos disponíveis</p>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-2 text-sm text-foreground-muted">
      {loyalty.perks.map((perk) => (
        <span key={perk} className="rounded-[var(--radius-sm)] border border-border px-3 py-1.5">
          {perk}
        </span>
      ))}
    </div>
  </div>
);
