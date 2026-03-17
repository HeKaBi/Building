<template>
  <aside class="era-timeline">
    <div ref="chartRef" class="era-timeline__chart"></div>
  </aside>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { EffectScatterChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import type { BuildingGalleryItem } from '../types';

echarts.use([TitleComponent, GridComponent, TooltipComponent, ScatterChart, EffectScatterChart, CanvasRenderer]);

interface EraBucket {
  start: number;
  end: number;
  count: number;
  items: BuildingGalleryItem[];
}

interface TimelinePointDatum {
  value: [number, number, number];
  itemId: string;
  itemName: string;
  yearLabel: string;
  bucketStart: number;
  bucketLabel: string;
  bucketCount: number;
  symbolSize: number;
  itemStyle: {
    color: string;
    shadowBlur: number;
    shadowColor: string;
  };
  label: {
    show: boolean;
    position: 'right';
    distance: number;
    formatter: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
  };
}

const props = withDefaults(
  defineProps<{
    items: BuildingGalleryItem[];
    activeId: string | null;
    accent?: string;
  }>(),
  {
    accent: '#4f7462',
  },
);

const emit = defineEmits<{
  select: [id: string];
  hover: [id: string | null];
}>();

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

const POINT_COLOR = '#e59a80';
const AXIS_COLOR = '#333333';

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

const formatYear = (year: number) => (year < 0 ? `前${Math.abs(year)}年` : `${year}年`);

const orderedItems = computed(() => [...props.items].sort((left, right) => left.year - right.year));

const rawMinYear = computed(() => {
  const values = orderedItems.value.map((item) => item.year);
  return values.length ? Math.min(...values) : 0;
});

const rawMaxYear = computed(() => {
  const values = orderedItems.value.map((item) => item.year);
  return values.length ? Math.max(...values) : 100;
});

const yearInterval = computed(() => {
  const range = rawMaxYear.value - rawMinYear.value;

  if (range > 520) {
    return 100;
  }

  if (range > 280) {
    return 50;
  }

  return 25;
});

const bucketSpan = computed(() => {
  const range = rawMaxYear.value - rawMinYear.value;

  if (range > 520) {
    return 60;
  }

  if (range > 280) {
    return 40;
  }

  return 25;
});

const minYear = computed(() =>
  Math.floor(rawMinYear.value / yearInterval.value) * yearInterval.value,
);

const maxYear = computed(() =>
  Math.ceil(rawMaxYear.value / yearInterval.value) * yearInterval.value,
);

const buckets = computed<EraBucket[]>(() => {
  const grouped = new Map<number, BuildingGalleryItem[]>();

  for (const item of orderedItems.value) {
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
      items: [...items].sort((left, right) => left.year - right.year),
    }));
});

const bucketMap = computed(() => new Map(buckets.value.map((bucket) => [bucket.start, bucket])));
const maxCount = computed(() => Math.max(1, ...buckets.value.map((bucket) => bucket.count)));
const countEmphasisThreshold = computed(() => Math.max(2, Math.ceil(maxCount.value * 0.7)));

const getBucketLabel = (bucket: EraBucket) =>
  bucket.start === bucket.end
    ? formatYear(bucket.start)
    : `${formatYear(bucket.start)} - ${formatYear(bucket.end)}`;

const getSymbolSize = (bucketCount: number) => {
  const ratio = bucketCount / Math.max(1, maxCount.value);
  return Math.round(8 + ratio * 20);
};

const getDensityOffset = (bucketCount: number, indexInBucket: number) => {
  const base = 1 + bucketCount * 0.78;
  const spread = indexInBucket * 0.58;
  return Number((base + spread).toFixed(2));
};

const pointData = computed<TimelinePointDatum[]>(() =>
  buckets.value.flatMap((bucket) =>
    bucket.items.map((item, indexInBucket) => {
      const symbolSize = getSymbolSize(bucket.count);
      const isEmphasis = bucket.count >= countEmphasisThreshold.value;
      const isLabelAnchor = bucket.count > 1 && indexInBucket === bucket.items.length - 1;

      return {
        value: [getDensityOffset(bucket.count, indexInBucket), item.year, bucket.count],
        itemId: item.id,
        itemName: item.name,
        yearLabel: formatYear(item.year),
        bucketStart: bucket.start,
        bucketLabel: getBucketLabel(bucket),
        bucketCount: bucket.count,
        symbolSize,
        itemStyle: {
          color: POINT_COLOR,
          shadowBlur: isEmphasis ? 12 : 8,
          shadowColor: withAlpha(POINT_COLOR, isEmphasis ? 0.28 : 0.16),
        },
        label: {
          show: isLabelAnchor,
          position: 'right',
          distance: Math.max(10, Math.round(symbolSize * 0.42)),
          formatter: `${bucket.count}`,
          fontFamily: 'ContentFont',
          fontSize: isEmphasis ? 16 : 13,
          fontWeight: isEmphasis ? 700 : 400,
          color: AXIS_COLOR,
        },
      };
    }),
  ),
);

const xAxisMax = computed(() => {
  const offsets = pointData.value.map((item) => item.value[0]);
  return Math.max(6, ...(offsets.length ? offsets : [0])) + 4;
});

const selectedPoint = computed(
  () => pointData.value.find((item) => item.itemId === props.activeId) ?? null,
);

const handleChartClick = (params: { data?: TimelinePointDatum }) => {
  const itemId = params.data?.itemId;

  if (itemId) {
    emit('select', itemId);
  }
};

const handleChartMouseOver = (params: { data?: TimelinePointDatum }) => {
  emit('hover', params.data?.itemId ?? null);
};

const handleChartGlobalOut = () => {
  emit('hover', null);
};

const renderChart = () => {
  if (!chartRef.value) {
    return;
  }

  if (!orderedItems.value.length) {
    chart?.clear();
    return;
  }

  if (!chart) {
    chart = echarts.init(chartRef.value);
    chart.on('click', handleChartClick);
    chart.on('mouseover', handleChartMouseOver);
    chart.on('globalout', handleChartGlobalOut);
  }

  const focusData = selectedPoint.value
    ? [
        {
          ...selectedPoint.value,
          itemStyle: {
            color: props.accent,
            shadowBlur: 16,
            shadowColor: withAlpha(props.accent, 0.28),
          },
          symbolSize: Math.max(20, selectedPoint.value.symbolSize + 6),
        },
      ]
    : [];

  chart.setOption(
    {
      backgroundColor: 'transparent',
      animationDurationUpdate: 260,
      grid: {
        top: 56,
        right: 42,
        bottom: 16,
        left: 52,
        containLabel: false,
      },
      title: {
        text: '建筑时间轴',
        left: 'center',
        top: 8,
        textStyle: {
          fontFamily: 'ChartTitleFont',
          fontSize: 24,
          fontWeight: 'bold',
          color: AXIS_COLOR,
        },
      },
      tooltip: {
        trigger: 'item',
        position: 'right',
        textStyle: {
          fontFamily: 'ContentFont',
          fontSize: 14,
          fontWeight: 'bold',
          color: AXIS_COLOR,
        },
        extraCssText:
          'max-width: 260px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.2); white-space: normal;',
        formatter: (params: { data?: TimelinePointDatum }) => {
          const item = params.data;

          if (!item) {
            return '';
          }

          const bucket = bucketMap.value.get(item.bucketStart);
          const names = bucket?.items.map((entry) => entry.name) ?? [item.itemName];
          const preview = names.slice(0, 4).join('、');
          const suffix = names.length > 4 ? ` 等${names.length}处` : '';

          return [
            '<div style="max-width: 240px">',
            `<h3 style="margin: 0; font-size: 18px">${item.itemName}</h3>`,
            `<p style="margin: 6px 0">${item.yearLabel}</p>`,
            `<p style="margin: 6px 0">时段：${item.bucketLabel}</p>`,
            `<p style="margin: 6px 0">该时段建筑数量：${item.bucketCount}</p>`,
            `<p style="margin: 0; line-height: 1.5; font-weight: 400;">${preview}${suffix}</p>`,
            '</div>',
          ].join('');
        },
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: xAxisMax.value,
        show: false,
      },
      yAxis: {
        type: 'value',
        inverse: true,
        min: minYear.value,
        max: maxYear.value,
        interval: yearInterval.value,
        axisLabel: {
          fontFamily: 'ContentFont',
          fontSize: 12,
          fontWeight: 'bold',
          color: AXIS_COLOR,
          margin: 10,
          formatter: (value: number) => `${value}`,
        },
        axisTick: {
          show: true,
          inside: false,
          length: 4,
          lineStyle: {
            color: AXIS_COLOR,
          },
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: AXIS_COLOR,
            width: 1.2,
          },
        },
        splitLine: {
          show: false,
        },
      },
      series: [
        {
          type: 'scatter',
          data: pointData.value,
          symbol: 'circle',
          symbolSize: (value: number[]) => {
            const density = value[2] ?? 1;
            return getSymbolSize(density);
          },
          z: 4,
        },
        {
          type: 'effectScatter',
          data: focusData,
          symbol: 'circle',
          symbolSize: (value: number[]) => {
            const density = value[2] ?? 1;
            return Math.max(20, getSymbolSize(density) + 6);
          },
          z: 5,
          rippleEffect: {
            scale: 3.2,
            brushType: 'stroke',
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
  () => [props.items, props.activeId, props.accent],
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
  chart?.off('click', handleChartClick);
  chart?.off('mouseover', handleChartMouseOver);
  chart?.off('globalout', handleChartGlobalOut);
  chart?.dispose();
  chart = null;
});
</script>

<style scoped lang="scss">
.era-timeline {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  background: transparent;
}

.era-timeline__chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
