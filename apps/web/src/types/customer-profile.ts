export interface LinkedCompany {
  company_id: string;
  tenant_slug: string | null;
  company_name: string | null;
  loyalty_level: string | null;
  accumulated_points: number | null;
}

export interface CustomerProfileFull {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  zip_code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  accepts_email: boolean | null;
  accepts_sms: boolean | null;
  accepts_marketing: boolean | null;
  loyalty_level: string | null;
  accumulated_points: number | null;
  company_id: string;
  tenant_slug?: string;
  linked_companies: LinkedCompany[];
}

export interface OrderRefundEligibility {
  eligible: boolean;
  reason: string | null;
}

export interface OrderItem {
  id: string;
  item_type: "ticket" | "concession";
  reference_id: string;
  label: string;
  quantity: number;
  unit_amount: string;
  total_amount: string;
  metadata?: Record<string, unknown>;
  refund_eligibility: OrderRefundEligibility;
}

export interface CustomerOrder {
  id: string;
  sale_number: string;
  sale_date: string;
  status: string | null;
  payment_method: string | null;
  total_amount: string;
  discount_amount: string;
  net_amount: string;
  cinema_complex_id: string;
  order_items: OrderItem[];
  showtime: {
    id: string;
    start_time: string;
    cinema: string;
    room: string | null;
  } | null;
  movie: {
    id: string;
    title: string;
    poster_url: string | null;
    age_rating: string | null;
  } | null;
  can_request_refund: boolean;
}

export interface RefundRequest {
  request_id: string;
  status: "requested" | "under_review" | "approved" | "rejected" | "processed";
  order_id: string;
  reason: string | null;
  items: Array<{
    item_type: "ticket" | "concession";
    item_id: string;
    quantity?: number;
    requested_quantity?: number;
    eligibility?: OrderRefundEligibility;
  }>;
  requested_at: string;
  created_at: string;
}

export interface TicketDetails {
  id: string;
  ticket_number: string;
  seat: string | null;
  face_value: string;
  service_fee: string;
  total_amount: string;
  used: boolean;
  usage_date?: string;
  sale: {
    id: string;
    sale_number: string;
    sale_date: string;
    cinema_complex_id: string;
  };
}

export interface ActiveSessionDevice {
  id: string;
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_label: string;
  last_activity: string | null;
  expires_at: string;
  is_current: boolean;
}

export interface PrivacyRequestStatus {
  request_id: string;
  status: "requested";
  format?: "json";
}
