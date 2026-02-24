import { getHoldings } from "@/adapters";
import { QueryKeys } from "@/lib/query-keys";
import { Holding } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export function useHoldings(accountId: string, group?: string) {
  const {
    data: holdings = [],
    isLoading,
    isError,
    error,
  } = useQuery<Holding[], Error>({
    queryKey: [QueryKeys.HOLDINGS, accountId, group ?? "__all__"],
    queryFn: () => getHoldings(accountId, group),
    enabled: !!accountId,
  });

  return { holdings, isLoading, isError, error };
}
