import { useMarketIndices } from "@/hooks/use-market-indices";
import type { IndexSparkline } from "@/lib/types";
import { Skeleton } from "@wealthfolio/ui/components/ui/skeleton";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatIndexPrice(price: number): string {
  // For round numbers > 1000, show 2 decimal places; smaller values show more.
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatChangePercent(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function formatChangeValue(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(change)}`;
}

// ---------------------------------------------------------------------------
// Single index tile
// ---------------------------------------------------------------------------

interface IndexTileProps {
  sparkline: IndexSparkline;
}

interface SegmentedPoint {
  timestampMs: number;
  abovePrice: number | null;
  belowPrice: number | null;
}

function buildSegmentedChartData(points: IndexSparkline["points"], previousClose: number): SegmentedPoint[] {
  if (points.length === 0) {
    return [];
  }

  const segmented: SegmentedPoint[] = [];
  const toMs = (timestampSec: number) => timestampSec * 1000;

  const first = points[0];
  segmented.push({
    timestampMs: toMs(first.timestamp),
    abovePrice: first.price >= previousClose ? first.price : null,
    belowPrice: first.price < previousClose ? first.price : null,
  });

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const prevDiff = prev.price - previousClose;
    const currDiff = curr.price - previousClose;
    const crosses = (prevDiff < 0 && currDiff > 0) || (prevDiff > 0 && currDiff < 0);

    if (crosses) {
      const span = curr.price - prev.price;
      if (span !== 0) {
        const ratio = (previousClose - prev.price) / span;
        const crossTimestamp = prev.timestamp + (curr.timestamp - prev.timestamp) * ratio;
        segmented.push({
          timestampMs: toMs(crossTimestamp),
          abovePrice: previousClose,
          belowPrice: previousClose,
        });
      }
    }

    segmented.push({
      timestampMs: toMs(curr.timestamp),
      abovePrice: curr.price >= previousClose ? curr.price : null,
      belowPrice: curr.price < previousClose ? curr.price : null,
    });
  }

  return segmented;
}

function IndexTile({ sparkline }: IndexTileProps) {
  const isPositive = sparkline.change >= 0;
  const summaryColor = isPositive ? "var(--success)" : "var(--destructive)";
  const previousClose = sparkline.currentPrice - sparkline.change;

  const chartData = buildSegmentedChartData(sparkline.points, previousClose);
  const sessionStartMs = chartData[0]?.timestampMs ?? Date.now();
  const sessionEndMs = sessionStartMs + (6 * 60 + 30) * 60 * 1000;
  const prices = sparkline.points.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const spread = maxPrice - minPrice;
  const fallbackPadding = maxPrice * 0.0002;
  const yPadding = Math.max(spread * 0.15, fallbackPadding);
  const yMin = minPrice - yPadding;
  const yMax = maxPrice + yPadding;

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-border/40 bg-card/50 px-3 py-2">
      {/* Left: name + price + change */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-muted-foreground">{sparkline.name}</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {formatIndexPrice(sparkline.currentPrice)}
        </p>
        <p
          className="text-xs tabular-nums"
          style={{ color: summaryColor }}
        >
          {formatChangeValue(sparkline.change)} ({formatChangePercent(sparkline.changePercent)})
        </p>
      </div>

      {/* Right: sparkline chart */}
      {chartData.length > 1 && (
        <div className="h-10 w-20 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <XAxis
                dataKey="timestampMs"
                type="number"
                domain={[sessionStartMs, sessionEndMs]}
                hide
              />
              <YAxis
                type="number"
                domain={[yMin, yMax]}
                hide
                allowDataOverflow
              />
              <ReferenceLine
                y={previousClose}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.45}
                strokeDasharray="3 3"
              />
              <defs>
                <linearGradient id={`sparkGradUp-${sparkline.symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--success)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--success)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id={`sparkGradDown-${sparkline.symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--destructive)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--destructive)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="abovePrice"
                stroke="var(--success)"
                strokeWidth={1.5}
                fill={`url(#sparkGradUp-${sparkline.symbol})`}
                connectNulls={false}
                baseValue="dataMin"
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="belowPrice"
                stroke="var(--destructive)"
                strokeWidth={1.5}
                fill={`url(#sparkGradDown-${sparkline.symbol})`}
                connectNulls={false}
                baseValue="dataMin"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton — same 3-tile layout
// ---------------------------------------------------------------------------

function IndexTileSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-border/40 bg-card/50 px-3 py-2">
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-10 w-20 shrink-0" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public widget
// ---------------------------------------------------------------------------

export function MarketIndicesWidget() {
  const { data: sparklines, isLoading } = useMarketIndices();

  // Don't render the widget at all if data failed to load and we have nothing
  if (!isLoading && (!sparklines || sparklines.length === 0)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {isLoading
        ? Array.from({ length: 3 }).map((_, i) => <IndexTileSkeleton key={i} />)
        : sparklines?.map((s) => <IndexTile key={s.symbol} sparkline={s} />)}
    </div>
  );
}
