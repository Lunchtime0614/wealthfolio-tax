import { getPortfolioAllocations } from "@/adapters";
import { QueryKeys } from "@/lib/query-keys";
import { PortfolioAllocations } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export function usePortfolioAllocations(accountId: string, group?: string) {
  const {
    data: allocations,
    isLoading,
    isError,
    error,
  } = useQuery<PortfolioAllocations, Error>({
    queryKey: [QueryKeys.PORTFOLIO_ALLOCATIONS, accountId, group ?? "__all__"],
    queryFn: () => getPortfolioAllocations(accountId, group),
    enabled: !!accountId,
  });

  return { allocations, isLoading, isError, error };
}
