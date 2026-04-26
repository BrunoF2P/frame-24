import axios from 'axios';
import {
  getTenantSlugFromHost,
  getTenantSlugFromPathname,
} from '@/lib/tenant-routing';

const apiInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  withCredentials: true,
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

  publicControllerGetCitiesV1: ({
    tenantSlug,
  }: TenantParams): Promise<ApiResponse<ApiList>> =>
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
  }: TenantParams & {
    query: string;
    citySlug?: string;
    }): Promise<ApiResponse<ApiList>> =>
    apiInstance.get(`/v1/public/companies/${tenantSlug}/search`, {
      params: { q: query, city_slug: citySlug },
    }),

  publicControllerGetTicketTypesV1: ({
    tenantSlug,
  }: TenantParams): Promise<ApiResponse<ApiList>> =>
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

  customerProfileUpdateV1: (
    payload: ApiObject,
  ): Promise<ApiResponse<ApiObject>> => apiInstance.put('/v1/customer/profile', payload),

  customerProfileRequestEmailChangeV1: (
    payload: { new_email: string },
  ): Promise<ApiResponse<ApiObject>> =>
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

  customerRefundRequestsFindOneV1: (
    requestId: string,
  ): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/customer/refund-requests/${requestId}`),

  customerTicketsFindAllV1: (): Promise<ApiResponse<ApiList>> =>
    apiInstance.get('/v1/customer/tickets'),

  customerTicketsFindOneV1: (ticketId: string): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/customer/tickets/${ticketId}`),

  customerTicketDownloadPdfUrl: (ticketId: string): string =>
    `${String(apiInstance.defaults.baseURL || 'http://localhost:4000').replace(/\/v1\/?$/, '')}/v1/customer/tickets/${ticketId}/pdf`,

  customerTicketResendEmailV1: (
    ticketId: string,
  ): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post(`/v1/customer/tickets/${ticketId}/resend-email`),

  customerSecuritySessionsFindAllV1: (): Promise<ApiResponse<ApiList>> =>
    apiInstance.get('/v1/customer/security/sessions'),

  customerSecuritySessionsDeleteV1: (
    sessionId: string,
  ): Promise<ApiResponse<void>> =>
    apiInstance.delete(`/v1/customer/security/sessions/${sessionId}`),

  customerSecuritySessionsRevokeOthersV1: (
    payload?: { keep_session_id?: string },
  ): Promise<ApiResponse<ApiObject>> =>
    apiInstance.post('/v1/customer/security/sessions/revoke-others', payload || {}),

  customerPrivacyExportV1: (
    payload?: { format?: 'json' },
  ): Promise<ApiResponse<ApiObject>> =>
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
    apiInstance.post(
      `/v1/customer/checkout-sessions/${checkoutId}/payment-attempts`,
      payload,
      {
        headers: {
          'x-tenant-slug': tenantSlug,
          ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
        },
      },
    ),

  customerCheckoutPaymentStatusV1: (
    tenantSlug: string,
    checkoutId: string,
  ): Promise<ApiResponse<ApiObject>> =>
    apiInstance.get(`/v1/customer/checkout-sessions/${checkoutId}/payment-status`, {
      headers: { 'x-tenant-slug': tenantSlug },
    }),
};

export const customerAuthApi = {
  post: apiInstance.post.bind(apiInstance),
};

export const authApi = {
  post: apiInstance.post.bind(apiInstance),
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
