import { io, Socket } from "socket.io-client";

// Tipos para eventos do Socket
export interface ServerToClientEvents {
  "joined-showtime": (data: { showtime_id: string }) => void;
  "seats-reserved": (data: {
    seat_ids: string[];
    reservation_uuid: string;
    expires_at: string;
  }) => void;
  "seats-released": (data: {
    seat_ids: string[];
    reservation_uuid: string;
  }) => void;
  "seats-confirmed": (data: { seat_ids: string[]; sale_id: string }) => void;
  "reservation-success": (data: {
    reservation_uuid: string;
    expires_at: string;
    seat_ids: string[];
  }) => void;
  "reservation-error": (data: { message: string }) => void;
  "reservation-confirmed": (data: {
    reservation_uuid: string;
    sale_id: string;
  }) => void;
  "confirmation-error": (data: { message: string }) => void;
  "reservation-restored": (data: {
    reservation_uuid: string;
    expires_at: string;
    seat_ids: string[];
  }) => void;
}

export interface ClientToServerEvents {
  "join-showtime": (data: { showtime_id: string; user_id?: string; tenant_slug?: string }) => void;
  "reserve-seats": (data: {
    showtime_id: string;
    seat_ids: string[];
    company_id: string;
    user_id?: string;
    tenant_slug?: string;
  }) => void;
  "release-seats": (data: {
    reservation_uuid: string;
    company_id: string;
    tenant_slug?: string;
  }) => void;
  "confirm-reservation": (data: {
    reservation_uuid: string;
    sale_id: string;
    tenant_slug?: string;
  }) => void;
}

export type SeatsSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: SeatsSocket | null = null;

/**
 * Retorna uma instância singleton do Socket.IO conectado ao namespace /seats
 */
export const getSeatsSocket = async (): Promise<SeatsSocket> => {
  if (!socketInstance) {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

    socketInstance = io(`${socketUrl}/seats`, {
      transports: ["websocket", "polling"],
      autoConnect: false, // Conexão manual para controle
      withCredentials: true,
    }) as SeatsSocket;
  }

  return socketInstance;
};

/**
 * Desconecta o socket
 */
export const disconnectSocket = () => {
  if (socketInstance?.connected) {
    socketInstance.disconnect();
  }
};
