import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api-client";

interface UseShowtimesParams {
  tenantSlug: string;
  complexId?: string;
  movieId?: string;
  date?: string;
}

export const useShowtimes = ({
  tenantSlug,
  complexId,
  movieId,
  date,
}: UseShowtimesParams) => {
  return useQuery({
    queryKey: ["showtimes", tenantSlug, complexId, movieId, date],
    queryFn: async () => {
      const response = await publicApi.publicControllerGetShowtimesV1({
        tenantSlug,
        complexId,
        movieId,
        date,
      });
      return response.data;
    },
    enabled: !!tenantSlug,
    staleTime: 30 * 1000,
  });
};
