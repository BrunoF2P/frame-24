import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api-client";

export const useMovies = (tenantSlug: string) => {
  return useQuery({
    queryKey: ["movies", tenantSlug],
    queryFn: async () => {
      const response = await publicApi.publicControllerGetMoviesV1({
        tenantSlug,
      });
      return response.data;
    },
    enabled: !!tenantSlug,
    staleTime: 2 * 60 * 1000,
  });
};
