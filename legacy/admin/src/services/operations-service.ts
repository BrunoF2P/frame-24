import { apiClient, ApiPayload } from './api-config';
import { SeatLayoutRow } from '@/types/operations';

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[]';
  }
}

export const OperationsService = {
  // --- Complexos ---
  async getComplexes() {
    const response = await apiClient.get('/v1/cinema-complexes');
    return (response.data ?? []) as unknown[];
  },

  async getComplexById(id: string) {
    const response = await apiClient.get(`/v1/cinema-complexes/${id}`);
    return response.data as unknown;
  },

  async createComplex(data: ApiPayload) {
    return await apiClient.post('/v1/cinema-complexes', data);
  },

  async getSessionLanguages() {
    const response = await apiClient.get('/v1/session-languages');
    return (response.data ?? []) as unknown[];
  },

  async getSessionStatuses() {
    const response = await apiClient.get('/v1/session-status');
    return (response.data ?? []) as unknown[];
  },

  // --- Salas ---
  async getRooms(complexId: string) {
    const response = await apiClient.get(`/v1/cinema-complexes/${complexId}/rooms`);
    return (response.data ?? []) as unknown[];
  },

  async getRoomById(complexId: string, roomId: string) {
    const response = await apiClient.get(`/v1/cinema-complexes/${complexId}/rooms/${roomId}`);
    return response.data as unknown;
  },

  async createRoom(
    cinemaComplexId: string,
    data: {
      room_number: string;
      name?: string | null;
      capacity: number;
      projection_type_id?: string | null;
      audio_type_id?: string | null;
      room_design?: string | null;
      seat_layout: SeatLayoutRow[];
    },
  ) {
    return await apiClient.post(`/v1/cinema-complexes/${cinemaComplexId}/rooms`, {
      room_number: data.room_number,
      name: data.name ?? null,
      capacity: data.capacity,
      projection_type_id: data.projection_type_id || null,
      audio_type_id: data.audio_type_id || null,
      room_design: data.room_design || null,
      seat_layout: safeStringify(data.seat_layout),
      active: true,
    });
  },

  async createSimpleRoom(
    cinemaComplexId: string,
    data: { room_number: string; name: string; capacity: number },
  ) {
    const capacity = Number(data.capacity);
    const cols = 10;
    const rowsCount = Math.ceil(capacity / cols);
    const seatLayout: SeatLayoutRow[] = [];
    let seatsGenerated = 0;
    for (let r = 0; r < rowsCount; r++) {
      const rowCode = String.fromCharCode(65 + r);
      const seats: SeatLayoutRow['seats'] = [];
      for (let c = 1; c <= cols; c++) {
        if (seatsGenerated >= capacity) break;
        seats.push({ column_number: c, accessible: r === 0, seat_type_id: null });
        seatsGenerated++;
      }
      if (seats.length > 0) seatLayout.push({ row_code: rowCode, seats });
    }
    return await apiClient.post(`/v1/cinema-complexes/${cinemaComplexId}/rooms`, {
      room_number: data.room_number,
      name: data.name || null,
      capacity,
      seat_layout: safeStringify(seatLayout),
      active: true,
    });
  },

  async updateRoom(
    complexId: string,
    roomId: string,
    data: {
      room_number?: string;
      name?: string | null;
      capacity?: number;
      projection_type_id?: string | null;
      audio_type_id?: string | null;
      room_design?: string | null;
      active?: boolean;
      seat_layout?: SeatLayoutRow[];
    },
  ) {
    const payload: Record<string, unknown> = { ...data };
    if (data.seat_layout) {
      payload.seat_layout = safeStringify(data.seat_layout);
    }
    return await apiClient.put(`/v1/cinema-complexes/${complexId}/rooms/${roomId}`, payload);
  },

  async deleteRoom(complexId: string, roomId: string) {
    return await apiClient.delete(`/v1/cinema-complexes/${complexId}/rooms/${roomId}`);
  },

  async getProjectionTypes() {
    const response = await apiClient.get('/v1/projection-types');
    return (response.data ?? []) as unknown[];
  },

  async getAudioTypes() {
    const response = await apiClient.get('/v1/audio-types');
    return (response.data ?? []) as unknown[];
  },

  async getSeatTypes() {
    const response = await apiClient.get('/v1/seat-types');
    return (response.data ?? []) as unknown[];
  },
};
