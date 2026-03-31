import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api-client";

export interface ShowtimeDetails {
  showtime_id: string;
  room_id: string;
  available_seats: number;
  sold_seats: number;
  base_ticket_price: number;
  seats: {
    id: string;
    seat_code: string;
    row_code: string;
    column_number: number;
    status: string;
    reserved: boolean;
    seat_type_name?: string;
    additional_value?: number;
  }[];
  movie?: {
    title: string;
    poster_url?: string;
  };
  cinema?: {
    id: string;
    name: string;
  };
  room?: {
    name: string;
  };
  start_time?: string;
}

export const useShowtimeDetails = (showtimeId: string) => {
  return useQuery<ShowtimeDetails>({
    // Mesma origem do useSeatsMap para reutilizar cache e evitar request duplicada
    queryKey: ["seats-map", showtimeId],
    queryFn: async () => {
      const response = await publicApi.publicControllerGetSeatsMapV1({
        id: showtimeId,
      });
      return response.data as unknown as ShowtimeDetails;
    },
    enabled: !!showtimeId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 10 * 1000,
  });
};
