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

type BuildingType = '民居' | '桥梁' | '官府' | '宫殿';
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
    label: '民居',
    slug: 'minju',
    color: '#b67a4a',
    description: '聚焦居住、宗族与防御空间在不同时代中的分布。',
  },
  {
    label: '桥梁',
    slug: 'qiaoliang',
    color: '#6f7f8f',
    description: '突出交通、水利与桥体结构之间的组合关系。',
  },
  {
    label: '官府',
    slug: 'guanfu',
    color: '#4b765f',
    description: '观察官署体系在朝代、结构和材料上的组织特征。',
  },
  {
    label: '宫殿',
    slug: 'gongdian',
    color: '#a3473a',
    description: '样本较少，但中轴、殿阁与宫苑特征更集中。',
  },
] as const satisfies ReadonlyArray<TypeConfig>;

const roseRingPalettes = {
  dynasty: ['#b65e48', '#c97858', '#d6a16f', '#b58347', '#8b6b57', '#c7b08a'],
  function: ['#4b765f', '#68866f', '#8da16a', '#7c9468', '#5a8c7f', '#93a08d', '#547062'],
  material: ['#7a6c92', '#9274a3', '#6d88a2', '#5d7a95', '#8d94a6', '#b39478', '#7f8b9b'],
} as const;

const sankeyNodeColors = ['#60554A', '#4B8C9A', '#788D8E', '#A88463', '#C58370', '#4A5052', '#CDA77C', '#889585'] as const;

const sunburstLevelColors = {
  level0: ['#d87c7c', '#919e8b', '#d7ab82', '#95a5a6', '#c28f6a'],
  level1: ['#e9967a', '#a8c3a8', '#e0b890', '#b7c3c8', '#d3b085'],
  level2: ['#f4a460', '#8fbc8f', '#d2b48c', '#8b7355', '#b22222', '#6b8e23', '#a0522d'],
} as const;

const wordCloudColors = ['#d87c7c', '#919e8b', '#6e7074', '#61a0a8', '#787464', '#cc7e63', '#724e58', '#4b565b'];

const activeType = ref<BuildingType>('民居');
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
    throw new Error(`鏃犳硶璇诲彇 ${fileName}`);
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
    loadError.value = error instanceof Error ? error.message : '鍥捐〃鏁版嵁鍔犺浇澶辫触';
  } finally {
    isLoading.value = false;
    renderAllCharts();
  }
};

const truncateLabel = (value: string, maxLength: number) => (value.length > maxLength ? `${value.slice(0, maxLength)}…` : value);

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
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return items.map((item, index) => ({
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
  center: ['50%', '53%'],
  minAngle: 3,
  selectedMode: false,
  itemStyle: {
    borderRadius: 4,
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  label: {
    show: true,
    position: showOuterLabel ? 'outside' : 'inside',
    fontFamily: 'ContentFont',
    fontSize: showOuterLabel ? 10 : 9,
    fontWeight: 600,
    color: '#4a372b',
    textBorderColor: 'rgba(255, 255, 255, 0.82)',
    textBorderWidth: 2,
    formatter: (params: { name: string }) => truncateLabel(params.name, showOuterLabel ? 8 : 4),
  },
  labelLine: {
    show: showOuterLabel,
    smooth: 0.45,
    length: 4,
    length2: 4,
  },
  tooltip: {
    textStyle: {
      fontFamily: 'ContentFont',
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
    setChartState('rose', '鍥捐〃鍔犺浇澶辫触', loadError.value);
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
      animationDuration: 500,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(248, 242, 232, 0.96)',
        borderColor: 'rgba(151, 117, 93, 0.22)',
        borderWidth: 1,
        textStyle: {
          color: '#4f3b2f',
          fontFamily: 'ContentFont',
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
        buildRoseSeries('主要朝代', ['8%', '22%'], dynastyData, false),
        buildRoseSeries('建筑功能', ['28%', '44%'], functionData, false),
        buildRoseSeries('建筑材料', ['50%', '68%'], materialData, true),
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
    setChartState('cloud', '姝ｅ湪鍔犺浇鍥捐〃', '璇诲彇 graph_4 璇嶄簯鏁版嵁');
    return;
  }

  if (loadError.value) {
    setChartState('cloud', '鍥捐〃鍔犺浇澶辫触', loadError.value);
    return;
  }

  const words = activeWordCloud.value;
  const chart = chartInstances.get('cloud');
  if (!chart || !words || words.length === 0) {
    setChartState('cloud', '鏆傛棤鍥捐〃鏁版嵁', '褰撳墠绫诲瀷娌℃湁鍙敤璇嶄簯');
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
          const dimensions = Array.isArray(params.data.dimensions) ? params.data.dimensions.join('、') : '';
          return (
            String(params.data.name) +
            '<br/>词权重：' +
            String(weight ?? '') +
            '<br/>出现次数：' +
            String(params.data.term_count ?? '') +
            '<br/>覆盖维度：' +
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
    setChartState('sankey', '正在加载图表', '正在读取 graph_4 桑基图数据');
    return;
  }

  if (loadError.value) {
    setChartState('sankey', '鍥捐〃鍔犺浇澶辫触', loadError.value);
    return;
  }

  const graph = activeSankeyGraph.value;
  const chart = chartInstances.get('sankey');
  if (!chart || !graph || graph.nodes.length === 0) {
    setChartState('sankey', '暂无图表数据', '当前类型没有可用桑基图');
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
            ' → ' +
            String(params.data.target) +
            '<br/>数量：' +
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

const decorateSunburstData = (data: SunburstNode[]) => {
  let level0Index = 0;
  let level1Index = 0;
  let level2Index = 0;

  return data.map((dynastyNode) => ({
    ...dynastyNode,
    itemStyle: { color: sunburstLevelColors.level0[level0Index++ % sunburstLevelColors.level0.length] },
    children: (dynastyNode.children ?? []).map((regionNode) => ({
      ...regionNode,
      itemStyle: { color: sunburstLevelColors.level1[level1Index++ % sunburstLevelColors.level1.length] },
      children: (regionNode.children ?? []).map((structureNode) => ({
        ...structureNode,
        itemStyle: { color: sunburstLevelColors.level2[level2Index++ % sunburstLevelColors.level2.length] },
      })),
    })),
  }));
};

const renderSunburstChart = () => {
  if (isLoading.value) {
    setChartState('sunburst', '正在加载图表', '正在读取 graph_4 旭日图数据');
    return;
  }

  if (loadError.value) {
    setChartState('sunburst', '鍥捐〃鍔犺浇澶辫触', loadError.value);
    return;
  }

  const graph = activeSunburstGraph.value;
  const chart = chartInstances.get('sunburst');
  if (!chart || !graph || graph.data.length === 0) {
    setChartState('sunburst', '暂无图表数据', '当前类型没有可用旭日图');
    return;
  }

  chart.setOption(
    {
      animationDuration: 500,
      tooltip: {
        show: true,
        backgroundColor: 'rgba(248, 242, 232, 0.98)',
        borderColor: 'rgba(151, 117, 93, 0.22)',
        borderWidth: 1,
        textStyle: {
          color: '#4f3b2f',
          fontFamily: 'ContentFont',
          fontSize: 13,
        },
        formatter: (params: any) => {
          const path = params.treePathInfo.slice(1).map((item: { name: string }) => item.name).join(' 路 ');
          return String(path) + '<br/>数量：' + String(params.value);
        },
      },
      series: [
        {
          type: 'sunburst',
          data: decorateSunburstData(graph.data),
          radius: ['16%', '86%'],
          center: ['50%', '54%'],
          nodeClick: false,
          sort: null,
          emphasis: {
            focus: 'ancestor',
          },
          itemStyle: {
            borderRadius: 6,
            borderWidth: 1.2,
            borderColor: 'rgba(255,255,255,0.78)',
          },
          label: {
            fontFamily: 'ContentFont',
            fontSize: 10,
            fontWeight: 'bold',
            color: '#52392c',
          },
          levels: [
            {},
            {
              r0: '16%',
              r: '36%',
              label: {
                rotate: 0,
                fontSize: 10,
                minAngle: 8,
              },
            },
            {
              r0: '36%',
              r: '60%',
              label: {
                rotate: 'tangential',
                fontSize: 9,
                minAngle: 6,
              },
            },
            {
              r0: '60%',
              r: '86%',
              label: {
                show: true,
                position: 'outside',
                distance: 2,
                minAngle: 5,
                fontSize: 8,
              },
              labelLine: {
                show: true,
                showAbove: true,
                smooth: true,
                minTurnAngle: 45,
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
