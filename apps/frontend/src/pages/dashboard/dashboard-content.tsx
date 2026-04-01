import { HistoryChart } from "@/components/history-chart";
import { useHapticFeedback } from "@/hooks";
import { useHoldings } from "@/hooks/use-holdings";
import { useValuationHistory } from "@/hooks/use-valuation-history";
import {
    HoldingType,
    isAlternativeAssetKind,
    PORTFOLIO_ACCOUNT_ID,
} from "@/lib/constants";
import { useSettingsContext } from "@/lib/settings-provider";
import { DateRange, TimePeriod } from "@/lib/types";
import { calculatePerformanceMetrics } from "@/lib/utils";
import { PortfolioUpdateTrigger } from "@/pages/dashboard/portfolio-update-trigger";
import type { TimePeriod as UITimePeriod } from "@wealthfolio/ui";
import {
    GainAmount,
    GainPercent,
    getInitialIntervalData,
    IntervalSelector,
    usePersistentState,
} from "@wealthfolio/ui";
import { Skeleton } from "@wealthfolio/ui/components/ui/skeleton";
import { useMemo, useState } from "react";
import { AccountsSummary } from "./accounts-summary";
import Balance from "./balance";
import SavingGoals from "./goals";
import { MarketIndicesWidget } from "./market-indices-widget";
import TopHoldings from "./top-holdings";

const DEFAULT_INTERVAL: UITimePeriod = "3M";
const INTERVAL_STORAGE_KEY = "dashboard-interval";

export function DashboardContent() {
  // Use the same persisted state as IntervalSelector for the interval code
  const [intervalCode] = usePersistentState<UITimePeriod>(INTERVAL_STORAGE_KEY, DEFAULT_INTERVAL);

  // Derive initial values from the persisted interval code
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    () => getInitialIntervalData(intervalCode).range,
  );
  const [selectedIntervalDescription, setSelectedIntervalDescription] = useState<string>(
    () => getInitialIntervalData(intervalCode).description,
  );
  const [selectedIntervalCode, setSelectedIntervalCode] = useState<UITimePeriod>(intervalCode);
  const [isAllTime, setIsAllTime] = useState<boolean>(() => intervalCode === "ALL");

  const { holdings: allHoldings, isLoading: isHoldingsLoading } = useHoldings(PORTFOLIO_ACCOUNT_ID);
  const { triggerHaptic } = useHapticFeedback();

  // Filter holdings for display (exclude alternative assets and cash for TopHoldings)
  const holdings = useMemo(() => {
    if (!allHoldings) return [];
    return allHoldings.filter((h) => {
      // Exclude cash holdings from display
      if (h.holdingType === HoldingType.CASH) return false;
      // Exclude alternative assets from display
      if (h.assetKind && isAlternativeAssetKind(h.assetKind)) return false;
      return true;
    });
  }, [allHoldings]);

  // Total portfolio value (includes cash, excludes alternative assets)
  const totalValue = useMemo(() => {
    if (!allHoldings) return 0;
    return allHoldings
      .filter((h) => {
        return !(h.assetKind && isAlternativeAssetKind(h.assetKind));
      })
      .reduce((acc, holding) => acc + (holding.marketValue?.base ?? 0), 0);
  }, [allHoldings]);

  const { valuationHistory, isLoading: isValuationHistoryLoading } = useValuationHistory(dateRange);

  const { settings } = useSettingsContext();
  const baseCurrency = settings?.baseCurrency ?? "USD";

  const oneDayComparisonHistory = useMemo(() => {
    if (selectedIntervalCode !== "1D") return valuationHistory;
    if (!valuationHistory?.length) return valuationHistory;

    const parseNumberPart = (parts: Intl.DateTimeFormatPart[], type: "hour" | "minute") => {
      const value = parts.find((part) => part.type === type)?.value;
      return value ? Number.parseInt(value, 10) : 0;
    };

    const etTimeParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const etHour = parseNumberPart(etTimeParts, "hour");
    const etMinute = parseNumberPart(etTimeParts, "minute");
    const isPreMarket = etHour < 9 || (etHour === 9 && etMinute < 30);

    const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

    const parseDateOnlyAsUtc = (value: string) => {
      const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
      return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0));
    };

    const toEtDateKey = (dateInput: string | Date) => {
      const parsedDate =
        typeof dateInput === "string" && isDateOnly(dateInput)
          ? parseDateOnlyAsUtc(dateInput)
          : new Date(dateInput);
      if (Number.isNaN(parsedDate.getTime())) return "";
      return dateKeyFormatter.format(parsedDate);
    };

    const sortedHistory = [...valuationHistory].sort(
      (a, b) => {
        const dateA =
          typeof a.valuationDate === "string" && isDateOnly(a.valuationDate)
            ? parseDateOnlyAsUtc(a.valuationDate)
            : new Date(a.valuationDate);
        const dateB =
          typeof b.valuationDate === "string" && isDateOnly(b.valuationDate)
            ? parseDateOnlyAsUtc(b.valuationDate)
            : new Date(b.valuationDate);
        return dateA.getTime() - dateB.getTime();
      },
    );

    const latestSnapshotByEtDate = new Map<string, (typeof sortedHistory)[number]>();
    for (const valuation of sortedHistory) {
      const etDateKey = toEtDateKey(valuation.valuationDate);
      if (!etDateKey) continue;
      latestSnapshotByEtDate.set(etDateKey, valuation);
    }

    const todayEtKey = dateKeyFormatter.format(new Date());
    if (isPreMarket) {
      latestSnapshotByEtDate.delete(todayEtKey);
    }

    const dailySnapshots = Array.from(latestSnapshotByEtDate.values());
    if (dailySnapshots.length >= 2) {
      return dailySnapshots.slice(-2);
    }

    return sortedHistory.slice(-2);
  }, [selectedIntervalCode, valuationHistory]);

  const oneDayMetrics = useMemo(() => {
    if (selectedIntervalCode !== "1D") return null;
    if (!oneDayComparisonHistory || oneDayComparisonHistory.length < 2) {
      return { gainLossAmount: 0, simpleReturn: 0 };
    }

    const previous = oneDayComparisonHistory[0];
    const latest = oneDayComparisonHistory[oneDayComparisonHistory.length - 1];
    const gainLossAmount = Number(latest.totalValue) - Number(previous.totalValue);
    const simpleReturn = Number(previous.totalValue) !== 0 ? gainLossAmount / Number(previous.totalValue) : 0;

    return { gainLossAmount, simpleReturn };
  }, [selectedIntervalCode, oneDayComparisonHistory]);

  // Calculate gainLossAmount and simpleReturn from valuationHistory
  const { gainLossAmount, simpleReturn } = useMemo(() => {
    if (selectedIntervalCode === "1D" && oneDayMetrics) {
      return oneDayMetrics;
    }

    const performanceHistory = valuationHistory;
    return calculatePerformanceMetrics(performanceHistory, isAllTime);
  }, [valuationHistory, oneDayMetrics, isAllTime, selectedIntervalCode]);

  const currentValuation = useMemo(() => {
    return valuationHistory && valuationHistory.length > 0
      ? valuationHistory[valuationHistory.length - 1]
      : null;
  }, [valuationHistory]);

  const chartData = useMemo(() => {
    const chartHistory = selectedIntervalCode === "1D" ? oneDayComparisonHistory : valuationHistory;

    return (
      chartHistory?.map((item) => ({
        date: item.valuationDate,
        totalValue: item.totalValue,
        netContribution: item.netContribution,
        currency: item.baseCurrency ?? baseCurrency,
      })) ?? []
    );
  }, [valuationHistory, selectedIntervalCode, oneDayComparisonHistory, baseCurrency]);

  const isNegative = totalValue < 0;

  // Callback for IntervalSelector
  const handleIntervalSelect = (
    code: TimePeriod,
    description: string,
    range: DateRange | undefined,
  ) => {
    setSelectedIntervalCode(code as UITimePeriod);
    setSelectedIntervalDescription(description);
    setDateRange(range);
    setIsAllTime(code === "ALL");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="px-4 pb-1 pt-2 md:px-6 md:pb-2 lg:px-8">
        <PortfolioUpdateTrigger lastCalculatedAt={currentValuation?.calculatedAt}>
          <div className="flex items-start gap-2">
            <div>
              <Balance
                isLoading={isHoldingsLoading}
                targetValue={totalValue}
                currency={baseCurrency}
                displayCurrency={true}
              />
              <div className="text-md flex space-x-3">
                {isValuationHistoryLoading && !valuationHistory ? (
                  <div className="flex items-center gap-3 pt-1">
                    <Skeleton className="h-4 w-24" />
                    <div className="border-secondary my-1 border-r pr-2" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ) : (
                  <>
                    <GainAmount
                      className="lg:text-md text-sm font-light"
                      value={gainLossAmount}
                      currency={baseCurrency}
                      displayCurrency={false}
                    ></GainAmount>
                    <div className="border-secondary my-1 border-r pr-2" />
                    <GainPercent
                      className="lg:text-md text-sm font-light"
                      value={simpleReturn}
                      animated={true}
                    ></GainPercent>
                  </>
                )}
                {selectedIntervalDescription && (
                  <span className="lg:text-md text-muted-foreground ml-1 text-sm font-light">
                    {selectedIntervalDescription}
                  </span>
                )}
              </div>
            </div>
          </div>
        </PortfolioUpdateTrigger>
      </div>

      <div
        className={`bg-linear-to-t flex grow flex-col ${
          isNegative
            ? "from-destructive/30 via-destructive/15 to-transparent"
            : "from-success/30 via-success/15 to-transparent"
        }`}
      >
        <div className="h-[280px]">
          <HistoryChart data={chartData} isLoading={isValuationHistoryLoading} />
          {valuationHistory && chartData.length > 0 && (
            <div className="flex w-full justify-center">
              <IntervalSelector
                className="pointer-events-auto relative z-20 w-full max-w-screen-sm sm:max-w-screen-md md:max-w-2xl lg:max-w-3xl"
                onIntervalSelect={handleIntervalSelect}
                onHaptic={triggerHaptic}
                isLoading={isValuationHistoryLoading}
                storageKey={INTERVAL_STORAGE_KEY}
                defaultValue={DEFAULT_INTERVAL}
              />
            </div>
          )}
        </div>

        <div className="grow px-4 pb-[calc(var(--mobile-nav-ui-height)+max(var(--mobile-nav-gap),env(safe-area-inset-bottom)))] pt-12 md:px-6 md:pb-6 md:pt-6 lg:px-10 lg:pb-8 lg:pt-8">
          <div className="mb-4">
            <MarketIndicesWidget />
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-20">
            <div className="lg:col-span-2">
              <AccountsSummary />
            </div>
            <div className="space-y-6 lg:col-span-1">
              <TopHoldings
                holdings={holdings}
                isLoading={isHoldingsLoading}
                baseCurrency={baseCurrency}
              />
              <SavingGoals />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardContent;
