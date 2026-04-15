import { cinemas, cities, sessions } from "@/lib/storefront/data";
import type {
  RoomLayout,
  RuleValidationResult,
  SeatNode,
  TicketSelectionState,
  TicketType,
  TicketTypeCode,
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

const toQty = (selection: TicketSelectionState, code: TicketTypeCode) =>
  Math.max(0, selection.tickets[code] ?? 0);

export const getTicketTypesForSession = (
  citySlug: string,
  cinemaId: string,
  sessionId: string,
): TicketType[] => {
  const city = cities.find((item) => item.slug === citySlug);
  const session = sessions.find((item) => item.id === sessionId);
  const cinema = cinemas.find((item) => item.id === cinemaId);

  if (!city || !session || !cinema) {
    return baseTicketTypes;
  }

  const isPremiumRoom = ["VIP", "IMAX", "4DX"].some((format) =>
    session.format.toUpperCase().includes(format),
  );

  return baseTicketTypes.filter((type) => {
    if (type.code === "crianca" && isPremiumRoom) {
      return true;
    }
    if (type.code === "promocional_parceiro" && cinema.network === "Independente") {
      return false;
    }
    return true;
  });
};

export const getRoomLayoutForSession = (sessionId: string): RoomLayout => {
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) {
    return {
      template: "classic_grid",
      rows: ["A", "B", "C", "D", "E", "F", "G", "H"],
      columns: 12,
      screenPosition: "top",
      aisles: [4, 8],
      blocks: [{ id: "main", fromColumn: 1, toColumn: 12 }],
    };
  }

  const template = session.format.toUpperCase().includes("VIP")
    ? "recliner"
    : session.format.toUpperCase().includes("4DX")
      ? "hybrid"
      : "classic_grid";

  const seatIdsByKind = (kind: SeatNode["seatKind"]) =>
    session.seats.filter((seat) => seat.seatKind === kind).map((seat) => seat.id);

  return {
    template,
    rows: ["A", "B", "C", "D", "E", "F", "G", "H"],
    columns: 12,
    screenPosition: "top",
    aisles: [4, 8],
    blocks: [
      { id: "left", fromColumn: 1, toColumn: 4 },
      { id: "center", fromColumn: 5, toColumn: 8 },
      { id: "right", fromColumn: 9, toColumn: 12 },
    ],
    accessibilityZones: [
      { kind: "wheelchair", seats: seatIdsByKind("wheelchair") },
      { kind: "companion", seats: seatIdsByKind("companion") },
      { kind: "reduced_mobility", seats: seatIdsByKind("reduced_mobility") },
      { kind: "guide_dog", seats: seatIdsByKind("guide_dog") },
    ],
  };
};

export const validateSeatAndTicketSelection = (
  citySlug: string,
  cinemaId: string,
  sessionId: string,
  selection: TicketSelectionState,
  selectedSeatIds: string[],
): RuleValidationResult => {
  const city = cities.find((item) => item.slug === citySlug);
  const session = sessions.find((item) => item.id === sessionId && item.cinemaId === cinemaId);
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendedActions: string[] = [];

  if (!city || !session) {
    return {
      isValid: false,
      errors: ["Sessão inválida para validação de regras."],
      warnings,
      recommendedActions: ["Recarregue a página e selecione a sessão novamente."],
    };
  }

  const totalTickets = Object.values(selection.tickets).reduce((sum, qty) => sum + (qty ?? 0), 0);
  if (totalTickets <= 0) {
    errors.push("Selecione ao menos um tipo de ingresso.");
    recommendedActions.push("Escolha a quantidade de ingressos no bloco de tipos.");
  }

  if (selectedSeatIds.length !== totalTickets) {
    errors.push("A quantidade de assentos deve ser igual à quantidade de ingressos.");
    recommendedActions.push("Ajuste assentos ou quantidades antes de continuar.");
  }

  const seatMap = new Map(session.seats.map((seat) => [seat.id, seat] as const));
  const selectedSeats = selectedSeatIds
    .map((seatId) => seatMap.get(seatId))
    .filter((seat): seat is SeatNode => Boolean(seat));

  const wheelchairSeats = selectedSeats.filter((seat) => seat.seatKind === "wheelchair").length;
  const companionSeats = selectedSeats.filter((seat) => seat.seatKind === "companion").length;

  const pcdQty = toQty(selection, "meia_pcd");
  const companionQty = toQty(selection, "acompanhante_pcd");
  const courtesyQty = toQty(selection, "cortesia_codigo");
  const youthHalfQty = toQty(selection, "meia_jovem_baixa_renda");

  if (wheelchairSeats > 0 && pcdQty === 0) {
    errors.push("Assento PCD exige ao menos um ingresso de meia PCD.");
    recommendedActions.push("Adicione ingresso meia PCD ou troque o assento selecionado.");
  }

  if (companionSeats > companionQty) {
    errors.push("Assentos de acompanhante exigem ingressos de acompanhante PCD.");
    recommendedActions.push("Aumente acompanhante PCD ou escolha assentos padrão.");
  }

  if (companionQty > pcdQty) {
    errors.push("Ingresso acompanhante PCD não pode exceder a quantidade de meia PCD.");
    recommendedActions.push("Ajuste as quantidades de meia PCD e acompanhante.");
  }

  if (courtesyQty > 0 && !selection.promoCode?.trim()) {
    errors.push("Ingresso de cortesia exige código válido.");
    recommendedActions.push("Informe o código de cortesia no bloco de ingressos.");
  }

  const fiscalRule = stateFiscalRules[city.state];
  if (fiscalRule?.requiresCpfForYouthHalf && youthHalfQty > 0) {
    const cpfDigits = (selection.fiscalCpf ?? "").replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      errors.push("CPF é obrigatório para meia jovem baixa renda nesta localidade.");
      recommendedActions.push("Informe CPF válido para seguir com esta categoria.");
    }
  }

  if (selectedSeats.some((seat) => seat.status === "held")) {
    warnings.push("Alguns assentos estão em hold e podem expirar.");
  }

  if (selectedSeats.some((seat) => seat.status === "sold")) {
    errors.push("Há assento já indisponível na seleção.");
    recommendedActions.push("Remova o assento indisponível para continuar.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendedActions,
  };
};
