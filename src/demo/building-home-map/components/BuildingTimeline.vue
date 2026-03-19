<template>
  <div class="line-timeline">
    <div class="line-timeline__header">
      <div class="line-timeline__titles">
        <span class="line-timeline__title-item">{{ uiText.yearTitle }}</span>
        <span class="line-timeline__title-item">{{ uiText.listTitle }}</span>
      </div>

      <div class="line-timeline__legend">
        <div class="line-timeline__legend-item">
          <i class="line-timeline__legend-dot line-timeline__legend-dot--primary"></i>
          <span>{{ uiText.primaryLegend }}</span>
        </div>
        <div class="line-timeline__legend-item">
          <i class="line-timeline__legend-dot line-timeline__legend-dot--secondary"></i>
          <span>{{ uiText.secondaryLegend }}</span>
        </div>
      </div>
    </div>

    <div class="line-timeline__chart-shell">
      <div ref="chartRef" class="line-timeline__chart"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { LineChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { getDominantStructure, getStructureColor, getStructureType } from '@/demo/building-home-map/metadata';

import type { BuildingRecord } from '../types';

echarts.use([GridComponent, TooltipComponent, LineChart, ScatterChart, CanvasRenderer]);

interface DensityBucket {
  start: number;
  end: number;
  count: number;
  buildings: BuildingRecord[];
}

interface BucketMetric {
  start: number;
  centerYear: number;
  primaryWidth: number;
  secondaryWidth: number;
}

const props = defineProps<{
  buildings: BuildingRecord[];
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [buildingId: string];
}>();

const BUCKET_SPAN = 50;
const MAJOR_YEAR_INTERVAL = 100;
const JAGGED_YEAR_STEP = 10;
const BASE_X_MAX = 5.6;

const uiText = {
  yearTitle: '年份',
  listTitle: '建筑列表',
  primaryLegend: '建筑面积',
  secondaryLegend: '占地面积',
} as const;

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;

const selectedBuilding = computed(() => props.buildings.find((building) => building.id === props.selectedId) ?? null);

const buckets = computed<DensityBucket[]>(() => {
  const grouped = new Map<number, BuildingRecord[]>();

  for (const building of props.buildings) {
    const bucketStart = Math.floor(building.year / BUCKET_SPAN) * BUCKET_SPAN;
    const list = grouped.get(bucketStart) ?? [];
    list.push(building);
    grouped.set(bucketStart, list);
  }

  return Array.from(grouped.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([start, buildings]) => ({
      start,
      end: start + BUCKET_SPAN - 1,
      count: buildings.length,
      buildings: [...buildings].sort((left, right) => left.year - right.year || right.importance - left.importance),
    }));
});

const maxCount = computed(() =>
  Math.max(
    1,
    ...buckets.value.map((bucket) => bucket.count),
  ),
);

const minYear = computed(() => {
  const values = props.buildings.map((building) => building.year);
  return values.length ? Math.floor(Math.min(...values) / 100) * 100 : 0;
});

const maxYear = computed(() => {
  const values = props.buildings.map((building) => building.year);
  return values.length ? Math.ceil(Math.max(...values) / 100) * 100 : 100;
});

const bucketMetrics = computed<BucketMetric[]>(() =>
  buckets.value.map((bucket) => {
    const dominantStructure = getDominantStructure(bucket.buildings);
    const dominantCount = bucket.buildings.filter((item) => getStructureType(item) === dominantStructure).length;
    const countRatio = bucket.count / maxCount.value;
    const dominantRatio = dominantCount / Math.max(1, bucket.count);

    return {
      start: bucket.start,
      centerYear: bucket.start + BUCKET_SPAN / 2,
      primaryWidth: 1.05 + countRatio * 2.55,
      secondaryWidth: 0.52 + dominantRatio * 1.18 + countRatio * 0.68,
    };
  }),
);

const xAxisMax = computed(() => {
  const widestPrimary = Math.max(0, ...bucketMetrics.value.map((item) => item.primaryWidth));
  return Math.max(BASE_X_MAX, widestPrimary + 2.1);
});

const selectedBucketStart = computed(() => {
  if (selectedBuilding.value) {
    return Math.floor(selectedBuilding.value.year / BUCKET_SPAN) * BUCKET_SPAN;
  }

  return buckets.value[0]?.start ?? null;
});

const selectedBucket = computed(
  () => buckets.value.find((bucket) => bucket.start === selectedBucketStart.value) ?? null,
);

const selectedBucketYear = computed(() => (selectedBucket.value ? selectedBucket.value.start + BUCKET_SPAN / 2 : null));

const selectedMarkerColor = computed(() =>
  selectedBucket.value ? getStructureColor(getDominantStructure(selectedBucket.value.buildings)) : '#6d7a5e',
);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const deterministicNoise = (seed: number, amplitude: number) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  const normalized = value - Math.floor(value);
  return (normalized * 2 - 1) * amplitude;
};

const interpolateMetric = (year: number, key: 'primaryWidth' | 'secondaryWidth') => {
  const metrics = bucketMetrics.value;
  if (!metrics.length) {
    return key === 'primaryWidth' ? 1.2 : 0.72;
  }

  if (year <= metrics[0].centerYear) {
    return metrics[0][key];
  }

  const last = metrics[metrics.length - 1];
  if (year >= last.centerYear) {
    return last[key];
  }

  for (let index = 1; index < metrics.length; index += 1) {
    const previous = metrics[index - 1];
    const current = metrics[index];
    if (year <= current.centerYear) {
      const progress = (year - previous.centerYear) / Math.max(1, current.centerYear - previous.centerYear);
      return previous[key] + (current[key] - previous[key]) * progress;
    }
  }

  return last[key];
};

const buildJaggedAreaData = (key: 'primaryWidth' | 'secondaryWidth', amplitude: number) => {
  const values: [number, number][] = [];
  const start = minYear.value;
  const end = maxYear.value;

  for (let year = start; year <= end; year += JAGGED_YEAR_STEP) {
    const base = interpolateMetric(year, key);
    const noise = deterministicNoise(year + (key === 'primaryWidth' ? 17 : 43), amplitude);
    const fallbackMax = xAxisMax.value - (key === 'primaryWidth' ? 1.46 : 2.08);
    values.push([clamp(base + noise, 0.24, fallbackMax), year]);
  }

  if (!values.length || values[values.length - 1][1] !== end) {
    const base = interpolateMetric(end, key);
    const noise = deterministicNoise(end + (key === 'primaryWidth' ? 17 : 43), amplitude);
    const fallbackMax = xAxisMax.value - (key === 'primaryWidth' ? 1.46 : 2.08);
    values.push([clamp(base + noise, 0.24, fallbackMax), end]);
  }

  return values;
};

const handleBucketClick = (bucketStart: number | null | undefined) => {
  if (bucketStart === null || bucketStart === undefined) {
    return;
  }

  const bucket = buckets.value.find((item) => item.start === bucketStart);
  const preferred = bucket?.buildings.find((building) => building.id === props.selectedId) ?? bucket?.buildings[0];

  if (preferred) {
    emit('select', preferred.id);
  }
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
  }

  const primaryAreaData = buildJaggedAreaData('primaryWidth', 0.24);
  const secondaryAreaData = buildJaggedAreaData('secondaryWidth', 0.2);

  const pointData = buckets.value.map((bucket) => ({
    value: [interpolateMetric(bucket.start + BUCKET_SPAN / 2, 'secondaryWidth'), bucket.start + BUCKET_SPAN / 2],
    bucketStart: bucket.start,
    count: bucket.count,
    itemStyle: {
      color: getStructureColor(getDominantStructure(bucket.buildings)),
      borderColor: 'rgba(236, 227, 210, 0.98)',
      borderWidth: 1,
    },
    symbolSize: 8 + Math.sqrt(bucket.count) * 1.2,
  }));

  const hitAreaData = buckets.value.map((bucket) => ({
    value: [interpolateMetric(bucket.start + BUCKET_SPAN / 2, 'secondaryWidth'), bucket.start + BUCKET_SPAN / 2],
    bucketStart: bucket.start,
    count: bucket.count,
    symbolSize: 18,
    itemStyle: {
      color: 'rgba(0,0,0,0)',
    },
  }));

  const focusData = selectedBucket.value && selectedBucketYear.value !== null
    ? [
      {
        value: [interpolateMetric(selectedBucketYear.value, 'secondaryWidth'), selectedBucketYear.value],
        bucketStart: selectedBucket.value.start,
        itemStyle: {
          color: selectedMarkerColor.value,
          borderColor: 'rgba(236, 227, 210, 0.92)',
          borderWidth: 1.4,
        },
        symbolSize: [26, 14],
      },
    ]
    : [];

  const rightWideStripX = xAxisMax.value - 0.78;
  const rightThinStripX = xAxisMax.value - 0.28;
  const selectedBandHalf = 20;
  const selectedBandStart =
    selectedBucketYear.value === null ? null : clamp(selectedBucketYear.value - selectedBandHalf, minYear.value, maxYear.value);
  const selectedBandEnd =
    selectedBucketYear.value === null ? null : clamp(selectedBucketYear.value + selectedBandHalf, minYear.value, maxYear.value);

  chart.setOption({
    backgroundColor: 'transparent',
    animationDurationUpdate: 280,
    animationEasingUpdate: 'cubicOut',
    grid: {
      top: 18,
      right: 8,
      bottom: 14,
      left: 38,
      containLabel: false,
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: 'rgba(92, 86, 76, 0.94)',
      borderColor: 'rgba(112, 147, 120, 0.44)',
      borderWidth: 1,
      className: 'line-timeline-tooltip',
      textStyle: {
        color: '#f4eee1',
        fontFamily: "'STSong', 'SimSun', serif",
        fontSize: 11,
      },
      formatter: (params: { data?: { bucketStart?: number } }) => {
        const bucketStart = params.data?.bucketStart;
        if (bucketStart === undefined) {
          return '';
        }

        const bucket = buckets.value.find((item) => item.start === bucketStart);
        if (!bucket) {
          return '';
        }

        return [
          `<div>建置：${bucket.start} - ${bucket.end}</div>`,
          `<div>样本数：${bucket.count}</div>`,
        ].join('');
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: xAxisMax.value,
      axisLabel: { show: false },
      splitLine: {
        show: false,
      },
      axisLine: {
        show: false,
      },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      inverse: true,
      min: minYear.value,
      max: maxYear.value,
      interval: MAJOR_YEAR_INTERVAL,
      axisLabel: {
        color: '#705749',
        fontFamily: "'STSong', 'SimSun', serif",
        fontSize: 11,
        margin: 6,
      },
      splitLine: {
        show: false,
      },
      axisTick: {
        show: true,
        inside: false,
        length: 5,
        lineStyle: {
          color: 'rgba(168, 60, 59, 0.92)',
          width: 1,
        },
      },
      minorTick: {
        show: true,
        splitNumber: 10,
        length: 2,
        lineStyle: {
          color: 'rgba(168, 60, 59, 0.68)',
        },
      },
      axisLine: {
        lineStyle: {
          color: '#a83c3b',
          width: 1,
          type: 'solid',
        },
      },
    },
    series: [
      {
        type: 'line',
        data: primaryAreaData,
        smooth: false,
        symbol: 'none',
        silent: true,
        z: 1,
        lineStyle: {
          color: 'rgba(155, 161, 157, 0.64)',
          width: 1,
        },
        areaStyle: {
          color: 'rgba(155, 161, 157, 0.5)',
          opacity: 1,
          origin: 'start',
        },
      },
      {
        type: 'line',
        data: secondaryAreaData,
        smooth: false,
        symbol: 'none',
        silent: true,
        z: 2,
        lineStyle: {
          color: 'rgba(101, 126, 101, 0.9)',
          width: 1,
        },
        areaStyle: {
          color: 'rgba(101, 126, 101, 0.7)',
          opacity: 1,
          origin: 'start',
        },
      },
      {
        type: 'line',
        data: [
          [rightWideStripX, minYear.value],
          [rightWideStripX, maxYear.value],
        ],
        symbol: 'none',
        silent: true,
        z: 1,
        lineStyle: {
          color: 'rgba(170, 178, 166, 0.96)',
          width: 12,
        },
      },
      {
        type: 'line',
        data: [
          [rightThinStripX, minYear.value],
          [rightThinStripX, maxYear.value],
        ],
        symbol: 'none',
        silent: true,
        z: 1,
        lineStyle: {
          color: 'rgba(212, 219, 204, 0.88)',
          width: 9,
        },
      },
      {
        type: 'line',
        data:
          selectedBandStart !== null && selectedBandEnd !== null
            ? [
              [rightThinStripX, selectedBandStart],
              [rightThinStripX, selectedBandEnd],
            ]
            : [],
        symbol: 'none',
        silent: true,
        z: 4,
        lineStyle: {
          color: '#4c755e',
          width: 7,
        },
      },
      {
        type: 'scatter',
        data: pointData,
        z: 5,
      },
      {
        type: 'scatter',
        data: hitAreaData,
        z: 0,
      },
      {
        type: 'scatter',
        data: focusData,
        z: 6,
        symbol: 'roundRect',
        label: {
          show: true,
          formatter: '*',
          color: '#f8f2e8',
          fontFamily: "'STSong', 'SimSun', serif",
          fontSize: 10,
        },
      },
    ],
  });

  chart.resize();
};

const handleResize = () => {
  chart?.resize();
};

watch(
  () => [props.buildings, props.selectedId],
  () => {
    renderChart();
  },
  { deep: true },
);

onMounted(() => {
  renderChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chart?.dispose();
  chart = null;
});
</script>

<style scoped lang="scss">
.line-timeline {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 8px;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 4px 0 0;
  overflow: hidden;
  background: rgba(228, 220, 203, 0.14);
}

.line-timeline__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 0 0 4px;
}

.line-timeline__titles {
  display: flex;
  align-items: baseline;
  gap: 24px;
  min-width: 0;
}

.line-timeline__title-item {
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 28px;
  line-height: 1;
  letter-spacing: 0.02em;
  color: #a83c3b;
  white-space: nowrap;
}

.line-timeline__legend {
  display: grid;
  gap: 4px;
  margin-top: 2px;
  padding-right: 4px;
}

.line-timeline__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'STSong', 'SimSun', serif;
  font-size: 11px;
  line-height: 1.25;
  color: #65584a;
}

.line-timeline__legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  border: 1px solid rgba(255, 250, 241, 0.65);
  box-shadow: 0 0 0 1px rgba(121, 106, 91, 0.24);
}

.line-timeline__legend-dot--primary {
  background: #657e65;
}

.line-timeline__legend-dot--secondary {
  background: #9ba19d;
}

.line-timeline__chart-shell {
  position: relative;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: 0;
  background:
    linear-gradient(180deg, rgba(233, 225, 211, 0.38), rgba(233, 225, 211, 0.1)),
    radial-gradient(circle at 36% 18%, rgba(255, 255, 255, 0.14), transparent 30%);
  border-left: 1px solid rgba(168, 60, 59, 0.08);
  border-right: 1px solid rgba(130, 119, 103, 0.12);
}

.line-timeline__chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

:deep(.line-timeline-tooltip) {
  border-radius: 6px;
  box-shadow: 0 5px 16px rgba(48, 39, 31, 0.2);
}
</style>
