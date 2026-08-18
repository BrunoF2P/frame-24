import { apiClient, ApiPayload } from './api-config';

interface ComplexItem {
  id: string;
  [key: string]: unknown;
}

interface RoomItem {
  [key: string]: unknown;
}

type CreateShowtimePayload = ApiPayload & {
  start_time: string | Date;
};

type UpdateShowtimePayload = Partial<{
  movie_id: string;
  room_id: string;
  start_time: string | Date;
  base_ticket_price: number;
  projection_type: string | null;
  audio_type: string | null;
  session_language: string | null;
  status: string;
}>;

export const ScheduleService = {
  async getShowtimes() {
    const response = await apiClient.get('/v1/showtimes');
    return (response.data ?? []) as unknown[];
  },

  async getShowtimeById(id: string) {
    const response = await apiClient.get(`/v1/showtimes/${id}`);
    return response.data as unknown;
  },

  async createShowtime(data: CreateShowtimePayload) {
    const payload: CreateShowtimePayload = {
      ...data,
      start_time: new Date(data.start_time).toISOString(),
    };
    return await apiClient.post('/v1/showtimes', payload);
  },

  async updateShowtime(id: string, data: UpdateShowtimePayload) {
    const payload: UpdateShowtimePayload = { ...data };
    if (payload.start_time) {
      payload.start_time = new Date(payload.start_time).toISOString();
    }
    return await apiClient.patch(`/v1/showtimes/${id}`, payload);
  },

  async deleteShowtime(id: string) {
    return await apiClient.delete(`/v1/showtimes/${id}`);
  },

  async getRooms() {
    try {
      const complexesResponse = await apiClient.get('/v1/cinema-complexes');
      const complexes = (complexesResponse.data ?? []) as ComplexItem[];

      if (!complexes || complexes.length === 0) {
        return [];
      }

      const roomsPromises = complexes.map(async (complex) => {
        try {
          const roomsResponse = await apiClient.get(`/v1/cinema-complexes/${complex.id}/rooms`);

          return ((roomsResponse.data ?? []) as RoomItem[]).map((room) => ({
            ...room,
            cinema_complexes: complex,
          }));
        } catch (error: unknown) {
          console.warn(`Não foi possível buscar salas do complexo ${complex.id}`, error);
          return [];
        }
      });

      const results = await Promise.all(roomsPromises);
      return results.flat();
    } catch (error: unknown) {
      console.error('Erro ao carregar salas:', error);
      throw error;
    }
  },
};
