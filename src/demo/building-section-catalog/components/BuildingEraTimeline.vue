<template>
  <aside class="era-timeline" :style="{ '--timeline-accent': accent }">
    <div class="era-timeline__header">
      <div class="era-timeline__seal">纪</div>

      <div class="era-timeline__header-copy">
        <div class="era-timeline__eyebrow">营造纪年</div>
        <div class="era-timeline__title">时间轴</div>
        <div class="era-timeline__subtitle">{{ subtitle }}</div>
      </div>
    </div>

    <div class="era-timeline__focus">
      <span class="era-timeline__focus-label">当前焦点</span>
      <strong>{{ activeFocusLabel }}</strong>
    </div>

    <div class="era-timeline__chart-shell">
      <div class="era-timeline__ornament era-timeline__ornament--top"></div>
      <div class="era-timeline__ornament era-timeline__ornament--bottom"></div>

      <div ref="chartRef" class="era-timeline__chart"></div>

      <div
        v-if="selectedMarkerTop !== null"
        class="era-timeline__marker"
        :style="{
          top: `${selectedMarkerTop}px`,
          '--marker-color': selectedMarkerColor,
        }"
      ></div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { GridComponent } from 'echarts/components';
import { EffectScatterChart, LineChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import type { BuildingGalleryItem } from '../types';

echarts.use([GridComponent, LineChart, ScatterChart, EffectScatterChart, CanvasRenderer]);

interface EraBucket {
  start: number;
  end: number;
  count: number;
  items: BuildingGalleryItem[];
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
const selectedMarkerTop = ref<number | null>(null);
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

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

const subtitle = computed(() => `按 ${bucketSpan.value} 年区间聚合样本，沿年代查看民居分布。`);

const activeItem = computed(
  () => orderedItems.value.find((item) => item.id === props.activeId) ?? orderedItems.value[0] ?? null,
);

const activeFocusLabel = computed(() => {
  if (!activeItem.value) {
    return '点击时间节点查看样本';
  }

  return `${activeItem.value.name} · ${activeItem.value.year}`;
});

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

const maxCount = computed(() => Math.max(1, ...buckets.value.map((bucket) => bucket.count)));

const xAxisMax = computed(() => Math.max(3, maxCount.value + 1));

const selectedBucketStart = computed(() => {
  if (activeItem.value) {
    return Math.floor(activeItem.value.year / bucketSpan.value) * bucketSpan.value;
  }

  return buckets.value[0]?.start ?? null;
});

const selectedBucket = computed(
  () => buckets.value.find((bucket) => bucket.start === selectedBucketStart.value) ?? null,
);

const selectedBucketYear = computed(() =>
  selectedBucket.value ? selectedBucket.value.start + bucketSpan.value / 2 : null,
);

const selectedMarkerColor = computed(() => props.accent);

const getBucketSymbolSize = (count: number) => Math.min(16, 7 + Math.sqrt(Math.max(1, count)) * 1.3);

const handleBucketClick = (bucketStart: number | null | undefined) => {
  if (bucketStart === null || bucketStart === undefined) {
    return;
  }

  const bucket = buckets.value.find((item) => item.start === bucketStart);
  const preferred = bucket?.items.find((item) => item.id === props.activeId) ?? bucket?.items[0];

  if (preferred) {
    emit('select', preferred.id);
  }
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

  if (!orderedItems.value.length) {
    selectedMarkerTop.value = null;
    chart?.clear();
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

  const lineColor = props.accent;
  const pointColor = withAlpha(props.accent, 0.88);

  const lineData = buckets.value.map((bucket) => ({
    value: [bucket.count, bucket.start + bucketSpan.value / 2],
    bucketStart: bucket.start,
  }));

  const pointData = buckets.value.map((bucket) => ({
    value: [bucket.count, bucket.start + bucketSpan.value / 2],
    bucketStart: bucket.start,
    itemStyle: {
      color: pointColor,
      borderColor: 'rgba(248, 241, 230, 0.98)',
      borderWidth: 1.4,
      shadowBlur: 9,
      shadowColor: withAlpha(props.accent, 0.18),
    },
    symbolSize: getBucketSymbolSize(bucket.count),
  }));

  const focusData = selectedBucket.value && selectedBucketYear.value !== null
    ? [{
        value: [selectedBucket.value.count, selectedBucketYear.value],
        bucketStart: selectedBucket.value.start,
        itemStyle: {
          color: props.accent,
          borderColor: 'rgba(255, 248, 239, 0.98)',
          borderWidth: 2,
          shadowBlur: 12,
          shadowColor: withAlpha(props.accent, 0.24),
        },
        symbolSize: 18,
      }]
    : [];

  chart.setOption({
    backgroundColor: 'transparent',
    animationDurationUpdate: 260,
    grid: {
      top: 54,
      right: 28,
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
      interval: yearInterval.value,
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
    series: [
      {
        type: 'line',
        data: lineData,
        smooth: 0.34,
        symbol: 'none',
        lineStyle: {
          color: lineColor,
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
  chart?.off('finished', syncMarkerPosition);
  chart?.dispose();
  chart = null;
});
</script>

<style scoped lang="scss">
.era-timeline {
  --timeline-accent: #4f7462;
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

.era-timeline::before,
.era-timeline::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(161, 63, 51, 0.42), transparent);
}

.era-timeline::before {
  top: 68px;
}

.era-timeline::after {
  bottom: 14px;
}

.era-timeline__header {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.era-timeline__seal {
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

.era-timeline__header-copy {
  display: grid;
  gap: 4px;
}

.era-timeline__eyebrow {
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.24em;
  color: rgba(105, 78, 64, 0.62);
}

.era-timeline__title {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 24px;
  line-height: 1.05;
  color: #7f3024;
}

.era-timeline__subtitle {
  font-family: 'ContentFont', serif;
  font-size: 11px;
  line-height: 1.55;
  color: rgba(91, 66, 52, 0.72);
}

.era-timeline__focus {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid rgba(149, 117, 94, 0.16);
  border-radius: 14px;
  background: rgba(247, 241, 231, 0.72);
}

.era-timeline__focus-label {
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: rgba(112, 84, 68, 0.62);
}

.era-timeline__focus strong {
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 600;
  color: #5f3d30;
}

.era-timeline__chart-shell {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: 20px 8px 20px 8px;
  background:
    linear-gradient(180deg, rgba(249, 244, 237, 0.64), rgba(238, 230, 216, 0.36)),
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.24), transparent 22%);
  border: 1px solid rgba(149, 117, 94, 0.14);
}

.era-timeline__ornament {
  position: absolute;
  left: 16px;
  right: 16px;
  height: 10px;
  pointer-events: none;
}

.era-timeline__ornament::before,
.era-timeline__ornament::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border: 1px solid rgba(163, 72, 58, 0.18);
  border-radius: 50%;
  transform: translateY(-50%);
}

.era-timeline__ornament::before {
  left: 0;
}

.era-timeline__ornament::after {
  right: 0;
}

.era-timeline__ornament--top {
  top: 10px;
  border-top: 1px solid rgba(163, 72, 58, 0.16);
}

.era-timeline__ornament--bottom {
  bottom: 10px;
  border-bottom: 1px solid rgba(163, 72, 58, 0.16);
}

.era-timeline__chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.era-timeline__marker {
  position: absolute;
  right: 8px;
  width: 28px;
  height: 18px;
  transform: translateY(-50%);
  filter: drop-shadow(0 2px 4px rgba(72, 52, 40, 0.18));
}

.era-timeline__marker::before,
.era-timeline__marker::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.era-timeline__marker::before {
  left: 6px;
  width: 18px;
  height: 14px;
  background: var(--marker-color);
  clip-path: polygon(0 50%, 100% 0, 100% 100%);
}

.era-timeline__marker::after {
  left: 0;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: 2px solid var(--marker-color);
  background: rgba(250, 244, 235, 0.96);
  box-shadow: 0 0 0 4px rgba(250, 244, 235, 0.5);
}

@media (max-width: 900px) {
  .era-timeline__chart-shell,
  .era-timeline__chart {
    min-height: 0;
  }
}
</style>
