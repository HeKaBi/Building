<template>
  <aside class="era-timeline line-timeline">
    <div class="line-timeline__header">
      <div class="line-timeline__legend">
        <div class="line-timeline__legend-item">
          <i class="line-timeline__legend-dot line-timeline__legend-dot--count"></i>
          <span>{{ uiText.countLegend }}</span>
        </div>
      </div>

      <div class="line-timeline__titles">
        <span class="line-timeline__title-item">{{ uiText.yearTitle }}</span>
      </div>
    </div>

    <div class="line-timeline__chart-shell">
      <div ref="chartRef" class="line-timeline__chart"></div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CustomChart, LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import type { BuildingGalleryItem } from '../types';

echarts.use([GridComponent, TooltipComponent, CustomChart, LineChart, CanvasRenderer]);

interface DensityBucket {
  start: number;
  end: number;
  count: number;
  items: BuildingGalleryItem[];
}

interface BarDatum {
  value: [number, number, number];
  bucketStart: number;
  count: number;
  selected: boolean;
}

const props = withDefaults(
  defineProps<{
    items: BuildingGalleryItem[];
    activeId: string | null;
    accent?: string;
  }>(),
  {
    accent: '#923f30',
  },
);

const emit = defineEmits<{
  select: [id: string];
  hover: [id: string | null];
}>();

const BUCKET_SPAN = 50;
const MAJOR_YEAR_INTERVAL = 100;
const BAR_GAP_PX = 4;
const BAR_AXIS_PADDING = 2;
const BAR_MIN_VISIBLE_COUNT = 1;

const uiText = {
  yearTitle: '\u5e74\u4efd',
  countLegend: '\u5efa\u7b51\u6570\u91cf',
} as const;

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;

const selectedItem = computed(() => props.items.find((item) => item.id === props.activeId) ?? null);

const buckets = computed<DensityBucket[]>(() => {
  const grouped = new Map<number, BuildingGalleryItem[]>();

  for (const item of props.items) {
    const bucketStart = Math.floor(item.year / BUCKET_SPAN) * BUCKET_SPAN;
    const list = grouped.get(bucketStart) ?? [];
    list.push(item);
    grouped.set(bucketStart, list);
  }

  return Array.from(grouped.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([start, items]) => ({
      start,
      end: start + BUCKET_SPAN - 1,
      count: items.length,
      items: [...items].sort((left, right) => left.year - right.year || left.name.localeCompare(right.name)),
    }));
});

const maxCount = computed(() => Math.max(1, ...buckets.value.map((bucket) => bucket.count)));

const floorToCentury = (year: number) => Math.floor(year / MAJOR_YEAR_INTERVAL) * MAJOR_YEAR_INTERVAL;
const ceilToCentury = (year: number) => Math.ceil(year / MAJOR_YEAR_INTERVAL) * MAJOR_YEAR_INTERVAL;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const minYear = computed(() => {
  if (!props.items.length) {
    return 100;
  }

  return floorToCentury(Math.min(...props.items.map((item) => item.year)));
});

const maxYear = computed(() => {
  if (!props.items.length) {
    return 2000;
  }

  const latestYear = Math.max(...props.items.map((item) => item.year));
  return Math.max(ceilToCentury(latestYear), minYear.value + MAJOR_YEAR_INTERVAL);
});

const xAxisMax = computed(() => Math.max(6, maxCount.value + BAR_AXIS_PADDING));

const selectedBucketStart = computed(() => {
  if (selectedItem.value) {
    return Math.floor(selectedItem.value.year / BUCKET_SPAN) * BUCKET_SPAN;
  }

  return buckets.value[0]?.start ?? null;
});

const selectedYear = computed(() => selectedItem.value?.year ?? null);

const barSeriesData = computed<BarDatum[]>(() =>
  buckets.value.map((bucket) => ({
    value: [Math.max(BAR_MIN_VISIBLE_COUNT, bucket.count), bucket.start, bucket.end + 1],
    bucketStart: bucket.start,
    count: bucket.count,
    selected: bucket.start === selectedBucketStart.value,
  })),
);

const getBucketPreferredItem = (bucketStart: number | null | undefined) => {
  if (bucketStart === null || bucketStart === undefined) {
    return null;
  }

  const bucket = buckets.value.find((item) => item.start === bucketStart);
  return bucket?.items.find((item) => item.id === props.activeId) ?? bucket?.items[0] ?? null;
};

const handleBucketClick = (bucketStart: number | null | undefined) => {
  const preferred = getBucketPreferredItem(bucketStart);
  if (preferred) {
    emit('select', preferred.id);
  }
};

const handleBucketHover = (bucketStart: number | null | undefined) => {
  emit('hover', getBucketPreferredItem(bucketStart)?.id ?? null);
};

const renderChart = () => {
  if (!chartRef.value) {
    return;
  }

  if (!props.items.length) {
    chart?.clear();
    emit('hover', null);
    return;
  }

  if (!chart) {
    chart = echarts.init(chartRef.value);

    chart.on('click', (params) => {
      const bucketStart = (params.data as { bucketStart?: number } | undefined)?.bucketStart;
      handleBucketClick(bucketStart);
    });

    chart.on('mouseover', (params) => {
      const bucketStart = (params.data as { bucketStart?: number } | undefined)?.bucketStart;
      handleBucketHover(bucketStart);
    });

    chart.on('globalout', () => {
      emit('hover', null);
    });
  }

  const bars = barSeriesData.value;
  const selectedGuideData =
    selectedYear.value === null
      ? []
      : [
          [xAxisMax.value, selectedYear.value],
          [0, selectedYear.value],
        ];
  const selectedBandHalf = 10;
  const selectedBandData =
    selectedYear.value === null
      ? []
      : [
          [0, clamp(selectedYear.value - selectedBandHalf, minYear.value, maxYear.value)],
          [0, clamp(selectedYear.value + selectedBandHalf, minYear.value, maxYear.value)],
        ];

  chart.setOption(
    {
      backgroundColor: 'transparent',
      animationDurationUpdate: 280,
      animationEasingUpdate: 'cubicOut',
      grid: {
        top: 10,
        right: 34,
        bottom: 8,
        left: 8,
        containLabel: false,
      },
      tooltip: { show: false },
      xAxis: {
        type: 'value',
        min: 0,
        max: xAxisMax.value,
        inverse: true,
        axisLabel: { show: false },
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        inverse: true,
        position: 'right',
        min: minYear.value,
        max: maxYear.value,
        interval: MAJOR_YEAR_INTERVAL,
        axisLabel: {
          inside: false,
          align: 'left',
          color: '#6f5a4c',
          fontFamily: "'STKaiti', 'KaiTi', serif",
          fontSize: 10,
          fontWeight: 600,
          margin: 6,
        },
        splitLine: { show: false },
        axisTick: {
          show: true,
          inside: false,
          length: 4,
          lineStyle: {
            color: 'rgba(168, 60, 59, 0.92)',
            width: 1,
          },
        },
        minorTick: {
          show: true,
          splitNumber: 10,
          inside: false,
          length: 2,
          lineStyle: {
            color: 'rgba(168, 60, 59, 0.68)',
          },
        },
        axisLine: {
          lineStyle: {
            color: '#a83c3b',
            width: 1.2,
            type: 'solid',
          },
        },
      },
      series: [
        {
          type: 'custom',
          data: bars,
          z: 2,
          renderItem(params, api) {
            const dataItem = bars[params.dataIndex];
            const count = api.value(0) as number;
            const yearStart = api.value(1) as number;
            const yearEnd = api.value(2) as number;
            const axisPoint = api.coord([0, yearStart]);
            const valuePoint = api.coord([count, yearStart]);
            const startPoint = api.coord([0, yearStart]);
            const endPoint = api.coord([0, yearEnd]);
            const rawHeight = Math.abs(endPoint[1] - startPoint[1]);
            const height = Math.max(8, rawHeight - BAR_GAP_PX);
            const y = Math.min(startPoint[1], endPoint[1]) + (rawHeight - height) / 2;
            const x = Math.min(axisPoint[0], valuePoint[0]);
            const width = Math.max(6, Math.abs(axisPoint[0] - valuePoint[0]));
            const rect = echarts.graphic.clipRectByRect(
              {
                x,
                y,
                width,
                height,
              },
              {
                x: params.coordSys.x,
                y: params.coordSys.y,
                width: params.coordSys.width,
                height: params.coordSys.height,
              },
            );

            if (!rect) {
              return null;
            }

            const fill = dataItem?.selected ? 'rgba(129, 146, 123, 0.96)' : 'rgba(161, 171, 154, 0.96)';

            return {
              type: 'rect',
              transition: ['shape', 'style'],
              shape: rect,
              style: {
                fill,
                stroke: dataItem?.selected ? 'rgba(123, 136, 117, 0.9)' : 'rgba(146, 156, 141, 0.82)',
                lineWidth: 0.8,
              },
              styleEmphasis: {
                fill: 'rgba(139, 155, 133, 0.98)',
                stroke: 'rgba(116, 130, 109, 0.94)',
                lineWidth: 0.9,
              },
            };
          },
        },
        {
          type: 'line',
          data: selectedBandData,
          symbol: 'none',
          silent: true,
          z: 4,
          lineStyle: {
            color: 'rgba(146, 63, 48, 0.92)',
            width: 5,
          },
        },
        {
          type: 'line',
          data: selectedGuideData,
          symbol: 'none',
          silent: true,
          z: 5,
          lineStyle: {
            color: 'rgba(156, 58, 53, 0.78)',
            width: 1.3,
          },
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
  () => [props.items, props.activeId],
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
  gap: 4px;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 2px 0 0;
  overflow: hidden;
  background: rgba(228, 220, 203, 0.14);
}

.line-timeline__header {
  position: relative;
  display: flex;
  justify-content: flex-end;
  align-items: end;
  gap: 8px;
  padding: 0 68px 0 0;
}

.line-timeline__titles {
  position: absolute;
  top: 50%;
  right: 34px;
  display: flex;
  align-items: center;
  gap: 0;
  justify-content: center;
  min-width: 0;
  transform: translate(50%, -50%);
}

.line-timeline__title-item {
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 19px;
  line-height: 1;
  letter-spacing: 0.03em;
  color: #9c3a35;
  white-space: nowrap;
  font-weight: 700;
}

.line-timeline__legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 0;
  padding-right: 0;
}

.line-timeline__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 11px;
  line-height: 1;
  color: #4a433a;
  white-space: nowrap;
}

.line-timeline__legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  border: 1px solid rgba(255, 250, 241, 0.65);
  box-shadow: 0 0 0 1px rgba(121, 106, 91, 0.24);
}

.line-timeline__legend-dot--count {
  background: #657e65;
}

.line-timeline__chart-shell {
  position: relative;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: 0;
  background: transparent;
  border-left: none;
  border-right: none;
  margin-top: -2px;
}

.line-timeline__chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
