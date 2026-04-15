import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export const SectionHeading = ({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeadingProps) => (
  <div className={cn("space-y-3", align === "center" && "text-center")}>
    {eyebrow ? (
      <p className="text-xs uppercase tracking-[0.28em] text-accent-red-300">{eyebrow}</p>
    ) : null}
    <h2 className="text-balance text-4xl font-semibold sm:text-5xl">{title}</h2>
    {description ? (
      <p className="max-w-2xl text-sm leading-7 text-foreground-muted sm:text-base">{description}</p>
    ) : null}
  </div>
);
