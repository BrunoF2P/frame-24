import { apiConfig } from "./api-config";
import {
  CinemaComplexesApi,
  RoomsApi,
  ProjectionTypesApi,
  AudioTypesApi,
  SessionLanguagesApi,
  SessionStatusApi,
  CreateCinemaComplexDto,
  CreateRoomDtoSeatLayoutInner,
} from "@repo/api-types";

const complexesApi = new CinemaComplexesApi(apiConfig);
const roomsApi = new RoomsApi(apiConfig);
const projectionApi = new ProjectionTypesApi(apiConfig);
const audioApi = new AudioTypesApi(apiConfig);
const languageApi = new SessionLanguagesApi(apiConfig);
const statusApi = new SessionStatusApi(apiConfig);

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[]";
  }
}

export const OperationsService = {
  // --- Complexos ---
  async getComplexes() {
    const response = await complexesApi.cinemaComplexesControllerFindAllV1();
    return (response.data ?? []) as unknown[];
  },

  async createComplex(data: CreateCinemaComplexDto) {
    return await complexesApi.cinemaComplexesControllerCreateV1({
      createCinemaComplexDto: data,
    });
  },

  async getSessionLanguages() {
    const response = await languageApi.sessionLanguagesControllerFindAllV1();
    return (response.data ?? []) as unknown[];
  },

  async getSessionStatuses() {
    const response = await statusApi.sessionStatusControllerFindAllV1();
    return (response.data ?? []) as unknown[];
  },

  // --- Salas ---
  async getRooms(complexId: string) {
    const response = await roomsApi.roomsControllerFindAllV1({
      cinemaComplexId: complexId,
    });
    return (response.data ?? []) as unknown[];
  },

  async createRoom(
    cinemaComplexId: string,
    data: { capacity: number | string; room_number: string; name: string },
  ) {
    // 1. Lógica para Gerar Layout de Assentos Automático
    // Cria uma matriz simples (ex: 50 lugares = 5 fileiras de 10)
    const capacity = Number(data.capacity);
    const cols = 10; // Fixo em 10 colunas por simplicidade
    const rowsCount = Math.ceil(capacity / cols);

    const seatLayout = [];
    let seatsGenerated = 0;

    for (let r = 0; r < rowsCount; r++) {
      const rowCode = String.fromCharCode(65 + r); // Gera A, B, C, D...
      const seatsInThisRow = [];

      for (let c = 1; c <= cols; c++) {
        if (seatsGenerated >= capacity) break;

        seatsInThisRow.push({
          column_number: c,
          accessible: r === 0, // Define a primeira fileira (A) como acessível
          seat_type_id: null, // Usa o padrão do sistema
        });
        seatsGenerated++;
      }

      if (seatsInThisRow.length > 0) {
        seatLayout.push({
          row_code: rowCode,
          seats: seatsInThisRow,
        });
      }
    }

    // 2. Preparação do Payload (Correção do Bug do Multipart)
    // A API espera um array de objetos, mas o client gerado quebra a formatação em multipart.
    // Solução: Enviamos um array contendo uma única string JSON. O backend (Zod) fará o parse.
    const layoutPayload = [
      safeStringify(seatLayout),
    ] as unknown as CreateRoomDtoSeatLayoutInner[];

    return await roomsApi.roomsControllerCreateV1({
      cinemaComplexId,
      roomNumber: data.room_number,
      name: data.name,
      capacity: capacity,
      seatLayout: layoutPayload, // <--- Aqui vai o layout gerado e corrigido
      active: true,
    });
  },
  async getProjectionTypes() {
    // Busca tipos de projeção (2D, 3D, IMAX...)
    const response = await projectionApi.projectionTypesControllerFindAllV1();
    return (response.data ?? []) as unknown[];
  },

  async getAudioTypes() {
    // Busca tipos de áudio (Dolby, Atmos...)
    const response = await audioApi.audioTypesControllerFindAllV1();
    return (response.data ?? []) as unknown[];
  },
};
