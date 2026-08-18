import axios, { type AxiosError } from 'axios';
import { getTenantSlugFromHost, getTenantSlugFromPathname } from '@/lib/tenant-routing';

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 500;

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504, 408, 429]);

function isRetryable(error: AxiosError): boolean {
  if (error.code === 'ERR_CANCELED') return false;
  if (!error.response) return true; // Network error
  return RETRYABLE_STATUS_CODES.has(error.response.status);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const apiInstance = axios.create({
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  withCredentials: true,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiInstance.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  const tenantSlug =
    getTenantSlugFromHost(window.location.host) ??
    getTenantSlugFromPathname(window.location.pathname);
  if (!tenantSlug) {
    return config;
  }

  config.headers = config.headers ?? {};
  if (!('x-tenant-slug' in config.headers)) {
    config.headers['x-tenant-slug'] = tenantSlug;
  }

  return config;
});

// Retry interceptor for transient failures (5xx, network errors)
apiInstance.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config;
  if (!config) return Promise.reject(error);

  const configRecord = config as unknown as Record<string, unknown>;
  const retryCount = (configRecord.__retryCount as number) ?? 0;

  if (retryCount >= MAX_RETRIES || !isRetryable(error)) {
    return Promise.reject(error);
  }

  configRecord.__retryCount = retryCount + 1;

  // Exponential backoff with jitter
  const backoff = RETRY_DELAY_BASE_MS * Math.pow(2, retryCount) + Math.random() * 200;
  await delay(backoff);

  return apiInstance(config);
});

// 401 interceptor — handle session expiration
apiInstance.interceptors.response.use(undefined, (error: AxiosError) => {
  if (
    error.response?.status === 401 &&
    typeof window !== 'undefined' &&
    !error.config?.url?.includes('/api/auth')
  ) {
    // Redirect to login on session expiration
    const currentPath = window.location.pathname;
    if (!currentPath.includes('/login') && !currentPath.includes('/cadastro')) {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  }
  return Promise.reject(error);
});

type ApiResponse<T = unknown> = { data: T };
type ApiObject = Record<string, unknown>;
type ApiList = unknown[];

type TenantParams = {
  tenantSlug: string;
};

export const publicApi = {
  publicControllerGetCompaniesV1: (): Promise<ApiResponse<ApiList>> =>
    apiInstance.get('/v1/public/companies'),

  publicControllerGetCompanyBySlugV1: ({
    tenantSlug,
  }: TenantParams): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}`),

  publicControllerGetComplexesV1: ({ tenantSlug }: TenantParams): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/complexes`),

  publicControllerGetMoviesV1: ({ tenantSlug }: TenantParams): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/movies`),

  publicControllerGetShowtimesV1: ({
    tenantSlug,
    complexId,
    movieId,
    date,
  }: TenantParams & {
    complexId?: string;
    movieId?: string;
    date?: string;
  }): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/showtimes`, {
      params: {
        complex_id: complexId,
        movie_id: movieId,
        date,
      },
    }),

  publicControllerGetSeatsMapV1: ({ id }: { id: string }): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/public/showtimes/${id}/seats`),

  publicControllerGetProductsV1: ({
    tenantSlug,
    complexId,
  }: TenantParams & {
    complexId?: string;
  }): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/products`, {
      params: {
        complex_id: complexId,
      },
    }),

  publicControllerGetStorefrontV1: ({
    tenantSlug,
    citySlug,
    date,
    includeShowtimes,
  }: TenantParams & {
    citySlug?: string;
    date?: string;
    includeShowtimes?: boolean;
  }): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/storefront`, {
      params: {
        city_slug: citySlug,
        date,
        include_showtimes: includeShowtimes ? 'true' : undefined,
      },
    }),

  publicControllerGetCitiesV1: ({ tenantSlug }: TenantParams): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/cities`),

  publicControllerGetCinemasByCityV1: ({
    tenantSlug,
    citySlug,
  }: TenantParams & {
    citySlug: string;
  }): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/cities/${citySlug}/cinemas`),

  publicControllerGetMoviesByCityV1: ({
    tenantSlug,
    citySlug,
    status,
    date,
  }: TenantParams & {
    citySlug: string;
    status?: string;
    date?: string;
  }): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/cities/${citySlug}/movies`, {
      params: { status, date },
    }),

  publicControllerGetMovieBySlugForCityV1: ({
    tenantSlug,
    citySlug,
    movieSlug,
  }: TenantParams & {
    citySlug: string;
    movieSlug: string;
  }): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/cities/${citySlug}/movies/${movieSlug}`),

  publicControllerGetShowtimesForMovieSlugV1: ({
    tenantSlug,
    citySlug,
    movieSlug,
    date,
    format,
    language,
    cinemaId,
  }: TenantParams & {
    citySlug: string;
    movieSlug: string;
    date?: string;
    format?: string;
    language?: string;
    cinemaId?: string;
  }): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(
      `/v1/public/companies/${tenantSlug}/cities/${citySlug}/movies/${movieSlug}/showtimes`,
      {
        params: {
          date,
          format,
          language,
          cinema_id: cinemaId,
        },
      },
    ),

  publicControllerSearchTenantStorefrontV1: ({
    tenantSlug,
    query,
    citySlug,
    signal,
  }: TenantParams & {
    query: string;
    citySlug?: string;
    signal?: AbortSignal;
  }): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/search`, {
      params: { q: query, city_slug: citySlug },
      signal,
    }),

  publicControllerGetTicketTypesV1: ({ tenantSlug }: TenantParams): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/ticket-types`),

  publicControllerGetPaymentMethodsV1: ({
    tenantSlug,
  }: TenantParams): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/payment-methods`),

  publicControllerGetSaleDetailsV1: ({
    tenantSlug,
    reference,
  }: TenantParams & {
    reference: string;
  }): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/sales/${reference}`),
};

export const customerApi = {
  customerProfileGetV1: (): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get('/v1/customer/profile'),

  customerProfileUpdateV1: (payload: ApiObject): Promise<ApiResponse<ApiObject>> =>
    apiInstance.put('/v1/customer/profile', payload),

  customerProfileRequestEmailChangeV1: (payload: {
    new_email: string;
  }): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post('/v1/customer/profile/email-change/request', payload),

  customerProfileConfirmEmailChangeV1: (payload: {
    request_id: string;
    token: string;
  }): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post('/v1/customer/profile/email-change/confirm', payload),

  customerOrdersFindAllV1: (): Promise<ApiResponse<ApiList>> =>
    apiInstance.get('/v1/customer/orders'),

  customerOrdersFindOneV1: (orderId: string): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/customer/orders/${orderId}`),

  customerRefundRequestCreateV1: (
    orderId: string,
    payload: {
      reason?: string;
      items: Array<{
        item_type: 'ticket' | 'concession';
        item_id: string;
        quantity?: number;
      }>;
    },
  ): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post(`/v1/customer/orders/${orderId}/refund-requests`, payload),

  customerRefundRequestsFindAllV1: (): Promise<ApiResponse<ApiList>> =>
    apiInstance.get('/v1/customer/refund-requests'),

  customerRefundRequestsFindOneV1: (requestId: string): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/customer/refund-requests/${requestId}`),

  customerTicketsFindAllV1: (): Promise<ApiResponse<ApiList>> =>
    apiInstance.get('/v1/customer/tickets'),

  customerTicketsFindOneV1: (ticketId: string): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/customer/tickets/${ticketId}`),

  customerTicketDownloadPdfUrl: (ticketId: string): string =>
    `${String(apiInstance.defaults.baseURL || 'http://localhost:4000').replace(/\/v1\/?$/, '')}/v1/customer/tickets/${ticketId}/pdf`,

  customerTicketResendEmailV1: (ticketId: string): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post(`/v1/customer/tickets/${ticketId}/resend-email`),

  customerSecuritySessionsFindAllV1: (): Promise<ApiResponse<ApiList>> =>
    apiInstance.get('/v1/customer/security/sessions'),

  customerSecuritySessionsDeleteV1: (sessionId: string): Promise<ApiResponse<void>> =>
    apiInstance.delete(`/v1/customer/security/sessions/${sessionId}`),

  customerSecuritySessionsRevokeOthersV1: (payload?: {
    keep_session_id?: string;
  }): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post('/v1/customer/security/sessions/revoke-others', payload || {}),

  customerPrivacyExportV1: (payload?: { format?: 'json' }): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post('/v1/customer/privacy/export', payload || {}),

  customerPrivacyDeleteRequestV1: (payload: {
    reason?: string;
    confirm_phrase: string;
  }): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post('/v1/customer/privacy/delete-request', payload),

  customerCheckoutCreateV1: (
    tenantSlug: string,
    payload: ApiObject,
  ): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post('/v1/customer/checkout-sessions', payload, {
      headers: { 'x-tenant-slug': tenantSlug },
    }),

  customerCheckoutFindOneV1: (
    tenantSlug: string,
    checkoutId: string,
  ): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/customer/checkout-sessions/${checkoutId}`, {
      headers: { 'x-tenant-slug': tenantSlug },
    }),

  customerCheckoutUpdateV1: (
    tenantSlug: string,
    checkoutId: string,
    payload: ApiObject,
  ): Promise<ApiResponse<ApiObject>> =>
    apiInstance.patch(`/v1/customer/checkout-sessions/${checkoutId}`, payload, {
      headers: { 'x-tenant-slug': tenantSlug },
    }),

  customerCheckoutCreatePaymentAttemptV1: (
    tenantSlug: string,
    checkoutId: string,
    payload: ApiObject,
    idempotencyKey?: string,
  ): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post(`/v1/customer/checkout-sessions/${checkoutId}/payment-attempts`, payload, {
      headers: {
        'x-tenant-slug': tenantSlug,
        ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
      },
    }),

  customerCheckoutPaymentStatusV1: (
    tenantSlug: string,
    checkoutId: string,
  ): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/customer/checkout-sessions/${checkoutId}/payment-status`, {
      headers: { 'x-tenant-slug': tenantSlug },
    }),

  paymentSimulatePaid: (
    provider: string,
    payload: { provider_reference: string; external_event_id?: string },
  ): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post(`/v1/payments/webhooks/${provider}`, {
      status: 'paid',
      provider_reference: payload.provider_reference,
      external_event_id: payload.external_event_id ?? `simulate-${Date.now()}`,
      payment_data: { simulated: true },
    }),
};

export const customerAuthApi = {
  post: apiInstance.post.bind(apiInstance),
};

export const authApi = {
  post: apiInstance.post.bind(apiInstance),
};

export const posApi = {
  posSessionsFindAllV1: (params?: {
    status?: string;
    cinema_complex_id?: string;
  }): Promise<ApiResponse<ApiList>> => apiInstance.get('/v1/pos-sessions', { params }),

  posSessionsFindOneV1: (id: string): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/pos-sessions/${id}`),

  posSessionsCreateV1: (payload: {
    cinema_complex_id: string;
    opening_amount: number;
  }): Promise<ApiResponse<ApiObject>> => apiInstance.post('/v1/pos-sessions', payload),

  posSessionsUpdateV1: (
    id: string,
    payload: {
      status?: string;
      cash_withdrawn?: number;
      cash_counted?: number;
      closing_notes?: string;
    },
  ): Promise<ApiResponse<ApiObject>> => apiInstance.put(`/v1/pos-sessions/${id}`, payload),

  posSessionStatusesV1: (): Promise<ApiResponse<ApiList>> =>
    apiInstance.get('/v1/pos-sessions/statuses'),

  posTransactionsCreateV1: (payload: {
    pos_session_id: string;
    transaction_type: string;
    payment_method: string;
    amount: number;
    change_amount?: number;
    description?: string;
    reference_type?: string;
    reference_id?: string;
  }): Promise<ApiResponse<ApiObject>> => apiInstance.post('/v1/pos-transactions', payload),

  posTransactionsFindBySessionV1: (posSessionId: string): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/pos-transactions/session/${posSessionId}`),

  posPaymentMethodsV1: (): Promise<ApiResponse<ApiList>> =>
    apiInstance.get('/v1/pos-payment-methods'),

  showtimesFindAllV1: (params?: {
    cinema_complex_id?: string;
    movie_id?: string;
    date?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ApiList>> => apiInstance.get('/v1/showtimes', { params }),

  showtimesFindOneV1: (id: string): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/showtimes/${id}`),

  showtimesSeatsV1: (id: string): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/showtimes/${id}/seats`),

  ticketTypesFindAllV1: (): Promise<ApiResponse<ApiList>> => apiInstance.get('/v1/ticket-types'),

  productsFindAllV1: (params?: { active?: boolean }): Promise<ApiResponse<ApiList>> =>
    apiInstance.get('/v1/products', { params }),

  salesCreateV1: (payload: ApiObject): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post('/v1/sales', payload),

  complexesFindAllV1: (): Promise<ApiResponse<ApiList>> => apiInstance.get('/v1/cinema-complexes'),

  saleTypesFindAllV1: (): Promise<ApiResponse<ApiList>> => apiInstance.get('/v1/sale-types'),

  salesPaymentMethodsV1: (tenantSlug: string): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/payment-methods`),
};

export const resolveCustomerProfile = async (tenantSlug?: string | null) => {
  const response = await apiInstance.get('/v1/customer/profile/resolve', {
    headers: tenantSlug
      ? {
          'x-tenant-slug': tenantSlug,
        }
      : undefined,
  });
  const data = response.data as { profile?: unknown } | null | undefined;

  if (data && typeof data === 'object' && 'profile' in data) {
    return data.profile ?? null;
  }

  return data ?? null;
};

// Helper para extrair dados da resposta
export const unwrapResponse = <T>(response: { data: T }): T => response.data;
