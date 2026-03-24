<template>
  <section class="building-dashboard-screen">
    <div class="building-dashboard-screen__wash"></div>
    <div class="building-dashboard-screen__grain"></div>
    <div class="building-dashboard-screen__motif"></div>
    <div class="building-dashboard-screen__roof"></div>
    <span class="building-dashboard-screen__petal building-dashboard-screen__petal--a"></span>
    <span class="building-dashboard-screen__petal building-dashboard-screen__petal--b"></span>
    <span class="building-dashboard-screen__petal building-dashboard-screen__petal--c"></span>
    <span class="building-dashboard-screen__petal building-dashboard-screen__petal--d"></span>

    <div class="dashboard-shell">
      <aside class="dashboard-side-panel dashboard-side-panel--left">
        <section class="paper-card legend-block">

          <div class="type-list">
            <button
              v-for="type in buildingTypes"
              :key="type.label"
              type="button"
              class="type-card"
              :class="{ active: activeType === type.label }"
              @click="activeType = type.label"
            >
              <span class="type-card__label">
                <strong>{{ type.label }}</strong>
              </span>
            </button>
          </div>
        </section>
      </aside>

      <main class="dashboard-main">

        <section class="chart-grid">
          <article class="paper-card dashboard-panel dashboard-panel--frameless dashboard-panel--sankey">
            <div :ref="chartRefs.sankey" class="dashboard-panel__chart"></div>
          </article>

          <article class="paper-card dashboard-panel dashboard-panel--frameless">
            <div :ref="chartRefs.cloud" class="dashboard-panel__chart"></div>
          </article>

          <article class="paper-card dashboard-panel dashboard-panel--frameless">
            <div :ref="chartRefs.rose" class="dashboard-panel__chart"></div>
          </article>

          <article class="paper-card dashboard-panel dashboard-panel--frameless">
            <div :ref="chartRefs.sunburst" class="dashboard-panel__chart"></div>
          </article>
        </section>
      </main>

      <aside class="dashboard-side-panel dashboard-side-panel--right">
        <BuildingArtTimeline :buildings="timelineBuildings" :active-type="activeType" />
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import * as echarts from 'echarts/core';
import 'echarts-wordcloud';
import { GraphicComponent, TooltipComponent } from 'echarts/components';
import { PieChart, SankeyChart, SunburstChart } from 'echarts/charts';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import vintage from '@/assets/theme/vintage.json';
import BuildingArtTimeline from '@/components/BuildingArtTimeline.vue';
import rawBuildings from '../../building.json';

echarts.use([TooltipComponent, GraphicComponent, PieChart, SankeyChart, SunburstChart, CanvasRenderer, LabelLayout]);

const THEME_NAME = 'building-dashboard-vintage';
echarts.registerTheme(THEME_NAME, vintage);

type BuildingType = '\u6c11\u5c45' | '\u6865\u6881' | '\u5b98\u5e9c' | '\u5bab\u6bbf';
type TypeSlug = 'minju' | 'qiaoliang' | 'guanfu' | 'gongdian';
type ChartKey = 'rose' | 'cloud' | 'sankey' | 'sunburst';

interface TypeConfig {
  label: BuildingType;
  slug: TypeSlug;
  color: string;
  description: string;
}

interface RoseRingItem {
  name: string;
  value: number;
  percent?: number;
  itemStyle?: { color: string };
}

interface RoseGraph {
  building_type: BuildingType;
  summary: {
    building_count: number;
    rose_dynasty_count: number;
    rose_function_count: number;
    rose_material_count: number;
  };
  rings: {
    dynasty: RoseRingItem[];
    function: RoseRingItem[];
    material: RoseRingItem[];
  };
}

interface SankeyNode {
  name: string;
  depth: number;
  itemStyle?: {
    color?: string;
    borderColor?: string;
    borderWidth?: number;
  };
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface SankeyGraph {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface SunburstNode {
  name: string;
  value?: number;
  children?: SunburstNode[];
  itemStyle?: {
    color?: string;
  };
}

interface SunburstGraph {
  building_type: BuildingType;
  title: string;
  data: SunburstNode[];
}

interface WordCloudWord {
  name: string;
  value: number;
  term_count: number;
  building_count: number;
  avg_confidence?: number;
  dimensions: string[];
  originalValue?: number;
  textStyle?: {
    color: string;
  };
}

interface DashboardGraphs {
  rose: Record<BuildingType, RoseGraph>;
  sankey: Record<BuildingType, SankeyGraph>;
  sunburst: Record<BuildingType, SunburstGraph>;
  wordCloud: Record<BuildingType, WordCloudWord[]>;
}

const buildingTypes = [
  {
    label: '\u6c11\u5c45',
    slug: 'minju',
    color: '#b67a4a',
    description: 'Residential buildings.',
  },
  {
    label: '\u6865\u6881',
    slug: 'qiaoliang',
    color: '#6f7f8f',
    description: 'Bridge structures and water transport.',
  },
  {
    label: '\u5b98\u5e9c',
    slug: 'guanfu',
    color: '#4b765f',
    description: 'Official complexes and institutional architecture.',
  },
  {
    label: '\u5bab\u6bbf',
    slug: 'gongdian',
    color: '#a3473a',
    description: 'Palace buildings and court compounds.',
  },
] as const satisfies ReadonlyArray<TypeConfig>;

const roseRingPalettes = {
  dynasty: ['#6D7460', '#D46F6B', '#4A5255', '#786E56', '#D5A08A', '#C98F66', '#50858B'],
  function: ['#50858B', '#D5A08A', '#6D7460', '#D46F6B', '#786E56', '#4A5255', '#C98F66', '#87907D', '#B68F7C'],
  material: ['#4A5255', '#786E56', '#9AA391', '#D08A73', '#D5A08A', '#6D7460', '#50858B'],
} as const;
const ROSE_LABEL_FONT = 'ContentFont, STKaiti, KaiTi, serif';
const ROSE_RING_CENTER = ['50%', '53%'] as [string, string];
const ROSE_STROKE_COLOR = 'rgba(255, 255, 255, 0.96)';
const ROSE_CONNECTOR_COLOR = 'rgba(216, 180, 156, 0.94)';
const sankeyNodeColors = ['#60554A', '#4B8C9A', '#788D8E', '#A88463', '#C58370', '#4A5052', '#CDA77C', '#889585'] as const;

const sunburstLevelColors = ['#D4736E', '#82937E', '#D2A271', '#EE9C5D'] as const;
const SUNBURST_DYNASTY_COLOR_MAP: Record<string, string> = {
  '\u6e05': '#D4736E',
  '\u5176\u4ed6\u671d\u4ee3': '#EE9C5D',
};
const SUNBURST_LABEL_FONT = ROSE_LABEL_FONT;
const SUNBURST_INK_COLOR = '#2B2824';
const SUNBURST_GAP_COLOR = 'rgba(255, 255, 255, 0.98)';
const SUNBURST_LIGHT_TARGET = '#F4F1EC';
const SUNBURST_DARK_TARGET = '#8B2825';

const blendHexColor = (sourceHex: string, targetHex: string, ratio: number) => {
  const source = sourceHex.replace('#', '');
  const target = targetHex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => {
    const sourceValue = Number.parseInt(source.slice(offset, offset + 2), 16);
    const targetValue = Number.parseInt(target.slice(offset, offset + 2), 16);
    return Math.round(sourceValue + (targetValue - sourceValue) * ratio)
      .toString(16)
      .padStart(2, '0');
  });
  return `#${channels.join('')}`;
};

const deriveSunburstChildColor = (parentColor: string, index: number) => {
  const variations = [0.18, 0.08, -0.06, 0.26, 0.12];
  const offset = variations[index % variations.length];
  return offset >= 0
    ? blendHexColor(parentColor, SUNBURST_LIGHT_TARGET, offset)
    : blendHexColor(parentColor, SUNBURST_DARK_TARGET, Math.abs(offset) * 0.55);
};

const wordCloudColors = ['#d87c7c', '#919e8b', '#6e7074', '#61a0a8', '#787464', '#cc7e63', '#724e58', '#4b565b'];

const activeType = ref<BuildingType>('\u6c11\u5c45');
const dashboardGraphs = ref<DashboardGraphs | null>(null);
const isLoading = ref(true);
const loadError = ref<string | null>(null);
const timelineBuildings = rawBuildings as Array<{ id: string; name: string; category: BuildingType; year: number; importance: number }>;

const chartRefs: Record<ChartKey, Ref<HTMLDivElement | null>> = {
  rose: ref<HTMLDivElement | null>(null),
  cloud: ref<HTMLDivElement | null>(null),
  sankey: ref<HTMLDivElement | null>(null),
  sunburst: ref<HTMLDivElement | null>(null),
};

const chartInstances = new Map<ChartKey, echarts.EChartsType>();
let resizeFrame = 0;

const activeRoseGraph = computed(() => dashboardGraphs.value?.rose[activeType.value] ?? null);
const activeSankeyGraph = computed(() => dashboardGraphs.value?.sankey[activeType.value] ?? null);
const activeSunburstGraph = computed(() => dashboardGraphs.value?.sunburst[activeType.value] ?? null);
const activeWordCloud = computed(() => dashboardGraphs.value?.wordCloud[activeType.value] ?? null);

const fetchGraphJson = async <T,>(fileName: string): Promise<T> => {
  const response = await fetch(`${import.meta.env.BASE_URL}building-dashboard-graph4/${fileName}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${fileName}`);
  }
  return response.json() as Promise<T>;
};

const loadDashboardGraphs = async () => {
  isLoading.value = true;
  loadError.value = null;
  renderAllCharts();

  try {
    const typeEntries = await Promise.all(
      buildingTypes.map(async ({ label, slug }) => {
        const [rose, sankey, sunburst, wordCloud] = await Promise.all([
          fetchGraphJson<RoseGraph>(`${slug}-rose.json`),
          fetchGraphJson<SankeyGraph>(`${slug}-sankey.json`),
          fetchGraphJson<SunburstGraph>(`${slug}-sunburst.json`),
          fetchGraphJson<WordCloudWord[]>(`${slug}-wordcloud.json`),
        ]);

        return [label, { rose, sankey, sunburst, wordCloud }] as const;
      }),
    );

    const payload: DashboardGraphs = {
      rose: {} as Record<BuildingType, RoseGraph>,
      sankey: {} as Record<BuildingType, SankeyGraph>,
      sunburst: {} as Record<BuildingType, SunburstGraph>,
      wordCloud: {} as Record<BuildingType, WordCloudWord[]>,
    };

    typeEntries.forEach(([label, graphs]) => {
      payload.rose[label] = graphs.rose;
      payload.sankey[label] = graphs.sankey;
      payload.sunburst[label] = graphs.sunburst;
      payload.wordCloud[label] = graphs.wordCloud;
    });

    dashboardGraphs.value = payload;
  } catch (error) {
    dashboardGraphs.value = null;
    loadError.value = error instanceof Error ? error.message : 'Failed to load chart data';
  } finally {
    isLoading.value = false;
    renderAllCharts();
  }
};

const truncateLabel = (value: string, maxLength: number) => (value.length > maxLength ? `${value.slice(0, maxLength)}...` : value);

const buildStateGraphic = (title: string, note: string) => [
  {
    type: 'group',
    left: 'center',
    top: 'middle',
    children: [
      {
        type: 'text',
        x: 0,
        y: -10,
        style: {
          text: title,
          fill: '#6a4d3f',
          font: '600 18px ContentFont',
          textAlign: 'center',
        },
      },
      {
        type: 'text',
        x: 0,
        y: 18,
        style: {
          text: note,
          fill: 'rgba(92, 70, 58, 0.72)',
          font: '12px ContentFont',
          textAlign: 'center',
        },
      },
    ],
  },
];

const setChartState = (key: ChartKey, title: string, note: string) => {
  const chart = chartInstances.get(key);
  if (!chart) return;
  chart.clear();
  chart.setOption(
    {
      tooltip: { show: false },
      graphic: buildStateGraphic(title, note),
      series: [],
    },
    { notMerge: true },
  );
};

const decorateRoseItems = (items: RoseRingItem[], palette: readonly string[]) => {
  const sortedItems = [...items].sort((left, right) => right.value - left.value);
  const total = sortedItems.reduce((sum, item) => sum + item.value, 0);
  return sortedItems.map((item, index) => ({
    ...item,
    percent: total > 0 ? (item.value / total) * 100 : 0,
    itemStyle: { color: palette[index % palette.length] },
  }));
};

const buildRoseSeries = (name: string, radius: [string, string], data: RoseRingItem[], showOuterLabel: boolean) => ({
  name,
  type: 'pie',
  roseType: 'radius',
  radius,
  center: ROSE_RING_CENTER,
  startAngle: 92,
  clockwise: false,
  minAngle: 6,
  selectedMode: false,
  avoidLabelOverlap: showOuterLabel,
  itemStyle: {
    borderRadius: 6,
    borderWidth: 2.2,
    borderColor: ROSE_STROKE_COLOR,
  },
  label: showOuterLabel
    ? {
        show: true,
        position: 'outside',
        fontFamily: ROSE_LABEL_FONT,
        fontSize: 12,
        fontWeight: 700,
        color: '#2c2c2c',
        textBorderColor: 'rgba(255, 255, 255, 0.78)',
        textBorderWidth: 3,
        padding: [1, 0, 0, 0],
        formatter: (params: { name: string }) => params.name,
      }
    : {
        show: false,
      },
  labelLine: {
    show: showOuterLabel,
    smooth: 0.36,
    length: 10,
    length2: 14,
    lineStyle: {
      color: ROSE_CONNECTOR_COLOR,
      width: 1.1,
    },
  },
  labelLayout: showOuterLabel
    ? {
        hideOverlap: false,
        moveOverlap: 'shiftY',
      }
    : {
        hideOverlap: true,
      },
  emphasis: {
    scale: false,
    itemStyle: {
      borderWidth: 2.6,
      borderColor: ROSE_STROKE_COLOR,
    },
  },
  tooltip: {
    textStyle: {
      fontFamily: ROSE_LABEL_FONT,
      fontSize: 13,
    },
  },
  data,
});

const renderRoseChart = () => {
  if (isLoading.value) {
    setChartState('rose', '正在加载图表', '正在读取 graph_4 玫瑰图数据');
    return;
  }

  if (loadError.value) {
    setChartState('rose', '图表数据读取失败', loadError.value);
    return;
  }

  const graph = activeRoseGraph.value;
  const chart = chartInstances.get('rose');
  if (!chart || !graph) {
    setChartState('rose', '暂无图表数据', '当前类型没有可用玫瑰图');
    return;
  }

  const dynastyData = decorateRoseItems(graph.rings.dynasty, roseRingPalettes.dynasty);
  const functionData = decorateRoseItems(graph.rings.function, roseRingPalettes.function);
  const materialData = decorateRoseItems(graph.rings.material, roseRingPalettes.material);

  chart.setOption(
    {
      animationDuration: 650,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(248, 242, 232, 0.96)',
        borderColor: 'rgba(151, 117, 93, 0.22)',
        borderWidth: 1,
        textStyle: {
          color: '#4f3b2f',
          fontFamily: ROSE_LABEL_FONT,
          fontSize: 13,
        },
        formatter: (params: any) =>
          String(params.seriesName) +
          '<br/>' +
          String(params.name) +
          '<br/>数量：' +
          String(params.value) +
          '<br/>占比：' +
          String((params.data.percent ?? 0).toFixed(1)) +
          '%',
      },
      series: [
        buildRoseSeries('主要朝代', ['10%', '22%'], dynastyData, false),
        buildRoseSeries('建筑功能', ['30%', '45%'], functionData, false),
        buildRoseSeries('建筑材料', ['53%', '72%'], materialData, true),
      ],
    },
    { notMerge: true },
  );
};

const normalizeWordCloudWords = (words: WordCloudWord[]) => {
  const sorted = [...words].sort((left, right) => right.value - left.value).slice(0, 80);
  if (sorted.length === 0) return [];

  const values = sorted.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || 1;

  return sorted.map((item, index) => ({
    ...item,
    originalValue: item.value,
    value: ((maxValue === minValue ? 1 : (item.value - minValue) / span) * 32) + 14,
    textStyle: { color: wordCloudColors[index % wordCloudColors.length] },
  }));
};

const getWordCloudLayout = () => {
  const width = chartRefs.cloud.value?.clientWidth ?? 0;
  const height = chartRefs.cloud.value?.clientHeight ?? 0;
  const minSide = Math.max(Math.min(width, height), 280);

  if (minSide < 340) {
    return {
      gridSize: 9,
      sizeRange: [12, 28] as [number, number],
    };
  }

  if (minSide < 500) {
    return {
      gridSize: 7,
      sizeRange: [14, 36] as [number, number],
    };
  }

  return {
    gridSize: 6,
    sizeRange: [15, 44] as [number, number],
  };
};

const renderWordCloudChart = () => {
  if (isLoading.value) {
    setChartState('cloud', '\u6b63\u5728\u52a0\u8f7d\u56fe\u8868', '\u6b63\u5728\u8bfb\u53d6 graph_4 \u8bcd\u4e91\u6570\u636e');
    return;
  }

  if (loadError.value) {
    setChartState('cloud', '\u56fe\u8868\u6570\u636e\u8bfb\u53d6\u5931\u8d25', loadError.value);
    return;
  }

  const words = activeWordCloud.value;
  const chart = chartInstances.get('cloud');
  if (!chart || !words || words.length === 0) {
    setChartState('cloud', '\u6682\u65e0\u56fe\u8868\u6570\u636e', '\u5f53\u524d\u7c7b\u578b\u6ca1\u6709\u53ef\u7528\u8bcd\u4e91');
    return;
  }

  const normalizedWords = normalizeWordCloudWords(words);
  const layout = getWordCloudLayout();

  chart.setOption(
    {
      animationDurationUpdate: 1200,
      animationEasingUpdate: 'quarticOut',
      tooltip: {
        show: true,
        backgroundColor: 'rgba(255, 249, 240, 0.96)',
        borderColor: 'rgba(151, 117, 93, 0.24)',
        borderWidth: 1,
        textStyle: {
          color: '#4f3b2f',
          fontFamily: 'ContentFont',
          fontSize: 13,
        },
        formatter: (params: any) => {
          const rawWeight = params.data.originalValue;
          const weight = typeof rawWeight === 'number' ? rawWeight.toFixed(2) : rawWeight;
          const dimensions = Array.isArray(params.data.dimensions) ? params.data.dimensions.join(' / ') : '';
          return (
            String(params.data.name) +
            '<br/>\u8bcd\u6743\u91cd\uff1a' +
            String(weight ?? '') +
            '<br/>\u51fa\u73b0\u6b21\u6570\uff1a' +
            String(params.data.term_count ?? '') +
            '<br/>\u8986\u76d6\u7ef4\u5ea6\uff1a' +
            dimensions
          );
        },
      },
      series: [
        {
          type: 'wordCloud',
          shape: 'circle',
          left: 'center',
          top: 'center',
          width: '82%',
          height: '102%',
          sizeRange: layout.sizeRange,
          gridSize: layout.gridSize,
          rotationRange: [0, 0],
          drawOutOfBound: false,
          textStyle: {
            fontFamily: 'ContentFont',
            fontWeight: 'bold',
            shadowBlur: 10,
            shadowColor: 'rgba(51, 51, 51, 0.2)',
          },
          emphasis: {
            textStyle: {
              shadowBlur: 16,
              shadowColor: 'rgba(92, 67, 55, 0.35)',
            },
          },
          data: normalizedWords,
        },
      ],
    },
    { notMerge: true },
  );
};

const decorateSankeyNodes = (nodes: SankeyNode[]) => {
  let nodeIndex = 0;

  return nodes.map((node) => {
    const color = sankeyNodeColors[nodeIndex % sankeyNodeColors.length];
    nodeIndex += 1;

    return {
      ...node,
      itemStyle: {
        color,
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
      },
    };
  });
};

const renderSankeyChart = () => {
  if (isLoading.value) {
    setChartState('sankey', '\u6b63\u5728\u52a0\u8f7d\u56fe\u8868', '\u6b63\u5728\u8bfb\u53d6 graph_4 \u6851\u57fa\u56fe\u6570\u636e');
    return;
  }

  if (loadError.value) {
    setChartState('sankey', '\u56fe\u8868\u6570\u636e\u8bfb\u53d6\u5931\u8d25', loadError.value);
    return;
  }

  const graph = activeSankeyGraph.value;
  const chart = chartInstances.get('sankey');
  if (!chart || !graph || graph.nodes.length === 0) {
    setChartState('sankey', '\u6682\u65e0\u56fe\u8868\u6570\u636e', '\u5f53\u524d\u7c7b\u578b\u6ca1\u6709\u53ef\u7528\u6851\u57fa\u56fe');
    return;
  }

  chart.setOption(
    {
      backgroundColor: 'transparent',
      animationDuration: 520,
      animationDurationUpdate: 360,
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        backgroundColor: 'rgba(245, 244, 240, 0.96)',
        borderColor: 'rgba(96, 85, 74, 0.12)',
        borderWidth: 1,
        textStyle: {
          color: '#333333',
          fontFamily: 'ContentFont',
          fontSize: 13,
        },
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return params.name;
          }
          return (
            String(params.data.source) +
            ' -> ' +
            String(params.data.target) +
            '<br/>\u6570\u91cf\uff1a' +
            String(params.data.value)
          );
        },
      },
      series: [
        {
          type: 'sankey',
          left: '4%',
          top: '4%',
          right: '14%',
          bottom: '4%',
          draggable: false,
          blendMode: 'multiply',
          nodeAlign: 'justify',
          emphasis: {
            focus: 'adjacency',
            lineStyle: { color: '#C6C1B8', opacity: 0.9, width: 1.6 },
            itemStyle: { opacity: 1 },
            label: { color: '#2f241d' },
          },
          blur: {
            lineStyle: { opacity: 0.18 },
            itemStyle: { opacity: 0.34 },
            label: { opacity: 0.42 },
          },
          data: decorateSankeyNodes(graph.nodes),
          links: graph.links,
          lineStyle: { color: '#DDD9D2', curveness: 0.56, opacity: 0.56 },
          nodeGap: 10,
          nodeWidth: 16,
          label: {
            color: '#333333',
            fontFamily: 'ContentFont',
            fontSize: 12,
            fontWeight: 400,
            formatter: (params: { name: string }) => truncateLabel(params.name, 12),
          },
          levels: [
            { depth: 0, itemStyle: { borderRadius: 0, borderWidth: 0 }, lineStyle: { color: '#DDD9D2', opacity: 0.56 } },
            { depth: 1, itemStyle: { borderRadius: 0, borderWidth: 0 }, lineStyle: { color: '#DDD9D2', opacity: 0.56 } },
            { depth: 2, itemStyle: { borderRadius: 0, borderWidth: 0 }, lineStyle: { color: '#DDD9D2', opacity: 0.56 } },
          ],
        },
      ],
    },
    { notMerge: true },
  );
};

const decorateSunburstData = (data: SunburstNode[]) =>
  data.map((dynastyNode, dynastyIndex) => {
    const dynastyColor =
      SUNBURST_DYNASTY_COLOR_MAP[dynastyNode.name] ??
      sunburstLevelColors[dynastyIndex % sunburstLevelColors.length];
    return {
      ...dynastyNode,
      itemStyle: { color: dynastyColor },
      children: (dynastyNode.children ?? []).map((regionNode, regionIndex) => {
        const regionColor = deriveSunburstChildColor(dynastyColor, regionIndex);
        return {
          ...regionNode,
          itemStyle: { color: regionColor },
          children: (regionNode.children ?? []).map((structureNode) => ({
            ...structureNode,
            itemStyle: { color: regionColor },
          })),
        };
      }),
    };
  });

const renderSunburstChart = () => {
  if (isLoading.value) {
    setChartState('sunburst', '\u6b63\u5728\u52a0\u8f7d\u56fe\u8868', '\u6b63\u5728\u8bfb\u53d6 graph_4 \u65ed\u65e5\u56fe\u6570\u636e');
    return;
  }

  if (loadError.value) {
    setChartState('sunburst', '\u56fe\u8868\u6570\u636e\u8bfb\u53d6\u5931\u8d25', loadError.value);
    return;
  }

  const graph = activeSunburstGraph.value;
  const chart = chartInstances.get('sunburst');
  if (!chart || !graph || graph.data.length === 0) {
    setChartState('sunburst', '\u6682\u65e0\u56fe\u8868\u6570\u636e', '\u5f53\u524d\u7c7b\u578b\u6ca1\u6709\u53ef\u7528\u65ed\u65e5\u56fe');
    return;
  }

  chart.setOption(
    {
      animationDuration: 680,
      animationEasing: 'cubicOut',
      tooltip: {
        show: true,
        backgroundColor: 'rgba(248, 242, 232, 0.98)',
        borderColor: 'rgba(151, 117, 93, 0.22)',
        borderWidth: 1,
        textStyle: {
          color: '#4f3b2f',
          fontFamily: SUNBURST_LABEL_FONT,
          fontSize: 13,
        },
        formatter: (params: any) => {
          const path = params.treePathInfo.slice(1).map((item: { name: string }) => item.name).join(' / ');
          return String(path) + '<br/>\u6570\u91cf\uff1a' + String(params.value);
        },
      },
      series: [
        {
          type: 'sunburst',
          data: decorateSunburstData(graph.data),
          radius: ['18%', '84%'],
          center: ['50%', '53%'],
          nodeClick: false,
          sort: null,
          emphasis: {
            focus: 'ancestor',
          },
          itemStyle: {
            borderRadius: 8,
            borderWidth: 2,
            borderColor: SUNBURST_GAP_COLOR,
          },
          label: {
            fontFamily: SUNBURST_LABEL_FONT,
            fontWeight: 'bold',
            color: SUNBURST_INK_COLOR,
          },
          levels: [
            {},
            {
              r0: '18%',
              r: '48%',
              itemStyle: {
                borderRadius: 10,
                borderWidth: 2.4,
                borderColor: SUNBURST_GAP_COLOR,
              },
              label: {
                rotate: 0,
                fontSize: 17,
                minAngle: 12,
                color: SUNBURST_INK_COLOR,
              },
            },
            {
              r0: '49%',
              r: '68%',
              itemStyle: {
                borderRadius: 9,
                borderWidth: 2.2,
                borderColor: SUNBURST_GAP_COLOR,
              },
              label: {
                rotate: 'tangential',
                fontSize: 12,
                minAngle: 6,
                color: SUNBURST_INK_COLOR,
              },
            },
            {
              r0: '72%',
              r: '80%',
              itemStyle: {
                borderRadius: 8,
                borderWidth: 2.1,
                borderColor: SUNBURST_GAP_COLOR,
              },
              label: {
                show: true,
                position: 'outside',
                rotate: 'radial',
                distance: 4,
                minAngle: 2,
                fontSize: 10,
                color: SUNBURST_INK_COLOR,
              },
            },
          ],
        },
      ],
    },
    { notMerge: true },
  );
};

const renderAllCharts = () => {
  renderRoseChart();
  renderWordCloudChart();
  renderSankeyChart();
  renderSunburstChart();
};

const initCharts = () => {
  (Object.keys(chartRefs) as ChartKey[]).forEach((key) => {
    const element = chartRefs[key].value;
    if (!element) return;
    chartInstances.set(key, echarts.init(element, THEME_NAME));
  });
};

const resizeAllCharts = () => {
  chartInstances.forEach((chart) => chart.resize());
};

const handleResize = () => {
  if (resizeFrame) {
    window.cancelAnimationFrame(resizeFrame);
  }

  resizeFrame = window.requestAnimationFrame(() => {
    resizeAllCharts();
    renderWordCloudChart();
    resizeFrame = 0;
  });
};

watch(activeType, () => {
  renderAllCharts();
});

onMounted(async () => {
  initCharts();
  await nextTick();
  resizeAllCharts();
  renderAllCharts();
  window.addEventListener('resize', handleResize);
  await loadDashboardGraphs();
  await nextTick();
  window.requestAnimationFrame(() => {
    resizeAllCharts();
    renderAllCharts();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (resizeFrame) {
    window.cancelAnimationFrame(resizeFrame);
  }
  chartInstances.forEach((chart) => chart.dispose());
  chartInstances.clear();
});
</script>

<style scoped lang="scss">
.building-dashboard-screen {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(247, 241, 231, 0.76), rgba(240, 231, 218, 0.72)),
    radial-gradient(circle at 12% 10%, rgba(255, 255, 255, 0.52), transparent 18%),
    radial-gradient(circle at 84% 20%, rgba(255, 255, 255, 0.36), transparent 20%);
}

.building-dashboard-screen__wash,
.building-dashboard-screen__grain,
.building-dashboard-screen__motif,
.building-dashboard-screen__roof {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.building-dashboard-screen__wash {
  background:
    radial-gradient(circle at 20% 16%, rgba(255, 255, 255, 0.4), transparent 22%),
    radial-gradient(circle at 74% 24%, rgba(214, 186, 164, 0.18), transparent 22%);
}

.building-dashboard-screen__grain {
  background: repeating-linear-gradient(135deg, rgba(129, 99, 77, 0.025) 0, rgba(129, 99, 77, 0.025) 1px, transparent 1px, transparent 16px);
  mix-blend-mode: multiply;
}

.building-dashboard-screen__motif {
  opacity: 0.3;
  background:
    radial-gradient(circle at 24% 74%, rgba(128, 96, 77, 0.1), transparent 18%),
    radial-gradient(circle at 74% 38%, rgba(128, 96, 77, 0.08), transparent 20%),
    radial-gradient(circle at 78% 78%, rgba(128, 96, 77, 0.12), transparent 22%);
}

.building-dashboard-screen__roof {
  inset: auto 0 0 auto;
  width: 26%;
  height: 24%;
  background:
    linear-gradient(180deg, transparent, rgba(126, 104, 86, 0.14)),
    radial-gradient(circle at 58% 86%, rgba(110, 95, 83, 0.16), transparent 54%);
  clip-path: polygon(34% 22%, 74% 8%, 100% 38%, 100% 100%, 0 100%, 0 62%);
  opacity: 0.52;
  filter: blur(0.6px);
}

.building-dashboard-screen__petal {
  position: absolute;
  width: 14px;
  height: 24px;
  border-radius: 50% 50% 46% 46%;
  background: rgba(244, 176, 196, 0.68);
  filter: blur(0.3px);
  transform: rotate(20deg);
  pointer-events: none;
}

.building-dashboard-screen__petal--a {
  top: 4%;
  left: 40%;
}

.building-dashboard-screen__petal--b {
  top: 18%;
  right: 7%;
  transform: rotate(-20deg);
}

.building-dashboard-screen__petal--c {
  top: 74%;
  left: -0.1%;
}

.building-dashboard-screen__petal--d {
  top: 48%;
  right: 18%;
  transform: rotate(-16deg);
}

.dashboard-shell {
  position: relative;
  z-index: 10;
  height: 100vh;
  padding: 6px 8px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(70px, 84px) minmax(0, 1fr) minmax(136px, 156px);
  gap: 6px;
}

.dashboard-side-panel {
  min-height: 0;
  display: grid;
  gap: 8px;
  align-content: center;
}

.dashboard-main {
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
}

.paper-card {
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.legend-block,
.metric-block,
.insight-block,
.note-block {
  padding: 0;
  display: grid;
  gap: 8px;
}

.legend-block__header,
.metric-block__head,
.insight-block__head,
.note-block__head {
  display: none;
}

.legend-block__eyebrow,
.metric-block__eyebrow,
.insight-block__eyebrow,
.note-block__eyebrow,
.dashboard-status__eyebrow {
  margin: 0;
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: rgba(109, 81, 66, 0.68);
  text-transform: uppercase;
}

.legend-block__title,
.metric-block__title,
.insight-block__title,
.note-block__title,
.dashboard-status__heading h1,
.dashboard-panel__head h3 {
  margin: 0;
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  color: #7c3125;
  line-height: 1.08;
}

.legend-block__title,
.metric-block__title,
.insight-block__title,
.note-block__title {
  font-size: 22px;
}

.legend-block__description,
.dashboard-status__heading p,
.dashboard-panel__head p {
  margin: 0;
  font-family: 'ContentFont', serif;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(88, 66, 54, 0.76);
}

.type-list {
  display: grid;
  gap: 4px;
}

.type-card {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 4px;
  border: none;
  border-radius: 0;
  background: transparent;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
  box-shadow: none;
  position: relative;
}

.type-card:hover {
  background: rgba(244, 237, 226, 0.52);
}

.type-card.active {
  background: rgba(244, 237, 226, 0.72);
}

.type-card__label {
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-card__label strong {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 20px;
  line-height: 1;
  letter-spacing: 0.04em;
  color: #6d3026;
  font-weight: 400;
  transition: color 0.18s ease;
}

.type-card::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 2px;
  transform: translateX(-50%) scaleX(0.2);
  transform-origin: center;
  width: min(74%, 76px);
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(154, 67, 54, 0.14), rgba(154, 67, 54, 0.98), rgba(154, 67, 54, 0.14));
  opacity: 0;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.type-card:hover .type-card__label strong,
.type-card.active .type-card__label strong {
  color: #8f3128;
}

.type-card:hover::after,
.type-card.active::after {
  opacity: 1;
  transform: translateX(-50%) scaleX(1);
}

.metric-grid {
  display: none;
}

.metric-item,
.insight-row,
.chart-guide__item {
  padding: 10px 12px;
  border-radius: 16px 12px 14px 10px;
  background: linear-gradient(180deg, rgba(246, 239, 229, 0.6), rgba(241, 232, 219, 0.38));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.metric-item {
  display: grid;
  gap: 4px;
}

.metric-item__label {
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: rgba(112, 84, 68, 0.58);
  text-transform: uppercase;
}

.metric-item__value {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 18px;
  line-height: 1.08;
  color: #734031;
  font-weight: 400;
}

.dashboard-status {
  display: none;
}

.dashboard-status__heading {
  display: grid;
  gap: 4px;
}

.dashboard-status__heading h1 {
  font-size: 30px;
}

.dashboard-status__heading p {
  max-width: 56ch;
}

.dashboard-status__group {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.dashboard-status__tag,
.dashboard-panel__meta {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px 3px;
  border: 1px solid rgba(147, 116, 93, 0.16);
  background: rgba(249, 244, 236, 0.82);
  font-family: 'ContentFont', serif;
  font-size: 11px;
  color: rgba(83, 61, 49, 0.78);
}

.chart-grid {
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: 4px;
}

.dashboard-panel {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  overflow: hidden;
}

.dashboard-panel--sankey {
  --sankey-panel-shift: 12px;
  overflow: visible;
}

.dashboard-panel__head {
  display: none;
}

.dashboard-panel__head h3 {
  font-size: 18px;
  margin-bottom: 4px;
}

.dashboard-panel__head p {
  max-width: 28ch;
  font-size: 11px;
}

.dashboard-panel__chart {
  flex: 1;
  width: 97%;
  height: 97%;
  min-height: 0;
  margin: auto;
  overflow: visible;
}

.dashboard-panel--sankey .dashboard-panel__chart {
  width: 100%;
  height: 100%;
  transform: translateX(var(--sankey-panel-shift));
  transform-origin: center center;
}

.dashboard-side-panel--right {
  min-height: 0;
  height: 100%;
  align-content: stretch;
  grid-template-rows: minmax(0, 1fr);
}

.dashboard-side-panel--right :deep(.art-timeline) {
  height: 100%;
  min-height: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.dashboard-side-panel--right :deep(.art-timeline__wash),
.dashboard-side-panel--right :deep(.art-timeline__mountain),
.dashboard-side-panel--right :deep(.art-timeline__petal),
.dashboard-side-panel--right :deep(.art-timeline__header) {
  display: none;
}

.dashboard-side-panel--right :deep(.art-timeline__chart) {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.insight-list,
.chart-guide {
  display: grid;
  gap: 8px;
}

.insight-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.insight-row span,
.chart-guide__item span {
  font-family: 'ContentFont', serif;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(85, 65, 53, 0.78);
}

.insight-row strong,
.chart-guide__item strong {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 17px;
  line-height: 1.08;
  color: #734031;
  font-weight: 400;
}

.chart-guide__item {
  display: grid;
  gap: 4px;
}

.word-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.word-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(147, 116, 93, 0.16);
  background: rgba(249, 244, 236, 0.82);
  font-family: 'ContentFont', serif;
  font-size: 11px;
  color: rgba(83, 61, 49, 0.82);
}

@media (max-width: 1420px) {
  .dashboard-shell {
    grid-template-columns: minmax(66px, 80px) minmax(0, 1fr) minmax(126px, 146px);
    gap: 5px;
    padding: 8px;
  }
}

@media (max-width: 1100px) {
  .building-dashboard-screen {
    overflow: auto;
  }

  .dashboard-shell {
    height: auto;
    min-height: 100vh;
    grid-template-columns: 1fr;
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .building-dashboard-screen {
    position: relative;
    inset: auto;
    min-height: 100vh;
  }

  .dashboard-shell {
    padding: 10px;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .type-card {
    justify-content: flex-start;
    padding-left: 10px;
  }
}
</style>

