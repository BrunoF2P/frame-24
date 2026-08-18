const ratingTone: Record<string, string> = {
  Livre: "border-[#00a651] bg-[#00a651] text-white",
  L: "border-[#00a651] bg-[#00a651] text-white",
  "10": "border-[#0085ca] bg-[#0085ca] text-white",
  "12": "border-[#f2c230] bg-[#f2c230] text-black",
  "14": "border-[#f28c28] bg-[#f28c28] text-white",
  "16": "border-[#d93636] bg-[#d93636] text-white",
  "18": "border-black bg-black text-white",
};

export const AgeRatingBadge = ({ value }: { value: string }) => {
  const label = value === "Livre" || value === "L" ? "L" : value;
  const ariaLabel = label === "L" ? "Classificação livre" : `${label} anos`;

  return (
    <span
      aria-label={ariaLabel}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-[6px] border px-1.5 text-[11px] leading-none font-bold tabular-nums uppercase ${ratingTone[value] ?? ratingTone["12"]}`}
    >
      {label}
    </span>
  );
};
