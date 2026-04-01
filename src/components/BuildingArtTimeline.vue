<template>
  <aside class="art-timeline">
    <div class="art-timeline__wash"></div>
    <div class="art-timeline__petal art-timeline__petal--a"></div>
    <div class="art-timeline__petal art-timeline__petal--b"></div>
    <div class="art-timeline__mountain"></div>

    <div class="art-timeline__header">
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
    <div class="art-timeline__axis-title">建筑数量分布时间轴</div>
  </aside>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import type { DashboardBuilding, DashboardCategory } from '@/demo/building-dashboard/types';
import vintage from '@/assets/theme/vintage.json';

echarts.use([GridComponent, TooltipComponent, ScatterChart, CanvasRenderer]);

interface TimelinePalette {
  color: string;
  accentColor: string;
}

interface TimelineYearStat {
  year: number;
  count: number;
  items: DashboardBuilding[];
}

interface TimelinePointDatum {
  value: [number, number, number];
  bucketLabel: string;
  yearLabel: string;
  count: number;
  symbolSize: number;
  itemStyle: {
    color: string;
    opacity: number;
  };
  names: string[];
}

interface CategoryTimelineBundle {
  minYear: number;
  maxYear: number;
  bins: TimelineBin[];
  changepoints: number[];
  keypoints: TimelineKeypoint[];
}

interface TimelineBin {
  startYear: number;
  endYear: number;
  totalCount: number;
  peakYear: number;
  normalizedCount: number;
}

interface TimelineKeypoint {
  year: number;
  strength: number;
  delta: number;
}

interface TimelineArrowDatum {
  value: [number, number, number];
  symbolSize: number;
  symbolRotate: number;
  symbolOffset: [number, number];
  itemStyle: {
    color: string;
    opacity: number;
    shadowColor: string;
    shadowBlur: number;
  };
}

const props = defineProps<{
  buildings: DashboardBuilding[];
  activeType: DashboardCategory;
}>();

const categoryPalettes: Record<DashboardCategory, TimelinePalette> = {
  民居: { color: '#CD8585', accentColor: '#B56D6D' },
  官府: { color: '#8FAA7D', accentColor: '#6E8D5D' },
  宫殿: { color: '#D7A36A', accentColor: '#BD8450' },
  桥梁: { color: '#C9B36A', accentColor: '#A58F48' },
};

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;
const TIMELINE_THEME_NAME = 'building-art-vintage';
let themeRegistered = false;

const activePalette = computed(() => categoryPalettes[props.activeType]);

const formatYear = (year: number) => (year < 0 ? `前${Math.abs(year)}` : `${year}`);
const categoryOrder: DashboardCategory[] = ['民居', '官府', '宫殿', '桥梁'];
const PELT_EPSILON = 1e-8;

const sumRange = (prefix: number[], start: number, end: number) => prefix[end] - prefix[start];

const calcSegmentSse = (prefix: number[], prefixSquares: number[], start: number, end: number) => {
  const length = end - start;
  if (length <= 0) return 0;
  const sum = sumRange(prefix, start, end);
  const squares = sumRange(prefixSquares, start, end);
  const meanSquare = (sum * sum) / length;
  return Math.max(0, squares - meanSquare);
};

const peltDetect = (series: number[], penalty: number) => {
  const n = series.length;
  if (n < 4) return [];

  const prefix = new Array(n + 1).fill(0);
  const prefixSquares = new Array(n + 1).fill(0);

  for (let i = 0; i < n; i += 1) {
    prefix[i + 1] = prefix[i] + series[i];
    prefixSquares[i + 1] = prefixSquares[i] + series[i] * series[i];
  }

  const bestCost = new Array(n + 1).fill(Number.POSITIVE_INFINITY);
  const prevIndex = new Array(n + 1).fill(-1);

  bestCost[0] = -penalty;

  for (let end = 1; end <= n; end += 1) {
    for (let start = 0; start < end; start += 1) {
      const candidate =
        bestCost[start] +
        calcSegmentSse(prefix, prefixSquares, start, end) +
        penalty;
      if (candidate + PELT_EPSILON < bestCost[end]) {
        bestCost[end] = candidate;
        prevIndex[end] = start;
      }
    }
  }

  const changepoints: number[] = [];
  let cursor = n;

  while (cursor > 0 && prevIndex[cursor] >= 0) {
    const prev = prevIndex[cursor];
    if (prev > 0) {
      changepoints.unshift(prev);
    }
    cursor = prev;
  }

  return changepoints;
};

const chooseWindowSize = (span: number) => {
  if (span > 1800) return 20;
  if (span > 1100) return 15;
  if (span > 500) return 10;
  return 5;
};

const nearestExistingYear = (targetYear: number, years: number[]) => {
  if (!years.length) return targetYear;
  return years.reduce((closest, year) =>
    Math.abs(year - targetYear) < Math.abs(closest - targetYear) ? year : closest,
  years[0]);
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

const activeTimeline = computed(() => {
  const grouped = new Map<number, DashboardBuilding[]>();

  activeBuildings.value.forEach((item) => {
    const items = grouped.get(item.year) ?? [];
    items.push(item);
    grouped.set(item.year, items);
  });

  return {
    begin: rawMinYear.value,
    end: rawMaxYear.value,
    timeline: Array.from(grouped.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([year, items]) => ({
        year,
        count: items.length,
        items: [...items].sort((left, right) => right.importance - left.importance || left.name.localeCompare(right.name)),
      })) satisfies TimelineYearStat[],
  };
});

const maxYearCount = computed(() => Math.max(1, ...activeTimeline.value.timeline.map((item) => item.count), 0));

const bubbleSizeForYear = (count: number) => Math.round(5 + (count / Math.max(1, maxYearCount.value)) * 22);

const bubbleSeriesData = computed<TimelinePointDatum[]>(() => {
  return activeTimeline.value.timeline.map((item) => ({
    value: [0.18, item.year, item.count],
    bucketLabel: formatYear(item.year),
    yearLabel: formatYear(item.year),
    count: item.count,
    symbolSize: bubbleSizeForYear(item.count),
    itemStyle: {
      color: activePalette.value.color,
      opacity: 0.8,
    },
    names: item.items.slice(0, 6).map((building) => building.name),
  }));
});

const categoryPeltBundles = computed<Record<DashboardCategory, CategoryTimelineBundle>>(() => {
  const groupedByCategory = new Map<DashboardCategory, DashboardBuilding[]>();
  categoryOrder.forEach((category) => groupedByCategory.set(category, []));

  props.buildings.forEach((item) => {
    const bucket = groupedByCategory.get(item.category);
    if (bucket) {
      bucket.push(item);
    }
  });

  const result = {} as Record<DashboardCategory, CategoryTimelineBundle>;

  categoryOrder.forEach((category) => {
    const buildings = (groupedByCategory.get(category) ?? [])
      .slice()
      .sort((left, right) => left.year - right.year || right.importance - left.importance);

    if (!buildings.length) {
      result[category] = {
        minYear: 0,
        maxYear: 0,
        bins: [],
        changepoints: [],
        keypoints: [],
      };
      return;
    }

    const minYear = Math.min(...buildings.map((item) => item.year));
    const maxYear = Math.max(...buildings.map((item) => item.year));
    const span = Math.max(1, maxYear - minYear + 1);
    const windowSize = chooseWindowSize(span);

    const yearCount = new Map<number, number>();
    buildings.forEach((item) => {
      yearCount.set(item.year, (yearCount.get(item.year) ?? 0) + 1);
    });

    const denseCounts = Array.from({ length: span }, (_, offset) => yearCount.get(minYear + offset) ?? 0);
    const bins: TimelineBin[] = [];

    for (let start = 0; start < denseCounts.length; start += windowSize) {
      const end = Math.min(start + windowSize, denseCounts.length);
      const slice = denseCounts.slice(start, end);
      const totalCount = slice.reduce((sum, value) => sum + value, 0);
      const peakOffset = slice.reduce((best, value, index) => (value > slice[best] ? index : best), 0);
      const startYear = minYear + start;
      const endYear = minYear + end - 1;
      bins.push({
        startYear,
        endYear,
        totalCount,
        peakYear: startYear + peakOffset,
        normalizedCount: 0,
      });
    }

    const maxBinCount = Math.max(1, ...bins.map((item) => item.totalCount));
    const normalized = bins.map((item) => item.totalCount / maxBinCount);
    const mean =
      normalized.reduce((sum, value) => sum + value, 0) / Math.max(1, normalized.length);
    const variance =
      normalized.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      Math.max(1, normalized.length);
    const penalty = Math.max(0.08, 0.12 * Math.log2(normalized.length + 1) + variance * 0.3);

    bins.forEach((item, index) => {
      item.normalizedCount = normalized[index];
    });

    const changepoints = peltDetect(normalized, penalty);
    const boundaryIndexes =
      changepoints.length > 0
        ? changepoints
        : Array.from({ length: Math.max(0, bins.length - 1) }, (_, index) => index + 1);
    const availableYears = Array.from(yearCount.keys()).sort((a, b) => a - b);
    const candidates = boundaryIndexes
      .filter((index) => index > 0 && index < bins.length)
      .map((index) => {
        const left = bins[index - 1];
        const right = bins[index];
        const delta = right.normalizedCount - left.normalizedCount;
        const targetYear = delta >= 0 ? right.peakYear : left.peakYear;
        return {
          year: nearestExistingYear(targetYear, availableYears),
          strength: Math.abs(delta),
          delta,
        };
      })
      .sort((left, right) => right.strength - left.strength);

    const keypoints: TimelineKeypoint[] = [];
    const usedYear = new Set<number>();
    candidates.forEach((point) => {
      if (keypoints.length >= 6) return;
      if (usedYear.has(point.year)) return;
      usedYear.add(point.year);
      keypoints.push(point);
    });

    result[category] = {
      minYear,
      maxYear,
      bins,
      changepoints,
      keypoints,
    };
  });

  return result;
});

const activeArrowData = computed<TimelineArrowDatum[]>(() => {
  const bundle = categoryPeltBundles.value[props.activeType];
  if (!bundle?.keypoints.length) return [];

  const yearCountMap = new Map<number, number>();
  activeTimeline.value.timeline.forEach((item) => {
    yearCountMap.set(item.year, item.count);
  });

  return bundle.keypoints.map((point) => ({
    value: [0.18, point.year, point.strength],
    symbolSize: Math.max(8, Math.min(13, Math.round(4 + ((yearCountMap.get(point.year) ?? 1) / maxYearCount.value) * 9))),
    symbolRotate: 270,
    symbolOffset: [-12, 0],
    itemStyle: {
      color: activePalette.value.accentColor,
      opacity: 0.88,
      shadowColor: 'rgba(0, 0, 0, 0.12)',
      shadowBlur: 2,
    },
  }));
});

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
    if (!themeRegistered) {
      echarts.registerTheme(TIMELINE_THEME_NAME, JSON.parse(JSON.stringify(vintage)));
      themeRegistered = true;
    }
    chart = echarts.init(chartRef.value, TIMELINE_THEME_NAME);
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
        show: false,
        trigger: 'item',
      },
      grid: {
        left: '42%',
        right: '18%',
        top: '2%',
        bottom: '3%',
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
        min: activeTimeline.value.begin,
        max: activeTimeline.value.end,
        inverse: true,
        position: 'left',
        interval: tickInterval.value,
        axisLabel: {
          showMinLabel: true,
          showMaxLabel: true,
          hideOverlap: true,
          margin: 3,
          color: '#4A4A4A',
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: 'bold',
          fontSize: 9,
          formatter: (value: number) => (value === activeTimeline.value.end ? `${formatYear(value)}(年)` : formatYear(value)),
        },
        axisTick: {
          show: true,
          interval: tickInterval.value,
          length: 3,
          lineStyle: {
            color: 'rgba(140, 140, 140, 0.82)',
          },
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: 'rgba(140, 140, 140, 0.92)',
            width: 1,
          },
        },
        splitLine: {
          show: false,
        },
      },
      series: [
        {
          type: 'scatter',
          data: bubbleSeriesData.value,
          symbol: 'circle',
          symbolSize: (_value: number[], params: { data: TimelinePointDatum }) => params.data.symbolSize,
          itemStyle: {
            color: activePalette.value.color,
            opacity: 0.8,
          },
          emphasis: {
            scale: false,
            itemStyle: {
              color: activePalette.value.color,
              opacity: 1,
            },
          },
          z: 3,
        },
        {
          type: 'scatter',
          data: activeArrowData.value,
          symbol: 'triangle',
          symbolSize: (_value: number[], params: { data: TimelineArrowDatum }) => params.data.symbolSize,
          symbolRotate: (_value: number[], params: { data: TimelineArrowDatum }) => params.data.symbolRotate,
          symbolOffset: (_value: number[], params: { data: TimelineArrowDatum }) => params.data.symbolOffset,
          itemStyle: {
            color: activePalette.value.accentColor,
            opacity: 0.88,
            shadowColor: 'rgba(0, 0, 0, 0.12)',
            shadowBlur: 2,
          },
          emphasis: {
            scale: false,
          },
          z: 6,
        },
      ],
    },
    true,
  );

  if (chartRef.value) {
    chart.resize({
      width: chartRef.value.clientWidth,
      height: chartRef.value.clientHeight,
    });
  } else {
    chart.resize();
  }
};

const handleResize = () => {
  if (chart && chartRef.value) {
    chart.resize({
      width: chartRef.value.clientWidth,
      height: chartRef.value.clientHeight,
    });
  } else {
    chart?.resize();
  }
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
    requestAnimationFrame(() => {
      handleResize();
      renderChart();
    });
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
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 16px 8px;
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

.art-timeline__axis-title {
  position: absolute;
  top: 50%;
  right: 18px;
  z-index: 2;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 4px;
  font-family: 'MatrixRefTitleFont', 'ChartTitleFont', 'TitleFont', serif;
  font-size: 25px;
  line-height: 1.08;
  color: #333333;
  pointer-events: none;
}

@media (max-width: 1400px) {
  .art-timeline__header {
    padding-bottom: 6px;
  }

  .art-timeline__axis-title {
    right: 14px;
    font-size: 22px;
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

  .art-timeline__axis-title {
    right: 10px;
    font-size: 20px;
  }
}
</style>
