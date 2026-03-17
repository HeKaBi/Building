<template>
  <aside class="art-timeline">
    <div class="art-timeline__wash"></div>
    <div class="art-timeline__petal art-timeline__petal--a"></div>
    <div class="art-timeline__petal art-timeline__petal--b"></div>
    <div class="art-timeline__mountain"></div>

    <div class="art-timeline__header">
      <div class="art-timeline__header-copy">
        <div class="art-timeline__title">建筑样本竖向时间轴</div>
      </div>

      <div class="art-timeline__focus">
        <strong :style="{ color: activePalette.accentColor }">{{ activeType }}</strong>
        <div class="art-timeline__focus-count">
          <em>{{ focusCount }}</em>
          <span>处建筑</span>
        </div>
        <small>{{ yearRangeLabel }}</small>
      </div>
    </div>

    <div ref="chartRef" class="art-timeline__chart"></div>
  </aside>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { LineChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import type { DashboardBuilding, DashboardCategory } from '@/demo/building-dashboard/types';

echarts.use([GridComponent, TooltipComponent, LineChart, ScatterChart, CanvasRenderer]);

interface TimelinePalette {
  color: string;
  accentColor: string;
}

interface TimelineBucket {
  start: number;
  end: number;
  centerYear: number;
  count: number;
  importance: number;
  items: DashboardBuilding[];
}

interface TimelinePointDatum {
  value: [number, number];
  kind: 'bubble' | 'milestone';
  bucketLabel: string;
  yearLabel: string;
  count: number;
  symbolSize: number;
  importance: number;
  itemStyle: {
    color: string;
    opacity: number;
    shadowBlur?: number;
    shadowColor?: string;
  };
  names: string[];
}

const props = defineProps<{
  buildings: DashboardBuilding[];
  activeType: DashboardCategory;
}>();

const categoryPalettes: Record<DashboardCategory, TimelinePalette> = {
  民居: { color: '#CD8585', accentColor: '#B56D6D' },
  官府: { color: '#9AA792', accentColor: '#7F8D79' },
  宫殿: { color: '#DBAE81', accentColor: '#BF936A' },
  桥梁: { color: '#8EA2AA', accentColor: '#6F8791' },
};

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

const activePalette = computed(() => categoryPalettes[props.activeType]);

const formatYear = (year: number) => (year < 0 ? `前${Math.abs(year)}` : `${year}`);

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const hashToUnit = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) % 9973;
  }
  return (hash % 1000) / 1000;
};

const activeBuildings = computed(() =>
  props.buildings
    .filter((item) => item.category === props.activeType)
    .slice()
    .sort((left, right) => left.year - right.year || right.importance - left.importance),
);

const rawMinYear = computed(() => {
  const years = activeBuildings.value.map((item) => item.year);
  return years.length ? Math.min(...years) : 0;
});

const rawMaxYear = computed(() => {
  const years = activeBuildings.value.map((item) => item.year);
  return years.length ? Math.max(...years) : 100;
});

const activeYearSpan = computed(() => Math.max(1, rawMaxYear.value - rawMinYear.value));

const tickInterval = computed(() => {
  if (activeYearSpan.value > 2000) return 250;
  if (activeYearSpan.value > 1200) return 100;
  if (activeYearSpan.value > 700) return 50;
  if (activeYearSpan.value > 240) return 25;
  if (activeYearSpan.value > 120) return 20;
  return 10;
});

const bucketSpan = computed(() => {
  if (activeYearSpan.value > 2000) return 80;
  if (activeYearSpan.value > 1200) return 50;
  if (activeYearSpan.value > 700) return 30;
  if (activeYearSpan.value > 240) return 20;
  return 10;
});

const axisPadding = computed(() => Math.max(tickInterval.value, Math.ceil(activeYearSpan.value * 0.06)));

const axisMin = computed(() => {
  if (!activeBuildings.value.length) return 0;
  return Math.floor((rawMinYear.value - axisPadding.value) / tickInterval.value) * tickInterval.value;
});

const axisMax = computed(() => {
  if (!activeBuildings.value.length) return 100;
  return Math.ceil((rawMaxYear.value + axisPadding.value) / tickInterval.value) * tickInterval.value;
});

const yAxisMin = computed(() => (axisMin.value === axisMax.value ? axisMin.value - tickInterval.value : axisMin.value));
const yAxisMax = computed(() => (axisMin.value === axisMax.value ? axisMax.value + tickInterval.value : axisMax.value));

const activeBuckets = computed(() => {
  const grouped = new Map<number, DashboardBuilding[]>();

  activeBuildings.value.forEach((item) => {
    const bucketStart = Math.floor(item.year / bucketSpan.value) * bucketSpan.value;
    const items = grouped.get(bucketStart) ?? [];
    items.push(item);
    grouped.set(bucketStart, items);
  });

  return Array.from(grouped.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([start, items]) => {
      const centerYear = items.reduce((sum, item) => sum + item.year, 0) / items.length;
      const importance = items.reduce((sum, item) => sum + item.importance, 0);

      return {
        start,
        end: start + bucketSpan.value - 1,
        centerYear,
        count: items.length,
        importance,
        items: [...items].sort((left, right) => right.importance - left.importance || left.year - right.year),
      } satisfies TimelineBucket;
    });
});

const maxBucketCount = computed(() => Math.max(1, ...activeBuckets.value.map((bucket) => bucket.count), 0));
const maxImportance = computed(() => Math.max(1, ...activeBuckets.value.map((bucket) => bucket.importance), 0));

const buildBucketLabel = (bucket: TimelineBucket) => `${formatYear(bucket.start)} - ${formatYear(bucket.end)}`;

const bubbleSizeForBucket = (bucket: TimelineBucket) => {
  const countRatio = bucket.count / Math.max(1, maxBucketCount.value);
  const importanceRatio = bucket.importance / Math.max(1, maxImportance.value);
  return Math.round(10 + countRatio * 22 + importanceRatio * 6);
};

const bubbleXOffset = (bucket: TimelineBucket) => {
  const seed = hashToUnit(`${props.activeType}-${bucket.start}`);
  const densityTighten = Math.min(0.06, (bucket.count / Math.max(1, maxBucketCount.value)) * 0.05);
  const span = 0.22 - densityTighten;
  return Number((0.46 + (seed - 0.5) * span).toFixed(3));
};

const milestoneBuckets = computed(() => {
  const sorted = [...activeBuckets.value].sort(
    (left, right) => right.count - left.count || right.importance - left.importance || left.centerYear - right.centerYear,
  );

  if (!sorted.length) return [];

  const threshold = sorted[0].count;
  return sorted.filter((bucket) => bucket.count >= 2 || bucket.count === threshold).slice(0, 3);
});

const bubbleSeriesData = computed<TimelinePointDatum[]>(() =>
  activeBuckets.value.map((bucket) => ({
    value: [bubbleXOffset(bucket), Number(bucket.centerYear.toFixed(1))],
    kind: 'bubble',
    bucketLabel: buildBucketLabel(bucket),
    yearLabel: `${formatYear(Math.round(bucket.centerYear))}年`,
    count: bucket.count,
    symbolSize: bubbleSizeForBucket(bucket),
    importance: bucket.importance,
    itemStyle: {
      color: activePalette.value.color,
      opacity: 0.68,
      shadowBlur: 16,
      shadowColor: withAlpha(activePalette.value.color, 0.24),
    },
    names: bucket.items.slice(0, 5).map((item) => item.name),
  })),
);

const milestoneSeriesData = computed<TimelinePointDatum[]>(() =>
  milestoneBuckets.value.map((bucket) => ({
    value: [0.46, Number(bucket.centerYear.toFixed(1))],
    kind: 'milestone',
    bucketLabel: buildBucketLabel(bucket),
    yearLabel: `${formatYear(Math.round(bucket.centerYear))}年`,
    count: bucket.count,
    symbolSize: Math.max(16, bubbleSizeForBucket(bucket) * 0.78),
    importance: bucket.importance,
    itemStyle: {
      color: activePalette.value.accentColor,
      opacity: 0.82,
      shadowBlur: 0,
      shadowColor: 'transparent',
    },
    names: bucket.items.slice(0, 4).map((item) => item.name),
  })),
);

const yearRangeLabel = computed(() => {
  if (!activeBuildings.value.length) return '暂无';
  return `${formatYear(rawMinYear.value)} - ${formatYear(rawMaxYear.value)}`;
});

const focusCount = computed(() => (activeBuildings.value.length ? `${activeBuildings.value.length}` : '--'));

const buildEmptyGraphic = (title: string, note: string) => [
  {
    type: 'group',
    left: 'center',
    top: 'middle',
    children: [
      {
        type: 'text',
        style: {
          text: title,
          fill: '#5C5955',
          font: '700 18px KaiTi',
          textAlign: 'center',
        },
        x: 0,
        y: -10,
      },
      {
        type: 'text',
        style: {
          text: note,
          fill: 'rgba(92, 89, 85, 0.74)',
          font: '12px Georgia',
          textAlign: 'center',
        },
        x: 0,
        y: 18,
      },
    ],
  },
];

const renderChart = () => {
  if (!chartRef.value) return;

  if (!chart) {
    chart = echarts.init(chartRef.value);
  }

  if (!activeBuildings.value.length) {
    chart.setOption(
      {
        tooltip: { show: false },
        graphic: buildEmptyGraphic('暂无时间轴数据', '当前类别没有可展示的建筑年代样本'),
        series: [],
      },
      true,
    );
    return;
  }

  chart.setOption(
    {
      backgroundColor: 'transparent',
      animationDuration: 420,
      animationDurationUpdate: 300,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(250, 246, 240, 0.96)',
        borderColor: 'rgba(92, 89, 85, 0.16)',
        borderWidth: 1,
        textStyle: {
          color: '#2C2A29',
          fontFamily: 'ContentFont',
          fontSize: 13,
        },
        formatter: (params: { data?: TimelinePointDatum }) => {
          const item = params.data;
          if (!item) return '';

          const preview = item.names.join('、');
          const title = item.kind === 'milestone' ? '高峰时段' : '样本分布';

          return [
            `<div style="max-width: 220px">`,
            `<div style="font-weight:700; margin-bottom:4px;">${props.activeType} · ${title}</div>`,
            `<div>年份：${item.yearLabel}</div>`,
            `<div>区段：${item.bucketLabel}</div>`,
            `<div>样本数：${item.count}</div>`,
            preview ? `<div style="margin-top:6px; line-height:1.5;">样本：${preview}</div>` : '',
            `</div>`,
          ].join('');
        },
      },
      grid: {
        left: '24%',
        right: '12%',
        top: '4%',
        bottom: '5%',
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: 1,
        show: false,
      },
      yAxis: {
        type: 'value',
        min: yAxisMin.value,
        max: yAxisMax.value,
        inverse: true,
        interval: tickInterval.value,
        axisLabel: {
          showMinLabel: true,
          showMaxLabel: true,
          hideOverlap: true,
          margin: 12,
          color: '#2C2A29',
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: 'bold',
          fontSize: 11,
          formatter: (value: number) => (value === yAxisMax.value ? `${formatYear(value)}(年)` : formatYear(value)),
        },
        axisTick: {
          show: true,
          length: 4,
          lineStyle: {
            color: 'rgba(92, 89, 85, 0.78)',
          },
        },
        axisLine: {
          show: false,
        },
        splitLine: {
          show: false,
        },
      },
      series: [
        {
          type: 'line',
          data: [
            [0.46, yAxisMin.value],
            [0.46, yAxisMax.value],
          ],
          symbol: 'none',
          silent: true,
          lineStyle: {
            color: 'rgba(92, 89, 85, 0.76)',
            width: 1.2,
          },
          z: 1,
        },
        {
          type: 'scatter',
          symbol: 'circle',
          data: bubbleSeriesData.value,
          symbolSize: (value: number[], params: { data: TimelinePointDatum }) => params.data.symbolSize,
          z: 3,
        },
        {
          type: 'scatter',
          symbol: 'triangle',
          symbolRotate: 0,
          data: milestoneSeriesData.value,
          symbolSize: (value: number[], params: { data: TimelinePointDatum }) => params.data.symbolSize,
          z: 4,
        },
      ],
    },
    true,
  );

  chart.resize();
};

const handleResize = () => {
  chart?.resize();
};

watch(
  () => [props.buildings, props.activeType],
  () => {
    nextTick(() => {
      renderChart();
    });
  },
  { deep: true, flush: 'post' },
);

onMounted(() => {
  nextTick(() => {
    renderChart();
  });

  window.addEventListener('resize', handleResize);

  if (typeof ResizeObserver !== 'undefined' && chartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      handleResize();
      renderChart();
    });
    resizeObserver.observe(chartRef.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  resizeObserver?.disconnect();
  resizeObserver = null;
  chart?.dispose();
  chart = null;
});
</script>

<style scoped lang="scss">
.art-timeline {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 34px 18px 30px 16px;
  background:
    linear-gradient(180deg, rgba(244, 239, 234, 0.96), rgba(239, 232, 223, 0.94)),
    radial-gradient(circle at 18% 16%, rgba(255, 255, 255, 0.5), transparent 22%);
  box-shadow:
    0 18px 36px rgba(72, 52, 40, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.34);
}

.art-timeline__wash,
.art-timeline__mountain {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.art-timeline__wash {
  background:
    radial-gradient(circle at 10% 12%, rgba(255, 255, 255, 0.42), transparent 16%),
    radial-gradient(circle at 82% 24%, rgba(232, 214, 196, 0.18), transparent 20%),
    repeating-linear-gradient(135deg, rgba(123, 104, 86, 0.026) 0, rgba(123, 104, 86, 0.026) 1px, transparent 1px, transparent 16px);
  opacity: 0.9;
}

.art-timeline__mountain {
  inset: auto -8% -10% auto;
  width: 70%;
  height: 22%;
  background:
    radial-gradient(circle at 20% 90%, rgba(83, 78, 72, 0.12), transparent 44%),
    linear-gradient(180deg, transparent, rgba(110, 103, 96, 0.08));
  filter: blur(12px);
}

.art-timeline__petal {
  position: absolute;
  width: 16px;
  height: 28px;
  border-radius: 50% 50% 45% 45%;
  background: rgba(242, 173, 191, 0.58);
  transform: rotate(24deg);
  filter: blur(0.4px);
  pointer-events: none;
}

.art-timeline__petal--a {
  top: 15%;
  right: 10%;
}

.art-timeline__petal--b {
  bottom: 18%;
  right: 18%;
  transform: rotate(-18deg);
}

.art-timeline__header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 16px 8px;
}

.art-timeline__header-copy {
  display: grid;
  gap: 0;
  min-width: 0;
}

.art-timeline__title {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 22px;
  line-height: 1.08;
  color: #2C2A29;
}

.art-timeline__focus {
  display: grid;
  gap: 2px;
  justify-items: end;
  flex-shrink: 0;
  min-width: 124px;
  padding: 8px 12px;
  border-radius: 16px 12px 14px 10px;
  background: rgba(255, 255, 255, 0.34);
}

.art-timeline__focus small {
  font-family: 'ContentFont', serif;
  color: rgba(92, 89, 85, 0.72);
}

.art-timeline__focus strong {
  font-family: 'KaiTi', 'STKaiti', 'Songti SC', serif;
  font-size: 22px;
  line-height: 1;
}

.art-timeline__focus-count {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.art-timeline__focus-count em {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  font-weight: 700;
  color: #2C2A29;
}

.art-timeline__focus-count span {
  font-family: 'ContentFont', serif;
  font-size: 11px;
  color: rgba(92, 89, 85, 0.82);
}

.art-timeline__focus small {
  font-size: 11px;
  line-height: 1.4;
  text-align: right;
}

.art-timeline__chart {
  position: relative;
  z-index: 2;
  flex: 1;
  min-height: 0;
  width: 100%;
}

@media (max-width: 1400px) {
  .art-timeline__title {
    font-size: 20px;
  }

  .art-timeline__header {
    padding-bottom: 6px;
  }
}

@media (max-width: 1180px) {
  .art-timeline__header {
    flex-direction: column;
    align-items: stretch;
  }

  .art-timeline__focus {
    justify-items: start;
  }

  .art-timeline__focus small {
    text-align: left;
  }
}
</style>
