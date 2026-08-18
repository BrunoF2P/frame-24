import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api-client";

export const useComplexes = (
  tenantSlug: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["complexes", tenantSlug],
    queryFn: async () => {
      const response = await publicApi.publicControllerGetComplexesV1({
        tenantSlug,
      });
      return response.data;
    },
    enabled: !!tenantSlug && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 0,
  });
};
