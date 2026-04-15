import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

type DateChip = {
  iso: string;
  label: string;
  isActive: boolean;
};

export const QuickFilterChips = ({
  citySlug,
  dateChips,
}: {
  citySlug: string;
  dateChips?: DateChip[];
}) => {
  const sections = [
    { label: "Em cartaz", href: `/cidade/${citySlug}#em-cartaz`, icon: "film" as const },
    { label: "Pré-estreias", href: `/cidade/${citySlug}#pre-estreias`, icon: "calendar" as const },
    { label: "Cinemas", href: `/cidade/${citySlug}#cinemas`, icon: "building" as const },
  ];

  return (
    <nav aria-label="Atalhos rápidos da cidade">
      {dateChips && dateChips.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Datas disponíveis para sessões">
          {dateChips.map((chip) => (
            <li key={chip.iso}>
              <Link href={`/cidade/${citySlug}?date=${chip.iso}#sessoes-hoje`}>
                <Badge
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm normal-case tracking-normal"
                  variant={chip.isActive ? "accent" : "neutral"}
                >
                  <Icon name={chip.isActive ? "clock" : "calendar"} size="xs" />
                  {chip.label}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="mt-2 flex flex-wrap gap-2" aria-label="Navegação rápida da cidade">
        {sections.map((section) => (
          <li key={section.label}>
            <Link href={section.href}>
              <Badge className="inline-flex items-center gap-2 px-3 py-2 text-sm normal-case tracking-normal" variant="neutral">
                <Icon name={section.icon} size="xs" />
                {section.label}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
