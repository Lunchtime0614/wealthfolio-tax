import { useMarketIndices } from "@/hooks/use-market-indices";
import type { IndexSparkline } from "@/lib/types";
import { Skeleton } from "@wealthfolio/ui/components/ui/skeleton";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

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

function IndexTile({ sparkline }: IndexTileProps) {
  const isPositive = sparkline.change >= 0;
  const color = isPositive ? "var(--success)" : "var(--destructive)";

  const chartData = sparkline.points.map((p) => ({
    price: p.price,
    timestampMs: p.timestamp * 1000,
  }));
  const sessionStartMs = chartData[0]?.timestampMs ?? Date.now();
  const sessionEndMs = sessionStartMs + (6 * 60 + 30) * 60 * 1000;
  const prices = chartData.map((p) => p.price);
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
          style={{ color }}
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
              <defs>
                <linearGradient id={`sparkGrad-${sparkline.symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#sparkGrad-${sparkline.symbol})`}
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
