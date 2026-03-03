import type { MarketQuote } from '@sightfi/shared';
import { ResponsiveContainer, Treemap } from 'recharts';

interface MarketHeatmapProps {
  quotes: MarketQuote[];
}

interface HeatCellData {
  [key: string]: string | number | HeatCellData[] | undefined;
  name: string;
  size?: number;
  color?: string;
  change?: string;
  children?: HeatCellData[];
}

interface HeatCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  payload?: { color?: string; change?: string };
}

function buildHeatData(quotes: MarketQuote[]): HeatCellData[] {
  const cells = quotes.slice(0, 12).map((item) => ({
    name: item.symbol,
    size: Math.max(60, Math.round(item.price * 3.5)),
    color: item.changePercent >= 0 ? '#10b981' : '#f43f5e',
    change: `${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`,
  }));

  if (cells.length === 0) {
    return [
      {
        name: 'Fallback',
        children: [
          { name: 'NVDA', size: 300, color: '#10b981', change: '+2.1%' },
          { name: 'AAPL', size: 260, color: '#10b981', change: '+0.9%' },
          { name: 'TSLA', size: 240, color: '#f43f5e', change: '-1.4%' },
          { name: 'MSFT', size: 230, color: '#10b981', change: '+0.8%' },
        ],
      },
    ];
  }

  return [
    { name: 'G1', children: cells.slice(0, 4) },
    { name: 'G2', children: cells.slice(4, 8) },
    { name: 'G3', children: cells.slice(8, 12) },
  ].filter((item) => (item.children?.length ?? 0) > 0);
}

function HeatCell({ x, y, width, height, name, payload }: HeatCellProps) {
  if (x === undefined || y === undefined || width === undefined || height === undefined) return null;
  const showLabel = width > 40 && height > 38;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        style={{
          fill: payload?.color ?? '#334155',
          stroke: 'rgba(15,23,42,0.45)',
          strokeWidth: 1.6,
          opacity: 0.9,
        }}
      />
      {showLabel ? (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={700}>
          {name ?? ''}
        </text>
      ) : null}
      {showLabel && payload?.change ? (
        <text x={x + width / 2} y={y + height / 2 + 14} textAnchor="middle" fill="rgba(255,255,255,0.78)" fontSize={10}>
          {payload.change}
        </text>
      ) : null}
    </g>
  );
}

export function MarketHeatmap({ quotes }: MarketHeatmapProps) {
  const data = buildHeatData(quotes);
  return (
    <div className="h-full w-full overflow-hidden rounded-xl">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap data={data} dataKey="size" aspectRatio={4 / 3} stroke="rgba(15,23,42,0.2)" content={<HeatCell />} />
      </ResponsiveContainer>
    </div>
  );
}

