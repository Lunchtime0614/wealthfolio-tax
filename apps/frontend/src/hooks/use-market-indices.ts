import { getIndexSparklines } from "@/adapters";
import { QueryKeys } from "@/lib/query-keys";
import type { IndexSparkline } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

// The three major US indices tracked by default
const DEFAULT_INDEX_SYMBOLS = ["^DJI", "^GSPC", "^IXIC"];

// Refresh every 5 minutes while the tab is visible
const STALE_TIME_MS = 5 * 60 * 1000;

interface UseMarketIndicesOptions {
  symbols?: string[];
  enabled?: boolean;
}

export function useMarketIndices({
  symbols = DEFAULT_INDEX_SYMBOLS,
  enabled = true,
}: UseMarketIndicesOptions = {}) {
  return useQuery<IndexSparkline[], Error>({
    queryKey: [QueryKeys.INDEX_SPARKLINES, symbols],
    queryFn: () => getIndexSparklines(symbols),
    enabled,
    staleTime: STALE_TIME_MS,
    // Don't throw on error; the widget renders gracefully with no data
    throwOnError: false,
  });
}
