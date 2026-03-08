<template>
  <div class="line-timeline">
    <div class="line-timeline__header">
      <div class="line-timeline__title">{{ uiText.title }}</div>
      <div class="line-timeline__subtitle">{{ uiText.subtitle }}</div>
    </div>

    <div class="line-timeline__chart-shell">
      <div ref="chartRef" class="line-timeline__chart"></div>

      <div
        v-if="selectedMarkerTop !== null"
        class="line-timeline__marker"
        :style="{
          top: `${selectedMarkerTop}%`,
          '--marker-color': selectedMarkerColor,
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { EffectScatterChart, LineChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { getDominantStructure, getStructureColor } from '@/demo/building-home-map/metadata';

import type { BuildingRecord } from '../types';

echarts.use([GridComponent, TooltipComponent, LineChart, ScatterChart, EffectScatterChart, CanvasRenderer]);

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

const uiText = {
  title: '\u5e74\u4ee3\u6298\u7ebf',
  subtitle: '\u5e74\u4efd\u4e0e\u5efa\u7b51\u6570\u91cf',
  tooltipCount: '\u6837\u672c\u6570\u91cf\uff1a',
  tooltipStructure: '\u4e3b\u4f53\u5f62\u5236\uff1a',
} as const;

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;

const selectedBuilding = computed(
  () => props.buildings.find((building) => building.id === props.selectedId) ?? null,
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

const totalYearRange = computed(() => Math.max(100, maxYear.value - minYear.value));

const selectedBucketStart = computed(() => {
  if (selectedBuilding.value) {
    return Math.floor(selectedBuilding.value.year / BUCKET_SPAN) * BUCKET_SPAN;
  }

  return buckets.value[0]?.start ?? null;
});

const selectedBucket = computed(
  () => buckets.value.find((bucket) => bucket.start === selectedBucketStart.value) ?? null,
);

const selectedYear = computed(() => selectedBuilding.value?.year ?? null);

const selectedMarkerTop = computed(() => {
  if (selectedYear.value === null) {
    return null;
  }

  return ((selectedYear.value - minYear.value) / totalYearRange.value) * 100;
});

const selectedMarkerColor = computed(() =>
  selectedBucket.value ? getStructureColor(getDominantStructure(selectedBucket.value.buildings)) : '#4b765f',
);

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

const formatRange = (start: number, end: number) => `${start} - ${end}`;

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

  const lineData = buckets.value.map((bucket) => ({
    value: [bucket.count, bucket.start + BUCKET_SPAN / 2],
    bucketStart: bucket.start,
  }));

  const pointData = buckets.value.map((bucket) => ({
    value: [bucket.count, bucket.start + BUCKET_SPAN / 2],
    bucketStart: bucket.start,
    itemStyle: {
      color: getStructureColor(getDominantStructure(bucket.buildings)),
      borderColor: 'rgba(246, 238, 226, 0.94)',
      borderWidth: 1.2,
    },
    symbolSize: 7 + bucket.count * 1.1,
  }));

  const focusData = selectedBucket.value && selectedYear.value !== null
    ? [{
        value: [selectedBucket.value.count, selectedYear.value],
        bucketStart: selectedBucket.value.start,
        itemStyle: {
          color: selectedMarkerColor.value,
        },
        symbolSize: 15,
      }]
    : [];

  chart.setOption({
    backgroundColor: 'transparent',
    animationDurationUpdate: 240,
    grid: {
      top: 34,
      right: 18,
      bottom: 18,
      left: 34,
      containLabel: false,
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(243, 235, 220, 0.97)',
      borderColor: 'rgba(149, 117, 94, 0.28)',
      borderWidth: 1,
      padding: 10,
      textStyle: {
        color: '#4c382b',
        fontFamily: 'ContentFont',
      },
      formatter: (params: { data?: { bucketStart?: number } }) => {
        const bucket = buckets.value.find((item) => item.start === params.data?.bucketStart);
        if (!bucket) {
          return '';
        }

        return [
          `<div style="font-family: KaiTi, STKaiti, serif; font-size:16px; color:#8f3c30; margin-bottom:4px;">${formatRange(bucket.start, bucket.end)}</div>`,
          `<div>${uiText.tooltipCount}${bucket.count}</div>`,
          `<div>${uiText.tooltipStructure}${getDominantStructure(bucket.buildings)}</div>`,
        ].join('');
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: xAxisMax.value,
      position: 'top',
      axisLabel: {
        color: 'rgba(106, 78, 64, 0.78)',
        fontFamily: 'ContentFont',
        fontSize: 10,
      },
      splitNumber: 4,
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed',
          color: 'rgba(84, 116, 95, 0.16)',
        },
      },
      axisTick: {
        show: false,
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(116, 93, 78, 0.26)',
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
        color: 'rgba(130, 91, 75, 0.84)',
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
          color: 'rgba(163, 72, 58, 0.5)',
        },
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(163, 72, 58, 0.92)',
          width: 1.2,
          type: 'dashed',
        },
      },
    },
    series: [
      {
        type: 'line',
        data: lineData,
        smooth: 0.36,
        symbol: 'none',
        lineStyle: {
          color: '#4f765f',
          width: 2.6,
          shadowBlur: 8,
          shadowColor: 'rgba(79, 118, 95, 0.16)',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: 'rgba(79, 118, 95, 0.28)' },
            { offset: 0.5, color: 'rgba(79, 118, 95, 0.08)' },
            { offset: 1, color: 'rgba(79, 118, 95, 0)' },
          ]),
        },
        markLine: selectedYear.value === null
          ? undefined
          : {
              symbol: ['none', 'none'],
              lineStyle: {
                color: 'rgba(180, 88, 72, 0.38)',
                width: 1,
                type: 'dashed',
              },
              label: {
                show: false,
              },
              data: [{ yAxis: selectedYear.value }],
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

<style scoped>
.line-timeline {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 8px;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.line-timeline__header {
  display: grid;
  gap: 3px;
}

.line-timeline__title {
  font-family: 'KaiTi', 'STKaiti', 'Kaiti SC', serif;
  font-size: 16px;
  line-height: 1.1;
  color: #993d31;
}

.line-timeline__subtitle {
  font-family: 'SimSun', 'STSong', 'Songti SC', serif;
  font-size: 10px;
  line-height: 1.4;
  color: rgba(99, 73, 60, 0.72);
}

.line-timeline__chart-shell {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
}

.line-timeline__chart {
  width: 100%;
  height: 100%;
  min-height: 420px;
}

.line-timeline__marker {
  position: absolute;
  right: -9px;
  width: 0;
  height: 0;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
  border-right: 12px solid var(--marker-color);
  transform: translateY(-50%);
  filter: drop-shadow(0 2px 4px rgba(72, 52, 40, 0.14));
}
</style>
