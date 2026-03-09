<template>
  <div class="line-timeline">
    <div class="line-timeline__header">
      <div class="line-timeline__seal">纪</div>

      <div class="line-timeline__header-copy">
        <div class="line-timeline__eyebrow">{{ uiText.eyebrow }}</div>
        <div class="line-timeline__title">{{ uiText.title }}</div>
        <div class="line-timeline__subtitle">{{ uiText.subtitle }}</div>
      </div>
    </div>

    <div class="line-timeline__focus">
      <span class="line-timeline__focus-label">{{ uiText.focusLabel }}</span>
      <strong>{{ activeFocusLabel }}</strong>
    </div>

    <div class="line-timeline__chart-shell">
      <div class="line-timeline__ornament line-timeline__ornament--top"></div>
      <div class="line-timeline__ornament line-timeline__ornament--bottom"></div>

      <div ref="chartRef" class="line-timeline__chart"></div>

      <div
        v-if="selectedMarkerTop !== null"
        class="line-timeline__marker"
        :style="{
          top: `${selectedMarkerTop}px`,
          '--marker-color': selectedMarkerColor,
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { GridComponent } from 'echarts/components';
import { EffectScatterChart, LineChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { getDominantStructure, getStructureColor } from '@/demo/building-home-map/metadata';

import type { BuildingRecord } from '../types';

echarts.use([GridComponent, LineChart, ScatterChart, EffectScatterChart, CanvasRenderer]);

interface DensityBucket {
  start: number;
  end: number;
  count: number;
  buildings: BuildingRecord[];
}

const props = defineProps<{
  buildings: BuildingRecord[];
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [buildingId: string];
}>();

const BUCKET_SPAN = 50;
const MIN_BUCKET_SYMBOL_SIZE = 7;
const MAX_BUCKET_SYMBOL_SIZE = 14;
const FOCUS_BUCKET_SYMBOL_SIZE = 16;

const uiText = {
  eyebrow: '\u8425\u9020\u7eaa\u5e74',
  title: '\u5efa\u7f6e\u65f6\u8f74',
  subtitle: '\u6309 50 \u5e74\u533a\u95f4\u805a\u5408\u5efa\u7b51\u5bc6\u5ea6',
  focusLabel: '\u5f53\u524d\u952e\u70b9',
} as const;

const chartRef = ref<HTMLDivElement | null>(null);
const selectedMarkerTop = ref<number | null>(null);
let chart: echarts.ECharts | null = null;

const selectedBuilding = computed(
  () => props.buildings.find((building) => building.id === props.selectedId) ?? null,
);

const activeFocusLabel = computed(() =>
  selectedBuilding.value
    ? `${selectedBuilding.value.name} · ${selectedBuilding.value.year}`
    : '\u70b9\u51fb\u65f6\u95f4\u8282\u70b9\u67e5\u770b\u5efa\u7b51\u6837\u672c',
);

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

const xAxisMax = computed(() => Math.max(3, maxCount.value + 1));

const minYear = computed(() => {
  const values = props.buildings.map((building) => building.year);
  return values.length ? Math.floor(Math.min(...values) / 100) * 100 : 0;
});

const maxYear = computed(() => {
  const values = props.buildings.map((building) => building.year);
  return values.length ? Math.ceil(Math.max(...values) / 100) * 100 : 100;
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

const selectedBucketYear = computed(() =>
  selectedBucket.value ? selectedBucket.value.start + BUCKET_SPAN / 2 : null,
);

const selectedMarkerColor = computed(() =>
  selectedBucket.value ? getStructureColor(getDominantStructure(selectedBucket.value.buildings)) : '#6d7a5e',
);

const getBucketSymbolSize = (count: number) =>
  Math.min(MAX_BUCKET_SYMBOL_SIZE, MIN_BUCKET_SYMBOL_SIZE + Math.sqrt(Math.max(1, count)) * 0.85);

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

const syncMarkerPosition = () => {
  if (!chart || selectedBucket.value === null || selectedBucketYear.value === null) {
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

  const lineData = buckets.value.map((bucket) => ({
    value: [bucket.count, bucket.start + BUCKET_SPAN / 2],
    bucketStart: bucket.start,
  }));

  const pointData = buckets.value.map((bucket) => ({
    value: [bucket.count, bucket.start + BUCKET_SPAN / 2],
    bucketStart: bucket.start,
    itemStyle: {
      color: getStructureColor(getDominantStructure(bucket.buildings)),
      borderColor: 'rgba(246, 238, 226, 0.96)',
      borderWidth: 1.35,
      shadowBlur: 9,
      shadowColor: 'rgba(92, 66, 52, 0.14)',
    },
    symbolSize: getBucketSymbolSize(bucket.count),
  }));

  const focusData = selectedBucket.value && selectedBucketYear.value !== null
    ? [{
        value: [selectedBucket.value.count, selectedBucketYear.value],
        bucketStart: selectedBucket.value.start,
        itemStyle: {
          color: selectedMarkerColor.value,
          borderColor: 'rgba(255, 248, 239, 0.96)',
          borderWidth: 2,
          shadowBlur: 12,
          shadowColor: 'rgba(92, 66, 52, 0.18)',
        },
        symbolSize: FOCUS_BUCKET_SYMBOL_SIZE,
      }]
    : [];

  chart.setOption({
    backgroundColor: 'transparent',
    animationDurationUpdate: 260,
    grid: {
      top: 54,
      right: 30,
      bottom: 24,
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
      interval: 100,
      axisLabel: {
        color: 'rgba(130, 91, 75, 0.88)',
        fontFamily: 'ContentFont',
        fontSize: 11,
      },
      splitLine: {
        show: false,
      },
      axisTick: {
        show: true,
        inside: true,
        length: 4,
        lineStyle: {
          color: 'rgba(163, 72, 58, 0.42)',
        },
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(163, 72, 58, 0.78)',
          width: 1.2,
          type: 'solid',
        },
      },
    },
    series: [
      {
        type: 'line',
        data: lineData,
        smooth: 0.38,
        symbol: 'none',
        lineStyle: {
          color: '#6e7f63',
          width: 2.7,
          shadowBlur: 10,
          shadowColor: 'rgba(110, 127, 99, 0.16)',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: 'rgba(110, 127, 99, 0.2)' },
            { offset: 0.55, color: 'rgba(110, 127, 99, 0.08)' },
            { offset: 1, color: 'rgba(110, 127, 99, 0)' },
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
          scale: 3.6,
          brushType: 'stroke',
        },
      },
    ],
  });

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
  chart?.off('finished', syncMarkerPosition);
  chart?.dispose();
  chart = null;
});
</script>

<style scoped lang="scss">
.line-timeline {
  position: relative;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
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

.line-timeline::before,
.line-timeline::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(161, 63, 51, 0.42), transparent);
}

.line-timeline::before {
  top: 68px;
}

.line-timeline::after {
  bottom: 14px;
}

.line-timeline__header {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.line-timeline__seal {
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

.line-timeline__header-copy {
  display: grid;
  gap: 4px;
}

.line-timeline__eyebrow {
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.24em;
  color: rgba(105, 78, 64, 0.62);
}

.line-timeline__title {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 24px;
  line-height: 1.05;
  color: #7f3024;
}

.line-timeline__subtitle {
  font-family: 'ContentFont', serif;
  font-size: 11px;
  line-height: 1.55;
  color: rgba(91, 66, 52, 0.72);
}

.line-timeline__focus {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid rgba(149, 117, 94, 0.16);
  border-radius: 14px;
  background: rgba(247, 241, 231, 0.72);
}

.line-timeline__focus-label {
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: rgba(112, 84, 68, 0.62);
}

.line-timeline__focus strong {
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 600;
  color: #5f3d30;
}

.line-timeline__chart-shell {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  overflow: hidden;
  border-radius: 20px 8px 20px 8px;
  background:
    linear-gradient(180deg, rgba(249, 244, 237, 0.64), rgba(238, 230, 216, 0.36)),
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.24), transparent 22%);
  border: 1px solid rgba(149, 117, 94, 0.14);
}

.line-timeline__ornament {
  position: absolute;
  left: 16px;
  right: 16px;
  height: 10px;
  pointer-events: none;
}

.line-timeline__ornament::before,
.line-timeline__ornament::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border: 1px solid rgba(163, 72, 58, 0.18);
  border-radius: 50%;
  transform: translateY(-50%);
}

.line-timeline__ornament::before {
  left: 0;
}

.line-timeline__ornament::after {
  right: 0;
}

.line-timeline__ornament--top {
  top: 10px;
  border-top: 1px solid rgba(163, 72, 58, 0.16);
}

.line-timeline__ornament--bottom {
  bottom: 10px;
  border-bottom: 1px solid rgba(163, 72, 58, 0.16);
}

.line-timeline__chart {
  width: 100%;
  height: 100%;
  min-height: 420px;
}

.line-timeline__marker {
  position: absolute;
  right: 8px;
  width: 28px;
  height: 18px;
  transform: translateY(-50%);
  filter: drop-shadow(0 2px 4px rgba(72, 52, 40, 0.18));
}

.line-timeline__marker::before,
.line-timeline__marker::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.line-timeline__marker::before {
  left: 6px;
  width: 18px;
  height: 14px;
  background: var(--marker-color);
  clip-path: polygon(0 50%, 100% 0, 100% 100%);
}

.line-timeline__marker::after {
  left: 0;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: 2px solid var(--marker-color);
  background: rgba(250, 244, 235, 0.96);
  box-shadow: 0 0 0 4px rgba(250, 244, 235, 0.5);
}
</style>
