import { Badge } from "@/components/ui/badge";

export const RefundStatusBadge = ({
  status,
}: {
  status: "requested" | "under_review" | "approved" | "rejected" | "processed";
}) => {
  const labelMap = {
    requested: "Solicitado",
    under_review: "Em análise",
    approved: "Aprovado",
    rejected: "Recusado",
    processed: "Processado",
  } as const;

  const variantMap = {
    requested: "accent",
    under_review: "neutral",
    approved: "success",
    rejected: "neutral",
    processed: "success",
  } as const;

  return (
    <Badge variant={variantMap[status] ?? "neutral"}>{labelMap[status] ?? status}</Badge>
  );
};
