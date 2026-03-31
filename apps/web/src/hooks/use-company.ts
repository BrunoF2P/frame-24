import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api-client";

export const useCompany = (tenantSlug: string) => {
  return useQuery({
    queryKey: ["company", tenantSlug],
    queryFn: async () => {
      const response = await publicApi.publicControllerGetCompanyBySlugV1({
        tenantSlug,
      });
      return response.data;
    },
    enabled: !!tenantSlug,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
