import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api-client";

export const useProducts = (tenantSlug: string, complexId?: string) => {
  return useQuery({
    queryKey: ["products", tenantSlug, complexId],
    queryFn: async () => {
      const response = await publicApi.publicControllerGetProductsV1({
        tenantSlug,
        complexId,
      });
      return response.data;
    },
    enabled: !!tenantSlug,
    staleTime: 60 * 1000,
  });
};
