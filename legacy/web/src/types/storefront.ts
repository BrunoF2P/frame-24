export type ThemeMode = "light" | "dark" | "system";

export type MovieStatus = "em-cartaz" | "em-breve";
export type OccupancyLevel = "low" | "medium" | "high";
export type SeatStatus = "available" | "selected" | "held" | "sold";
export type SeatKind =
  | "standard"
  | "wheelchair"
  | "companion"
  | "reduced_mobility"
  | "guide_dog"
  | "premium_motion"
  | "couple_left"
  | "couple_right"
  | "obese"
  | "vip_recliner"
  | "lounge";
export type TicketTypeCode =
  | "inteira"
  | "meia_estudante"
  | "meia_idoso"
  | "meia_pcd"
  | "meia_jovem_baixa_renda"
  | "crianca"
  | "senior"
  | "cortesia_codigo"
  | "promocional_parceiro"
  | "acompanhante_pcd";
export type RoomLayoutTemplate = "classic_grid" | "recliner" | "hybrid" | "junior_zone";

export interface City {
  id: string;
  slug: string;
  name: string;
  state: string;
  heroLabel: string;
  intro: string;
  timezone: string;
}

export interface LoyaltyState {
  tier: "Club" | "Select" | "Premiere";
  points: number;
  perks: string[];
}

export interface MovieSummary {
  id: string;
  slug: string;
  title: string;
  originalTitle: string;
  tagline: string;
  synopsis: string;
  runtimeMinutes: number;
  ageRating: string;
  genres: string[];
  formats: string[];
  exhibitionMode: "dublado" | "legendado" | "ambos";
  ancineRating: string;
  status: MovieStatus;
  recommendationScore: number;
  citySlugs: string[];
  cast: string[];
  releaseDate?: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  editorialNote: string;
}

export interface Cinema {
  id: string;
  slug: string;
  name: string;
  network: string;
  citySlug: string;
  neighborhood: string;
  address: string;
  features: string[];
  formats: string[];
  accessibility: string[];
  loyaltyBlurb: string;
}

export interface SeatNode {
  id: string;
  label: string;
  row: string;
  number: number;
  status: SeatStatus;
  seatKind: SeatKind;
  tags?: string[];
  isAccessible?: boolean;
  isCompanionOnly?: boolean;
  pricingZone?: "standard" | "premium" | "vip";
  premium?: boolean;
}

export interface RoomLayout {
  template: RoomLayoutTemplate;
  rows: string[];
  columns: number;
  screenPosition: "top" | "bottom";
  aisles: number[];
  blocks: Array<{ id: string; fromColumn: number; toColumn: number }>;
  accessibilityZones?: Array<{
    kind: "wheelchair" | "companion" | "reduced_mobility" | "guide_dog";
    seats: string[];
  }>;
}

export interface EligibilityRequirement {
  minAge?: number;
  maxAge?: number;
  needsStudentProof?: boolean;
  needsGovernmentId?: boolean;
  needsPcdProof?: boolean;
  needsCadUnicoProof?: boolean;
  needsPartnerProof?: boolean;
  needsPromoCode?: boolean;
}

export interface TicketType {
  code: TicketTypeCode;
  label: string;
  description: string;
  requiresDocument: boolean;
  eligibility: EligibilityRequirement;
  seatConstraints?: {
    allowedSeatKinds?: SeatKind[];
    blockedSeatKinds?: SeatKind[];
  };
  stackingRules?: {
    maxPerOrder?: number;
    requiresWith?: TicketTypeCode[];
    cannotCombineWith?: TicketTypeCode[];
  };
}

export interface TicketSelectionState {
  tickets: Partial<Record<TicketTypeCode, number>>;
  promoCode?: string;
  fiscalCpf?: string;
}

export interface RuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendedActions: string[];
}

export interface SessionGroup {
  id: string;
  citySlug: string;
  movieId: string;
  cinemaId: string;
  date: string;
  time: string;
  room: string;
  language: string;
  subtitle: string;
  format: string;
  occupancy: OccupancyLevel;
  priceFrom: number;
  seats: SeatNode[];
  roomLayout?: RoomLayout;
}

export interface ConcessionProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl?: string | null;
}

export interface CheckoutSummary {
  id: string;
  sessionId: string;
  citySlug: string;
  seatIds: string[];
  products: Array<{ id: string; quantity: number }>;
}

export interface DigitalTicket {
  orderId: string;
  qrCode: string;
  walletUrl: string;
  barcode: string;
}

export interface MovieSessionStats {
  sessionCount: number;
  priceFrom: number;
  nextSessionLabel?: string;
  exhibitionLabel?: string;
}

export interface PurchaseHistoryItem {
  id: string;
  movieTitle: string;
  cityName: string;
  cinemaName: string;
  showtimeLabel: string;
  amount: number;
  status: "active" | "used" | "refundable";
}

export interface SearchItem {
  id: string;
  type: "movie" | "cinema" | "city";
  title: string;
  subtitle: string;
  href: string;
}
