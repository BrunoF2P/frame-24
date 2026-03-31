import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api-client";

export const useSeatsMap = (showtimeId: string) => {
  return useQuery({
    queryKey: ["seats-map", showtimeId],
    queryFn: async () => {
      const response = await publicApi.publicControllerGetSeatsMapV1({
        id: showtimeId,
      });
      return response.data;
    },
    enabled: !!showtimeId,
    refetchInterval: false, // WebSocket will handle real-time updates
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 10 * 1000,
  });
};
