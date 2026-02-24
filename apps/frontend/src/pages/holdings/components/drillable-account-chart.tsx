import { getAccounts } from "@/adapters";
import { useAccountsSimplePerformance } from "@/hooks/use-accounts-simple-performance";
import { useBalancePrivacy } from "@/hooks/use-balance-privacy";
import { PORTFOLIO_ACCOUNT_ID } from "@/lib/constants";
import { QueryKeys } from "@/lib/query-keys";
import { useSettingsContext } from "@/lib/settings-provider";
import type { Account } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import {
    AmountDisplay,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    DonutChart,
    EmptyPlaceholder,
    Skeleton,
    formatPercent,
} from "@wealthfolio/ui";
import { useMemo, useState } from "react";

interface DrillableAccountChartProps {
  isLoading?: boolean;
  accountId?: string;
  group?: string;
}

export function DrillableAccountChart({
  isLoading: isLoadingProp,
  accountId,
  group,
}: DrillableAccountChartProps) {
  const { settings } = useSettingsContext();
  const baseCurrency = settings?.baseCurrency ?? "USD";
  const { isBalanceHidden } = useBalancePrivacy();
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<Account[], Error>({
    queryKey: [QueryKeys.ACCOUNTS],
    queryFn: () => getAccounts(),
  });

  const { data: performanceData, isLoading: isLoadingPerformance } =
    useAccountsSimplePerformance(accounts);

  const isLoading = isLoadingProp || isLoadingAccounts || isLoadingPerformance;

  const filteredAccounts = useMemo(() => {
    if (!accounts?.length) return [];

    return accounts.filter((account) => {
      if (accountId && accountId !== PORTFOLIO_ACCOUNT_ID && account.id !== accountId) {
        return false;
      }

      if (group && account.group?.trim() !== group) {
        return false;
      }

      return true;
    });
  }, [accounts, accountId, group]);

  const accountData = useMemo(() => {
    if (!filteredAccounts.length || !performanceData) return [];

    return filteredAccounts
      .map((account) => {
        const perf = performanceData.find((p) => p.accountId === account.id);
        if (!perf) return null;

        const valueAcct = Number(perf.totalValue) || 0;
        if (valueAcct <= 0) return null;

        const fxRate = Number(perf.fxRateToBase) || 1;
        const valueBase = valueAcct * fxRate;

        return {
          id: account.id,
          name: account.name,
          value: valueBase,
          currency: perf.baseCurrency || baseCurrency,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => b.value - a.value);
  }, [filteredAccounts, performanceData, baseCurrency]);

  const totalValue = useMemo(
    () => accountData.reduce((sum, account) => sum + account.value, 0),
    [accountData],
  );

  const listRows = useMemo(() => {
    if (!accountData.length || totalValue <= 0) {
      return [] as Array<{ key: string; name: string; value: number; percent: number }>;
    }

    if (accountData.length <= 4) {
      return accountData.map((account) => ({
        key: account.id,
        name: account.name,
        value: account.value,
        percent: account.value / totalValue,
      }));
    }

    const topThree = accountData.slice(0, 3).map((account) => ({
      key: account.id,
      name: account.name,
      value: account.value,
      percent: account.value / totalValue,
    }));

    const othersValue = accountData.slice(3).reduce((sum, account) => sum + account.value, 0);

    return [
      ...topThree,
      {
        key: "__others__",
        name: "Others",
        value: othersValue,
        percent: othersValue / totalValue,
      },
    ];
  }, [accountData, totalValue]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden backdrop-blur-sm">
        <CardHeader>
          <Skeleton className="h-5 w-[140px]" />
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          <div className="flex h-[160px] items-center justify-center">
            <Skeleton className="h-[120px] w-[120px] rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
          Accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {accountData.length > 0 ? (
          <>
          <DonutChart
            data={accountData}
            activeIndex={activeIndex}
            onSectionClick={(_, index) => setActiveIndex(index)}
            startAngle={180}
            endAngle={0}
          />
            <div className="space-y-1">
              {listRows.map((row) => (
                <div
                  key={row.key}
                  className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left"
                >
                  <span className="text-sm font-medium">{row.name}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <AmountDisplay
                      value={row.value}
                      currency={baseCurrency}
                      isHidden={isBalanceHidden}
                      displayCurrency={false}
                    />
                    <span className="text-muted-foreground text-xs">|</span>
                    <span className="text-muted-foreground">{formatPercent(row.percent)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyPlaceholder description="No account data available." />
        )}
      </CardContent>
    </Card>
  );
}
