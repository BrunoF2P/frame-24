import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api-client";

export const useCompanies = () => {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const response = await publicApi.publicControllerGetCompaniesV1();
      return response.data;
    },
  });
};
