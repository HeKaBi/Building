<template>
  <aside class="dashboard-timeline" :style="{ '--timeline-accent': accent }">
    <div class="dashboard-timeline__header">
      <div class="dashboard-timeline__seal">纪</div>

      <div class="dashboard-timeline__header-copy">
        <div class="dashboard-timeline__eyebrow">营造纪年</div>
        <div class="dashboard-timeline__title">时间轴</div>
        <div class="dashboard-timeline__subtitle">{{ subtitle }}</div>
      </div>
    </div>

    <div class="dashboard-timeline__focus">
      <span class="dashboard-timeline__focus-label">当前时段</span>
      <strong>{{ activeFocusLabel }}</strong>

      <button
        v-if="activeRange"
        type="button"
        class="dashboard-timeline__clear"
        @click="emit('select-range', null)"
      >
        查看全部
      </button>
    </div>

    <div class="dashboard-timeline__chart-shell">
      <div class="dashboard-timeline__ornament dashboard-timeline__ornament--top"></div>
      <div class="dashboard-timeline__ornament dashboard-timeline__ornament--bottom"></div>

      <div ref="chartRef" class="dashboard-timeline__chart"></div>

      <div
        v-if="selectedMarkerTop !== null"
        class="dashboard-timeline__marker"
        :style="{ top: `${selectedMarkerTop}px` }"
      ></div>
    </div>

    <div class="dashboard-timeline__footer">
      <span>{{ bucketSpan }} 年分箱</span>
      <span>{{ buildings.length }} 个样本</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { GraphicComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { EffectScatterChart, LineChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import type { DashboardBuilding, DashboardYearRange } from '../types';

echarts.use([GraphicComponent, GridComponent, TooltipComponent, LineChart, ScatterChart, EffectScatterChart, CanvasRenderer]);

interface TimelineBucket {
  start: number;
  end: number;
  count: number;
  items: DashboardBuilding[];
}

const props = withDefaults(
  defineProps<{
    buildings: DashboardBuilding[];
    activeRange: DashboardYearRange | null;
    accent?: string;
  }>(),
  {
    accent: '#4f7462',
  },
);

const emit = defineEmits<{
  'select-range': [range: DashboardYearRange | null];
}>();

const chartRef = ref<HTMLDivElement | null>(null);
const selectedMarkerTop = ref<number | null>(null);
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

const formatYear = (year: number) => (year < 0 ? `前${Math.abs(year)}` : `${year}`);

const withAlpha = (color: string, alpha: number) => {
  const normalized = color.replace('#', '');

  if (normalized.length === 3) {
    const [r, g, b] = normalized.split('').map((token) => Number.parseInt(token + token, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  if (normalized.length === 6) {
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
};

const orderedBuildings = computed(() =>
  [...props.buildings].sort((left, right) => left.year - right.year || right.importance - left.importance),
);

const rawMinYear = computed(() => {
  const years = orderedBuildings.value.map((item) => item.year);
  return years.length ? Math.min(...years) : 0;
});

const rawMaxYear = computed(() => {
  const years = orderedBuildings.value.map((item) => item.year);
  return years.length ? Math.max(...years) : 100;
});

const rangeSpan = computed(() => rawMaxYear.value - rawMinYear.value);

const yearInterval = computed(() => {
  if (rangeSpan.value > 1500) {
    return 200;
  }

  if (rangeSpan.value > 800) {
    return 100;
  }

  if (rangeSpan.value > 360) {
    return 50;
  }

  return 25;
});

const bucketSpan = computed(() => {
  if (rangeSpan.value > 1500) {
    return 120;
  }

  if (rangeSpan.value > 800) {
    return 80;
  }

  if (rangeSpan.value > 360) {
    return 50;
  }

  return 25;
});

const minYear = computed(() => Math.floor(rawMinYear.value / yearInterval.value) * yearInterval.value);
const maxYear = computed(() => Math.ceil(rawMaxYear.value / yearInterval.value) * yearInterval.value);

const subtitle = computed(() =>
  orderedBuildings.value.length
    ? `按 ${bucketSpan.value} 年区间聚合样本，点击节点锁定时段。`
    : '当前筛选下暂无可用样本。',
);

const activeFocusLabel = computed(() => {
  if (!orderedBuildings.value.length) {
    return '暂无样本';
  }

  if (!props.activeRange) {
    return '全部时段';
  }

  return `${formatYear(props.activeRange.start)} - ${formatYear(props.activeRange.end)}`;
});

const buckets = computed<TimelineBucket[]>(() => {
  const grouped = new Map<number, DashboardBuilding[]>();

  for (const item of orderedBuildings.value) {
    const start = Math.floor(item.year / bucketSpan.value) * bucketSpan.value;
    const list = grouped.get(start) ?? [];
    list.push(item);
    grouped.set(start, list);
  }

  return Array.from(grouped.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([start, items]) => ({
      start,
      end: start + bucketSpan.value - 1,
      count: items.length,
      items,
    }));
});

const maxCount = computed(() => Math.max(1, ...buckets.value.map((bucket) => bucket.count)));
const xAxisMax = computed(() => Math.max(3, maxCount.value + 1));

const selectedBucket = computed(() => {
  if (!props.activeRange) {
    return null;
  }

  return (
    buckets.value.find((bucket) => bucket.start === props.activeRange?.start && bucket.end === props.activeRange?.end) ??
    null
  );
});

const selectedBucketYear = computed(() =>
  selectedBucket.value ? selectedBucket.value.start + (selectedBucket.value.end - selectedBucket.value.start) / 2 : null,
);

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
          fill: '#6a4d3f',
          font: '600 18px ContentFont',
          textAlign: 'center',
        },
        x: 0,
        y: -10,
      },
      {
        type: 'text',
        style: {
          text: note,
          fill: 'rgba(92, 70, 58, 0.72)',
          font: '12px ContentFont',
          textAlign: 'center',
        },
        x: 0,
        y: 18,
      },
    ],
  },
];

const handleBucketClick = (bucketStart: number | null | undefined) => {
  if (bucketStart === null || bucketStart === undefined) {
    return;
  }

  const bucket = buckets.value.find((item) => item.start === bucketStart);
  if (!bucket) {
    return;
  }

  const isActive = props.activeRange?.start === bucket.start && props.activeRange?.end === bucket.end;
  emit('select-range', isActive ? null : { start: bucket.start, end: bucket.end });
};

const syncMarkerPosition = () => {
  if (!chart || !selectedBucket.value || selectedBucketYear.value === null) {
    selectedMarkerTop.value = null;
    return;
  }

  const pixel = chart.convertToPixel(
    { xAxisIndex: 0, yAxisIndex: 0 },
    [selectedBucket.value.count, selectedBucketYear.value],
  ) as number[];

  selectedMarkerTop.value = Array.isArray(pixel) ? pixel[1] : null;
};

const renderChart = () => {
  if (!chartRef.value) {
    return;
  }

  if (!chart) {
    chart = echarts.init(chartRef.value);

    chart.on('click', (params) => {
      const bucketStart = (params.data as { bucketStart?: number } | undefined)?.bucketStart;
      handleBucketClick(bucketStart);
    });

    chart.on('finished', syncMarkerPosition);
  }

  if (!orderedBuildings.value.length) {
    chart.setOption(
      {
        tooltip: { show: false },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
        graphic: buildEmptyGraphic('当前时段没有样本', '请切换朝代或回到全部时段'),
      },
      { notMerge: true },
    );
    selectedMarkerTop.value = null;
    return;
  }

  const pointColor = withAlpha(props.accent, 0.88);
  const lineData = buckets.value.map((bucket) => ({
    value: [bucket.count, bucket.start + bucketSpan.value / 2],
    bucketStart: bucket.start,
    bucketEnd: bucket.end,
    count: bucket.count,
  }));

  const pointData = buckets.value.map((bucket) => ({
    value: [bucket.count, bucket.start + bucketSpan.value / 2],
    bucketStart: bucket.start,
    bucketEnd: bucket.end,
    count: bucket.count,
    itemStyle: {
      color: pointColor,
      borderColor: 'rgba(248, 241, 230, 0.98)',
      borderWidth: 1.4,
      shadowBlur: 9,
      shadowColor: withAlpha(props.accent, 0.18),
    },
    symbolSize: Math.min(16, 7 + Math.sqrt(Math.max(1, bucket.count)) * 1.25),
  }));

  const focusData =
    selectedBucket.value && selectedBucketYear.value !== null
      ? [
          {
            value: [selectedBucket.value.count, selectedBucketYear.value],
            bucketStart: selectedBucket.value.start,
            bucketEnd: selectedBucket.value.end,
            count: selectedBucket.value.count,
            itemStyle: {
              color: props.accent,
              borderColor: 'rgba(255, 248, 239, 0.98)',
              borderWidth: 2,
              shadowBlur: 12,
              shadowColor: withAlpha(props.accent, 0.24),
            },
            symbolSize: 18,
          },
        ]
      : [];

  chart.setOption(
    {
      backgroundColor: 'transparent',
      animationDurationUpdate: 260,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(248, 242, 232, 0.96)',
        borderColor: 'rgba(151, 117, 93, 0.22)',
        borderWidth: 1,
        textStyle: {
          color: '#4f3b2f',
          fontFamily: 'ContentFont',
          fontSize: 12,
        },
        formatter: (params: any) => {
          const start = Number(params.data.bucketStart);
          const end = Number(params.data.bucketEnd);
          return `${formatYear(start)} - ${formatYear(end)}<br/>建筑数量：${params.data.count}`;
        },
      },
      grid: {
        top: 54,
        right: 28,
        bottom: 28,
        left: 44,
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: xAxisMax.value,
        position: 'top',
        axisLabel: {
          color: 'rgba(106, 78, 64, 0.72)',
          fontFamily: 'ContentFont',
          fontSize: 10,
        },
        splitNumber: 4,
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
            color: 'rgba(126, 109, 80, 0.12)',
          },
        },
        axisTick: {
          show: false,
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(116, 93, 78, 0.22)',
          },
        },
      },
      yAxis: {
        type: 'value',
        inverse: true,
        min: minYear.value,
        max: maxYear.value,
        interval: yearInterval.value,
        axisLabel: {
          color: 'rgba(130, 91, 75, 0.88)',
          fontFamily: 'ContentFont',
          fontSize: 11,
          formatter: (value: number) => formatYear(value),
        },
        splitLine: {
          show: false,
        },
        axisTick: {
          show: true,
          inside: true,
          length: 4,
          lineStyle: {
            color: withAlpha(props.accent, 0.42),
          },
        },
        axisLine: {
          lineStyle: {
            color: withAlpha(props.accent, 0.78),
            width: 1.2,
          },
        },
      },
      graphic: [],
      series: [
        {
          type: 'line',
          data: lineData,
          smooth: 0.34,
          symbol: 'none',
          lineStyle: {
            color: props.accent,
            width: 2.7,
            shadowBlur: 10,
            shadowColor: withAlpha(props.accent, 0.16),
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
              { offset: 0, color: withAlpha(props.accent, 0.2) },
              { offset: 0.55, color: withAlpha(props.accent, 0.08) },
              { offset: 1, color: withAlpha(props.accent, 0) },
            ]),
          },
        },
        {
          type: 'scatter',
          data: pointData,
          z: 4,
        },
        {
          type: 'effectScatter',
          data: focusData,
          z: 5,
          rippleEffect: {
            scale: 3.4,
            brushType: 'stroke',
          },
        },
      ],
    },
    { notMerge: true },
  );

  chart.resize();
  nextTick(() => {
    syncMarkerPosition();
  });
};

const handleResize = () => {
  chart?.resize();
  syncMarkerPosition();
};

watch(
  () => [props.buildings, props.activeRange, props.accent],
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
    });
    resizeObserver.observe(chartRef.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  resizeObserver?.disconnect();
  resizeObserver = null;
  chart?.off('finished', syncMarkerPosition);
  chart?.dispose();
  chart = null;
});
</script>

<style scoped lang="scss">
.dashboard-timeline {
  --timeline-accent: #4f7462;
  position: relative;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 12px;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 16px 14px 14px;
  overflow: hidden;
  border: 1px solid rgba(147, 111, 86, 0.22);
  border-radius: 28px 10px 28px 10px;
  background:
    linear-gradient(180deg, rgba(243, 235, 221, 0.96), rgba(232, 220, 201, 0.92)),
    radial-gradient(circle at 16% 14%, rgba(255, 255, 255, 0.24), transparent 28%),
    repeating-linear-gradient(
      135deg,
      rgba(129, 98, 77, 0.028) 0,
      rgba(129, 98, 77, 0.028) 1px,
      transparent 1px,
      transparent 16px
    );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    0 16px 32px rgba(72, 52, 40, 0.11);
}

.dashboard-timeline::before,
.dashboard-timeline::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(161, 63, 51, 0.42), transparent);
}

.dashboard-timeline::before {
  top: 68px;
}

.dashboard-timeline::after {
  bottom: 14px;
}

.dashboard-timeline__header {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.dashboard-timeline__seal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 42px;
  border-radius: 10px 4px 10px 4px;
  border: 1px solid rgba(163, 72, 58, 0.3);
  background: linear-gradient(180deg, rgba(166, 74, 60, 0.12), rgba(166, 74, 60, 0.05));
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 20px;
  color: #9d4033;
}

.dashboard-timeline__header-copy {
  display: grid;
  gap: 4px;
}

.dashboard-timeline__eyebrow {
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.24em;
  color: rgba(105, 78, 64, 0.62);
}

.dashboard-timeline__title {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 24px;
  line-height: 1.05;
  color: #7f3024;
}

.dashboard-timeline__subtitle {
  font-family: 'ContentFont', serif;
  font-size: 11px;
  line-height: 1.55;
  color: rgba(91, 66, 52, 0.72);
}

.dashboard-timeline__focus {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid rgba(149, 117, 94, 0.16);
  border-radius: 14px;
  background: rgba(247, 241, 231, 0.72);
}

.dashboard-timeline__focus-label {
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: rgba(112, 84, 68, 0.62);
}

.dashboard-timeline__focus strong {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 22px;
  color: #6b3026;
  line-height: 1.1;
}

.dashboard-timeline__clear {
  justify-self: start;
  padding: 6px 10px 5px;
  border: 1px solid rgba(151, 117, 93, 0.18);
  border-radius: 999px;
  background: rgba(248, 242, 234, 0.82);
  font-family: 'ContentFont', serif;
  font-size: 12px;
  color: rgba(84, 62, 49, 0.82);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease;
}

.dashboard-timeline__clear:hover {
  transform: translateY(-1px);
  border-color: rgba(160, 74, 59, 0.26);
}

.dashboard-timeline__chart-shell {
  position: relative;
  min-height: 0;
  padding: 14px 0;
}

.dashboard-timeline__ornament {
  position: absolute;
  left: 20px;
  right: 20px;
  height: 16px;
  pointer-events: none;
}

.dashboard-timeline__ornament::before,
.dashboard-timeline__ornament::after {
  content: '';
  position: absolute;
  top: 7px;
  width: 42%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(124, 92, 73, 0.26), transparent);
}

.dashboard-timeline__ornament::before {
  left: 0;
}

.dashboard-timeline__ornament::after {
  right: 0;
}

.dashboard-timeline__ornament--top {
  top: 0;
}

.dashboard-timeline__ornament--bottom {
  bottom: 0;
}

.dashboard-timeline__chart {
  width: 100%;
  height: 100%;
  min-height: 360px;
}

.dashboard-timeline__marker {
  position: absolute;
  left: 18px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--timeline-accent);
  box-shadow:
    0 0 0 5px rgba(255, 250, 243, 0.78),
    0 0 0 10px rgba(79, 116, 98, 0.12);
  transform: translate(-50%, -50%);
}

.dashboard-timeline__footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 2px 0;
  font-family: 'ContentFont', serif;
  font-size: 11px;
  color: rgba(91, 66, 52, 0.68);
}

@media (max-width: 1100px) {
  .dashboard-timeline {
    min-height: 420px;
  }

  .dashboard-timeline__chart {
    min-height: 320px;
  }
}
</style>
