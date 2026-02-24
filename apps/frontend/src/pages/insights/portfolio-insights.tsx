import { AccountSelector } from "@/components/account-selector";
import { SwipablePage, SwipablePageView } from "@/components/page";
import { useAccounts } from "@/hooks/use-accounts";
import { PORTFOLIO_ACCOUNT_ID } from "@/lib/constants";
import type { Account } from "@/lib/types";
import IncomePage from "@/pages/income/income-page";
import PerformancePage from "@/pages/performance/performance-page";
import { Icons } from "@wealthfolio/ui";
import { Card, CardContent, CardHeader } from "@wealthfolio/ui/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@wealthfolio/ui/components/ui/select";
import { Skeleton } from "@wealthfolio/ui/components/ui/skeleton";
import { Suspense, useMemo, useState } from "react";
import HoldingsInsightsPage from "../holdings/holdings-insights-page";

const ALL_GROUP_VALUE = "__all__";

// Loading skeleton to show while the dashboard is loading
const DashboardLoader = () => (
  <div className="flex h-full w-full flex-col space-y-4 p-4">
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
    <div className="flex items-center justify-center py-8">
      <span className="text-muted-foreground text-sm">Loading dashboard...</span>
    </div>
  </div>
);

export default function PortfolioInsightsPage() {
  const { accounts } = useAccounts({ filterActive: true });
  const [selectedAccount, setSelectedAccount] = useState<Account | null>({
    id: PORTFOLIO_ACCOUNT_ID,
    name: "All Portfolio",
    accountType: "PORTFOLIO" as unknown as Account["accountType"],
    balance: 0,
    currency: "USD",
    isDefault: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Account);

  const accountId = selectedAccount?.id ?? PORTFOLIO_ACCOUNT_ID;
  const [selectedGroup, setSelectedGroup] = useState<string>(ALL_GROUP_VALUE);

  const accountGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const account of accounts) {
      const groupName = account.group?.trim();
      if (groupName) {
        groups.add(groupName);
      }
    }
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [accounts]);

  const groupFilter = selectedGroup === ALL_GROUP_VALUE ? undefined : selectedGroup;

  const holdingsActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <AccountSelector
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          variant="dropdown"
          includePortfolio={true}
          iconOnly={true}
          icon={Icons.ListFilter}
        />

        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="h-8 min-w-[130px]">
            <SelectValue placeholder="All groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_GROUP_VALUE}>All groups</SelectItem>
            {accountGroups.map((groupName) => (
              <SelectItem key={groupName} value={groupName}>
                {groupName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    [accountGroups, selectedAccount, selectedGroup],
  );

  // Define the views with icons
  const views: SwipablePageView[] = useMemo(
    () => [
      {
        value: "holdings",
        label: "Holdings",
        icon: Icons.PieChart,
        content: (
          <Suspense fallback={<DashboardLoader />}>
            <HoldingsInsightsPage accountId={accountId} group={groupFilter} />
          </Suspense>
        ),
        actions: holdingsActions,
      },
      {
        value: "performance",
        label: "Performance",
        icon: Icons.TrendingUp,
        content: (
          <Suspense fallback={<DashboardLoader />}>
            <PerformancePage group={groupFilter} />
          </Suspense>
        ),
      },
      {
        value: "income",
        label: "Income",
        icon: Icons.HandCoins,
        content: (
          <Suspense fallback={<DashboardLoader />}>
            <IncomePage />
          </Suspense>
        ),
      },
    ],
    [accountId, groupFilter, holdingsActions],
  );

  return <SwipablePage views={views} defaultView="holdings" withPadding={true} />;
}
