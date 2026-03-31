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
const TIMELINE_THEME_NAME = 'building-art-vintage';
let themeRegistered = false;

const activePalette = computed(() => categoryPalettes[props.activeType]);

const formatYear = (year: number) => (year < 0 ? `前${Math.abs(year)}` : `${year}`);

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
      color: '#D98888',
      opacity: 0.8,
    },
    names: item.items.slice(0, 6).map((building) => building.name),
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
            color: '#D98888',
            opacity: 0.8,
          },
          emphasis: {
            scale: false,
            itemStyle: {
              color: '#D98888',
              opacity: 1,
            },
          },
          z: 3,
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
