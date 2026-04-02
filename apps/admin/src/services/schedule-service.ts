import { apiConfig } from "./api-config";
import {
  ShowtimesApi,
  RoomsApi,
  CinemaComplexesApi,
  CreateShowtimeDto,
} from "@repo/api-types";

// Instancia as APIs geradas
const showtimesApi = new ShowtimesApi(apiConfig);
const roomsApi = new RoomsApi(apiConfig);
const cinemaComplexesApi = new CinemaComplexesApi(apiConfig); // <--- Adicionado

interface ComplexItem {
  id: string;
  [key: string]: unknown;
}

interface RoomItem {
  [key: string]: unknown;
}

export const ScheduleService = {
  // Listar sessões
  async getShowtimes() {
    // Passamos uma data antiga para satisfazer o filtro obrigatório
    const response = await showtimesApi.showtimesControllerFindAllV1({
      startTime: new Date(0).toISOString(),
    });
    return (response.data ?? []) as unknown[];
  },

  // Criar sessão
  async createShowtime(data: CreateShowtimeDto) {
    const payload: CreateShowtimeDto = {
      ...data,
      start_time: new Date(data.start_time).toISOString(),
    };
    return await showtimesApi.showtimesControllerCreateV1({
      createShowtimeDto: payload,
    });
  },

  // Deletar sessão
  async deleteShowtime(id: string) {
    return await showtimesApi.showtimesControllerRemoveV1({ id });
  },

  // Buscar todas as salas (de todos os complexos)
  async getRooms() {
    try {
      // 1. Busca os complexos primeiro
      const complexesResponse =
        await cinemaComplexesApi.cinemaComplexesControllerFindAllV1();
      const complexes = (complexesResponse.data ?? []) as ComplexItem[];

      if (!complexes || complexes.length === 0) {
        return [];
      }

      // 2. Busca as salas de CADA complexo em paralelo
      const roomsPromises = complexes.map(async (complex) => {
        try {
          const roomsResponse = await roomsApi.roomsControllerFindAllV1({
            cinemaComplexId: complex.id,
          });

          // Injetamos o objeto do complexo dentro da sala para o UI exibir o nome corretamente
          return ((roomsResponse.data ?? []) as RoomItem[]).map((room) => ({
            ...room,
            cinema_complexes: complex, // Garante que {room.cinema_complexes.name} funcione no select
          }));
        } catch (error: unknown) {
          console.warn(
            `Não foi possível buscar salas do complexo ${complex.id}`,
            error,
          );
          return [];
        }
      });

      // 3. Junta tudo em um array só
      const results = await Promise.all(roomsPromises);
      return results.flat();
    } catch (error: unknown) {
      console.error("Erro ao carregar salas:", error);
      throw error;
    }
  },
};
