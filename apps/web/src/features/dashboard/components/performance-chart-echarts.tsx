import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface PerformanceChartProps {
  data: Array<{ tick: string; portfolio: number; benchmark: number }>;
  isDark: boolean;
}

export function PerformanceChartECharts({ data, isDark }: PerformanceChartProps) {
  const option = useMemo<EChartsOption>(() => {
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.08)';

    return {
      grid: {
        top: 10,
        right: 15,
        bottom: 5,
        left: 5,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(9,14,26,0.95)' : 'rgba(255,255,255,0.97)',
        borderColor: isDark ? 'rgba(63,63,70,0.78)' : '#e2e8f0',
        borderRadius: 10,
        textStyle: {
          color: isDark ? '#f8fafc' : '#0f172a',
          fontSize: 13,
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            width: 1,
          },
        },
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.tick),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 13,
          interval: 5,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 13,
          formatter: (value: number) => `${Math.round(value / 1000)}k`,
        },
        splitLine: {
          lineStyle: {
            color: gridColor,
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: 'Benchmark',
          type: 'line',
          data: data.map(item => item.benchmark),
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: isDark ? '#64748b' : '#94a3b8',
            width: 1.2,
          },
          emphasis: {
            disabled: true,
          },
        },
        {
          name: 'Portfolio',
          type: 'line',
          data: data.map(item => item.portfolio),
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#0891b2',
            width: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(8,145,178,0.26)' },
                { offset: 1, color: 'rgba(8,145,178,0.02)' },
              ],
            },
          },
          emphasis: {
            disabled: true,
          },
        },
      ],
    };
  }, [data, isDark]);

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
}
