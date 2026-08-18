import type {
  RoomLayout,
  RuleValidationResult,
  TicketSelectionState,
  TicketType,
} from "@/types/storefront";

const baseTicketTypes: TicketType[] = [
  {
    code: "inteira",
    label: "Inteira",
    description: "Ingresso padrão sem benefício legal.",
    requiresDocument: false,
    eligibility: {},
  },
  {
    code: "meia_estudante",
    label: "Meia estudante",
    description: "Exige comprovação estudantil na entrada.",
    requiresDocument: true,
    eligibility: { needsStudentProof: true },
  },
  {
    code: "meia_idoso",
    label: "Meia idoso",
    description: "Benefício legal para público idoso.",
    requiresDocument: true,
    eligibility: { minAge: 60, needsGovernmentId: true },
  },
  {
    code: "meia_pcd",
    label: "Meia PCD",
    description: "Válido para PCD com comprovação aplicável.",
    requiresDocument: true,
    eligibility: { needsPcdProof: true },
    seatConstraints: { allowedSeatKinds: ["wheelchair", "reduced_mobility", "guide_dog", "standard", "lounge", "vip_recliner"] },
  },
  {
    code: "meia_jovem_baixa_renda",
    label: "Meia jovem baixa renda",
    description: "Conforme política local de meia-entrada.",
    requiresDocument: true,
    eligibility: { needsCadUnicoProof: true },
  },
  {
    code: "crianca",
    label: "Criança",
    description: "Categoria infantil quando suportada pela sessão.",
    requiresDocument: false,
    eligibility: { maxAge: 12 },
  },
  {
    code: "senior",
    label: "Sênior",
    description: "Categoria comercial para público sênior.",
    requiresDocument: false,
    eligibility: { minAge: 60 },
  },
  {
    code: "cortesia_codigo",
    label: "Cortesia com código",
    description: "Exige código promocional/cortesia válido.",
    requiresDocument: false,
    eligibility: { needsPromoCode: true },
  },
  {
    code: "promocional_parceiro",
    label: "Promocional parceiro",
    description: "Convênio comercial (ex: banco/clube).",
    requiresDocument: true,
    eligibility: { needsPartnerProof: true },
  },
  {
    code: "acompanhante_pcd",
    label: "Acompanhante PCD",
    description: "Válido quando houver ingresso PCD correspondente.",
    requiresDocument: false,
    eligibility: {},
    seatConstraints: { allowedSeatKinds: ["companion", "standard"] },
    stackingRules: { requiresWith: ["meia_pcd"] },
  },
];

const stateFiscalRules: Record<string, { requiresCpfForYouthHalf: boolean }> = {
  PB: { requiresCpfForYouthHalf: true },
  PE: { requiresCpfForYouthHalf: true },
};

export const getTicketTypesForSession = (
  citySlug: string,
  cinemaId: string,
  sessionId: string,
): TicketType[] => {
  return baseTicketTypes;
};

export const getRoomLayoutForSession = (_sessionId: string): RoomLayout => {
  return {
    template: "classic_grid",
    rows: ["A", "B", "C", "D", "E", "F", "G", "H"],
    columns: 12,
    screenPosition: "top",
    aisles: [4, 8],
    blocks: [{ id: "main", fromColumn: 1, toColumn: 12 }],
  };
};

export const validateSeatAndTicketSelection = (
  _citySlug: string,
  _cinemaId: string,
  _sessionId: string,
  selection: TicketSelectionState,
  selectedSeatIds: string[],
): RuleValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendedActions: string[] = [];

  const totalTickets = Object.values(selection.tickets).reduce((sum, qty) => sum + (qty ?? 0), 0);
  if (totalTickets <= 0) {
    errors.push("Selecione ao menos um tipo de ingresso.");
    recommendedActions.push("Escolha a quantidade de ingressos no bloco de tipos.");
  }

  if (selectedSeatIds.length !== totalTickets) {
    errors.push("A quantidade de assentos deve ser igual à quantidade de ingressos.");
    recommendedActions.push("Ajuste assentos ou quantidades antes de continuar.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendedActions,
  };
};
