"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerApi } from "@/lib/api-client";
import type {
  ActiveSessionDevice,
  CustomerOrder,
  CustomerProfileFull,
  PrivacyRequestStatus,
  RefundRequest,
  TicketDetails,
} from "@/types/customer-profile";

export const CUSTOMER_QUERY_KEYS = {
  profile: ["customer", "profile"] as const,
  orders: ["customer", "orders"] as const,
  order: (orderId: string) => ["customer", "orders", orderId] as const,
  tickets: ["customer", "tickets"] as const,
  ticket: (ticketId: string) => ["customer", "tickets", ticketId] as const,
  refunds: ["customer", "refunds"] as const,
  sessions: ["customer", "security", "sessions"] as const,
};

export const useCustomerProfileQuery = () =>
  useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.profile,
    queryFn: async () => {
      const response = await customerApi.customerProfileGetV1();
      return response.data as unknown as CustomerProfileFull;
    },
  });

export const useCustomerOrdersQuery = () =>
  useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.orders,
    queryFn: async () => {
      const response = await customerApi.customerOrdersFindAllV1();
      return (response.data ?? []) as CustomerOrder[];
    },
  });

export const useCustomerOrderQuery = (orderId: string) =>
  useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.order(orderId),
    queryFn: async () => {
      const response = await customerApi.customerOrdersFindOneV1(orderId);
      return response.data as unknown as CustomerOrder;
    },
    enabled: !!orderId,
  });

export const useCustomerTicketsQuery = () =>
  useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.tickets,
    queryFn: async () => {
      const response = await customerApi.customerTicketsFindAllV1();
      return (response.data ?? []) as TicketDetails[];
    },
  });

export const useCustomerTicketQuery = (ticketId: string) =>
  useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.ticket(ticketId),
    queryFn: async () => {
      const response = await customerApi.customerTicketsFindOneV1(ticketId);
      return response.data as unknown as TicketDetails;
    },
    enabled: !!ticketId,
  });

export const useCustomerRefundRequestsQuery = () =>
  useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.refunds,
    queryFn: async () => {
      const response = await customerApi.customerRefundRequestsFindAllV1();
      return (response.data ?? []) as RefundRequest[];
    },
  });

export const useCustomerSecuritySessionsQuery = () =>
  useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.sessions,
    queryFn: async () => {
      const response = await customerApi.customerSecuritySessionsFindAllV1();
      return (response.data ?? []) as ActiveSessionDevice[];
    },
  });

export const useUpdateCustomerProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<CustomerProfileFull>) =>
      customerApi.customerProfileUpdateV1(payload as Record<string, unknown>),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.profile });
    },
  });
};

export const useRequestEmailChangeMutation = () =>
  useMutation({
    mutationFn: (newEmail: string) =>
      customerApi.customerProfileRequestEmailChangeV1({
        new_email: newEmail,
      }),
  });

export const useConfirmEmailChangeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { request_id: string; token: string }) =>
      customerApi.customerProfileConfirmEmailChangeV1(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.profile });
    },
  });
};

export const useCreateRefundRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      orderId: string;
      reason?: string;
      items: Array<{
        item_type: "ticket" | "concession";
        item_id: string;
        quantity?: number;
      }>;
    }) =>
      customerApi.customerRefundRequestCreateV1(payload.orderId, {
        reason: payload.reason,
        items: payload.items,
      }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.order(variables.orderId) }),
        queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.orders }),
        queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.refunds }),
      ]);
    },
  });
};

export const useTicketResendEmailMutation = () =>
  useMutation({
    mutationFn: (ticketId: string) =>
      customerApi.customerTicketResendEmailV1(ticketId),
  });

export const useRevokeSessionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      customerApi.customerSecuritySessionsDeleteV1(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.sessions });
    },
  });
};

export const useRevokeOtherSessionsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keepSessionId?: string) =>
      customerApi.customerSecuritySessionsRevokeOthersV1({
        keep_session_id: keepSessionId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.sessions });
    },
  });
};

export const useRequestDataExportMutation = () =>
  useMutation({
    mutationFn: async () => {
      const response = await customerApi.customerPrivacyExportV1({ format: "json" });
      return response.data as unknown as PrivacyRequestStatus;
    },
  });

export const useRequestDeleteAccountMutation = () =>
  useMutation({
    mutationFn: (payload: { reason?: string; confirm_phrase: string }) =>
      customerApi.customerPrivacyDeleteRequestV1(payload),
  });
