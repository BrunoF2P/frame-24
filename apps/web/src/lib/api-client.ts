import axios from 'axios';

const apiInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
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
};

export const customerApi = {
  customerPurchasesControllerFindAllV1: (): Promise<ApiResponse<ApiList>> =>
    apiInstance.get('/v1/customer/purchases'),

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
