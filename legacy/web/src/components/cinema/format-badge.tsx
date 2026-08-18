import { Badge } from "@/components/ui/badge";

export const FormatBadge = ({ label }: { label: string }) => {
  const variant = label.includes("VIP") ? "gold" : "neutral";

  return <Badge className="tracking-[0.04em]" variant={variant}>{label}</Badge>;
};
