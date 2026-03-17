<template>
  <section class="building-dashboard-screen">
    <div class="building-dashboard-screen__wash"></div>
    <div class="building-dashboard-screen__grain"></div>
    <div class="building-dashboard-screen__motif"></div>

    <div class="dashboard-shell">
      <aside class="dashboard-side-panel dashboard-side-panel--left">
        <section class="paper-card legend-block">
          <div class="legend-block__header">
            <p class="legend-block__eyebrow">第三部分</p>
            <h2 class="legend-block__title">建筑可视化</h2>
            <p class="legend-block__description">
              将 `graph_4` 新绘制的玫瑰图、词云、桑基图和旭日图收束进中部 2x2 图窗，并统一缩放细节以适配当前版面。
            </p>
          </div>

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
                <small>{{ type.description }}</small>
              </span>
              <span class="type-card__meta">
                <i class="type-card__dot" :style="{ '--type-color': type.color }"></i>
                <em>{{ formatTypeCount(type.label) }}</em>
              </span>
            </button>
          </div>
        </section>

        <section class="paper-card metric-block">
          <div class="metric-block__head">
            <p class="metric-block__eyebrow">当前类型</p>
            <h3 class="metric-block__title">{{ activeType }}画像</h3>
          </div>

          <div class="metric-grid">
            <article v-for="metric in overviewMetrics" :key="metric.label" class="metric-item">
              <span class="metric-item__label">{{ metric.label }}</span>
              <strong class="metric-item__value">{{ metric.value }}</strong>
            </article>
          </div>
        </section>
      </aside>

      <main class="dashboard-main">
        <header class="paper-card dashboard-status">
          <div class="dashboard-status__heading">
            <p class="dashboard-status__eyebrow">graph_4 集成版</p>
            <h1>{{ activeType }}图谱矩阵</h1>
            <p>{{ activeTypeConfig.description }}</p>
          </div>

          <div class="dashboard-status__group">
            <span v-for="tag in statusTags" :key="tag" class="dashboard-status__tag">
              {{ tag }}
            </span>
          </div>
        </header>

        <section class="chart-grid">
          <article class="paper-card dashboard-panel dashboard-panel--frameless">
            <div class="dashboard-panel__head">
              <div>
                <h3>朝代-功能-材料玫瑰图</h3>
                <p>保留三层玫瑰环结构，压缩半径与标签字号以适配 2x2 区域。</p>
              </div>
              <div class="dashboard-panel__meta">{{ rosePanelMeta }}</div>
            </div>
            <div :ref="chartRefs.rose" class="dashboard-panel__chart"></div>
          </article>

          <article class="paper-card dashboard-panel dashboard-panel--frameless">
            <div class="dashboard-panel__head">
              <div>
                <h3>术语词云</h3>
                <p>沿用词权重排序，但重新计算尺寸映射，避免面板内溢出。</p>
              </div>
              <div class="dashboard-panel__meta">{{ wordCloudPanelMeta }}</div>
            </div>
            <div :ref="chartRefs.cloud" class="dashboard-panel__chart"></div>
          </article>

          <article class="paper-card dashboard-panel dashboard-panel--frameless">
            <div class="dashboard-panel__head">
              <div>
                <h3>朝代-结构-材料桑基图</h3>
                <p>保留三层语义流向，缩窄节点宽度与间距，让关系图稳妥塞进格子。</p>
              </div>
              <div class="dashboard-panel__meta">{{ sankeyPanelMeta }}</div>
            </div>
            <div :ref="chartRefs.sankey" class="dashboard-panel__chart"></div>
          </article>

          <article class="paper-card dashboard-panel dashboard-panel--frameless">
            <div class="dashboard-panel__head">
              <div>
                <h3>朝代-地区-结构旭日图</h3>
                <p>缩小外圈标签与半径层级，保留整体层次关系和悬浮说明。</p>
              </div>
              <div class="dashboard-panel__meta">{{ sunburstPanelMeta }}</div>
            </div>
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
import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
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
    description: '聚焦居住、宗族与防御空间在不同时代中的层次分布。',
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

const typeConfigMap = Object.fromEntries(buildingTypes.map((item) => [item.label, item])) as Record<BuildingType, TypeConfig>;

const roseRingPalettes = {
  dynasty: ['#b65e48', '#c97858', '#d6a16f', '#b58347', '#8b6b57', '#c7b08a'],
  function: ['#4b765f', '#68866f', '#8da16a', '#7c9468', '#5a8c7f', '#93a08d', '#547062'],
  material: ['#7a6c92', '#9274a3', '#6d88a2', '#5d7a95', '#8d94a6', '#b39478', '#7f8b9b'],
} as const;

const sankeyDepthColors = {
  0: ['#b65f49', '#cc7e63', '#d7ab82', '#a46a53', '#8b5d48', '#c99870'],
  1: ['#8f8f76', '#7c8e74', '#78866f', '#8e7f6d', '#93a08d', '#6d8667'],
  2: ['#6a879d', '#7da2b5', '#5d7b91', '#8fa7b3', '#50718a', '#6e93ad'],
} as const;

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

const activeTypeConfig = computed(() => typeConfigMap[activeType.value]);
const activeRoseGraph = computed(() => dashboardGraphs.value?.rose[activeType.value] ?? null);
const activeSankeyGraph = computed(() => dashboardGraphs.value?.sankey[activeType.value] ?? null);
const activeSunburstGraph = computed(() => dashboardGraphs.value?.sunburst[activeType.value] ?? null);
const activeWordCloud = computed(() => dashboardGraphs.value?.wordCloud[activeType.value] ?? null);

const getLeadingItem = (items: Array<{ name: string; value: number }> | undefined | null) => {
  if (!items || items.length === 0) return null;
  return [...items].sort((left, right) => right.value - left.value)[0];
};

const countSunburstLeaves = (nodes: SunburstNode[]) =>
  nodes.reduce((sum, node) => sum + (node.children && node.children.length > 0 ? countSunburstLeaves(node.children) : 1), 0);

const overviewMetrics = computed(() => {
  const rose = activeRoseGraph.value;
  const sankey = activeSankeyGraph.value;
  const cloud = activeWordCloud.value;
  const sunburst = activeSunburstGraph.value;
  return [
    { label: '建筑样本', value: rose ? `${rose.summary.building_count}` : '--' },
    { label: '词云词数', value: cloud ? `${Math.min(cloud.length, 80)}` : '--' },
    { label: '桑基节点', value: sankey ? `${sankey.nodes.length}` : '--' },
    { label: '旭日叶路径', value: sunburst ? `${countSunburstLeaves(sunburst.data)}` : '--' },
  ];
});

const statusTags = computed(() => {
  const rose = activeRoseGraph.value;
  const sankey = activeSankeyGraph.value;
  const sunburst = activeSunburstGraph.value;
  const cloud = activeWordCloud.value;
  return [
    `${activeType.value}总览`,
    rose ? `${rose.summary.building_count} 处建筑` : '等待数据',
    cloud ? `${Math.min(cloud.length, 80)} 个高频词` : '词云待载入',
    sankey ? `${sankey.links.length} 条关系连线` : '桑基待载入',
    sunburst ? `${countSunburstLeaves(sunburst.data)} 条层级路径` : '旭日待载入',
  ];
});

const highlightMetrics = computed(() => {
  const rose = activeRoseGraph.value;
  return [
    {
      label: '主导朝代',
      value: getLeadingItem(rose?.rings.dynasty)?.name ?? '暂无',
    },
    {
      label: '主导功能',
      value: getLeadingItem(rose?.rings.function)?.name ?? '暂无',
    },
    {
      label: '主导材料',
      value: getLeadingItem(rose?.rings.material)?.name ?? '暂无',
    },
  ];
});

const highlightWords = computed(() => (activeWordCloud.value ?? []).slice(0, 8).map((item) => ({ name: item.name, count: item.term_count })));

const rosePanelMeta = computed(() => {
  const graph = activeRoseGraph.value;
  if (isLoading.value) return '正在载入';
  if (!graph) return '暂无数据';
  return `${graph.summary.building_count} 处 · ${graph.summary.rose_dynasty_count}/${graph.summary.rose_function_count}/${graph.summary.rose_material_count} 层`;
});

const wordCloudPanelMeta = computed(() => {
  if (isLoading.value) return '正在载入';
  const words = activeWordCloud.value;
  return words ? `${Math.min(words.length, 80)} 个高频词` : '暂无数据';
});

const sankeyPanelMeta = computed(() => {
  if (isLoading.value) return '正在载入';
  const graph = activeSankeyGraph.value;
  return graph ? `${graph.nodes.length} 节点 · ${graph.links.length} 连线` : '暂无数据';
});

const sunburstPanelMeta = computed(() => {
  if (isLoading.value) return '正在载入';
  const graph = activeSunburstGraph.value;
  return graph ? `${graph.data.length} 个朝代分支 · ${countSunburstLeaves(graph.data)} 条路径` : '暂无数据';
});

const formatTypeCount = (type: BuildingType) => {
  const count = dashboardGraphs.value?.rose[type]?.summary.building_count;
  return count === undefined ? '载入中' : `${count}处`;
};

const fetchGraphJson = async <T,>(fileName: string): Promise<T> => {
  const response = await fetch(`${import.meta.env.BASE_URL}building-dashboard-graph4/${fileName}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`无法读取 ${fileName}`);
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
    loadError.value = error instanceof Error ? error.message : '图表数据加载失败';
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
  center: ['50%', '55%'],
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
    setChartState('rose', '正在加载图表', '读取 graph_4 玫瑰图数据');
    return;
  }

  if (loadError.value) {
    setChartState('rose', '图表加载失败', loadError.value);
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
          `${params.seriesName}<br/>${params.name}<br/>数量：${params.value}<br/>占比：${(params.data.percent ?? 0).toFixed(1)}%`,
      },
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '41%',
          style: {
            text: `${activeType.value}\n${graph.summary.building_count} 处`,
            fill: '#5a3427',
            font: '600 18px ContentFont',
            textAlign: 'center',
            lineHeight: 24,
          },
        },
      ],
      series: [
        buildRoseSeries('主要朝代', ['8%', '24%'], dynastyData, false),
        buildRoseSeries('建筑功能', ['30%', '48%'], functionData, false),
        buildRoseSeries('建筑材料', ['55%', '74%'], materialData, true),
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
    setChartState('cloud', '正在加载图表', '读取 graph_4 词云数据');
    return;
  }

  if (loadError.value) {
    setChartState('cloud', '图表加载失败', loadError.value);
    return;
  }

  const words = activeWordCloud.value;
  const chart = chartInstances.get('cloud');
  if (!chart || !words || words.length === 0) {
    setChartState('cloud', '暂无图表数据', '当前类型没有可用词云');
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
        formatter: (params: any) =>
          `${params.data.name}<br/>词权重：${params.data.originalValue?.toFixed(2) ?? params.data.originalValue}<br/>出现次数：${params.data.term_count}<br/>覆盖维度：${params.data.dimensions.join('、')}`,
      },
      series: [
        {
          type: 'wordCloud',
          shape: 'circle',
          left: 'center',
          top: 'center',
          width: '86%',
          height: '110%',
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
  const depthIndex = { 0: 0, 1: 0, 2: 0 };

  return nodes.map((node) => {
    const depth = Number(node.depth || 0) as 0 | 1 | 2;
    const palette = sankeyDepthColors[depth] ?? sankeyDepthColors[2];
    const color = palette[depthIndex[depth] % palette.length];
    depthIndex[depth] += 1;

    return {
      ...node,
      itemStyle: {
        color,
        borderColor: 'rgba(80, 49, 34, 0.18)',
        borderWidth: 1,
      },
    };
  });
};

const renderSankeyChart = () => {
  if (isLoading.value) {
    setChartState('sankey', '正在加载图表', '读取 graph_4 桑基图数据');
    return;
  }

  if (loadError.value) {
    setChartState('sankey', '图表加载失败', loadError.value);
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
      animationDuration: 650,
      animationDurationUpdate: 420,
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        backgroundColor: 'rgba(247, 239, 228, 0.96)',
        borderColor: 'rgba(142, 92, 70, 0.2)',
        borderWidth: 1,
        textStyle: {
          color: '#3a271d',
          fontFamily: 'ContentFont',
          fontSize: 13,
        },
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return params.name;
          }
          return `${params.data.source} → ${params.data.target}<br/>数量：${params.data.value}`;
        },
      },
      series: [
        {
          type: 'sankey',
          left: '3%',
          top: '5%',
          right: '12%',
          bottom: '5%',
          draggable: false,
          emphasis: { focus: 'adjacency' },
          data: decorateSankeyNodes(graph.nodes),
          links: graph.links,
          lineStyle: { color: 'gradient', curveness: 0.52, opacity: 0.42 },
          nodeGap: activeType.value === '宫殿' ? 12 : 10,
          nodeWidth: 12,
          label: {
            color: '#2f241d',
            fontFamily: 'ContentFont',
            fontSize: 10,
            formatter: (params: { name: string }) => truncateLabel(params.name, 8),
          },
          levels: [
            { depth: 0, itemStyle: { borderRadius: 5 }, lineStyle: { opacity: 0.3 } },
            { depth: 1, itemStyle: { borderRadius: 6 }, lineStyle: { opacity: 0.34 } },
            { depth: 2, itemStyle: { borderRadius: 7 }, lineStyle: { opacity: 0.38 } },
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
    setChartState('sunburst', '正在加载图表', '读取 graph_4 旭日图数据');
    return;
  }

  if (loadError.value) {
    setChartState('sunburst', '图表加载失败', loadError.value);
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
          const path = params.treePathInfo.slice(1).map((item: { name: string }) => item.name).join(' · ');
          return `${path}<br/>数量：${params.value}`;
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

const handleResize = () => {
  if (resizeFrame) {
    window.cancelAnimationFrame(resizeFrame);
  }

  resizeFrame = window.requestAnimationFrame(() => {
    chartInstances.forEach((chart) => chart.resize());
    renderWordCloudChart();
    resizeFrame = 0;
  });
};

watch(activeType, () => {
  renderAllCharts();
});

onMounted(async () => {
  initCharts();
  renderAllCharts();
  window.addEventListener('resize', handleResize);
  await loadDashboardGraphs();
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
    linear-gradient(180deg, rgba(243, 235, 221, 0.98), rgba(232, 222, 206, 0.98)),
    linear-gradient(90deg, rgba(255, 255, 255, 0.18), transparent 28%, transparent 72%, rgba(255, 255, 255, 0.12));
}

.building-dashboard-screen__wash,
.building-dashboard-screen__grain,
.building-dashboard-screen__motif {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.building-dashboard-screen__wash {
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.34), transparent 18%),
    radial-gradient(circle at 82% 18%, rgba(255, 255, 255, 0.22), transparent 18%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
}

.building-dashboard-screen__grain {
  background: repeating-linear-gradient(135deg, rgba(124, 96, 76, 0.03) 0, rgba(124, 96, 76, 0.03) 1px, transparent 1px, transparent 16px);
  mix-blend-mode: multiply;
}

.building-dashboard-screen__motif {
  opacity: 0.18;
  background:
    radial-gradient(circle at 24% 74%, rgba(128, 96, 77, 0.1), transparent 18%),
    radial-gradient(circle at 74% 38%, rgba(128, 96, 77, 0.08), transparent 20%);
}

.dashboard-shell {
  position: relative;
  z-index: 10;
  height: 100vh;
  padding: 14px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(220px, 238px) minmax(0, 1fr) minmax(300px, 340px);
  gap: 12px;
}

.dashboard-side-panel {
  min-height: 0;
  display: grid;
  gap: 12px;
  align-content: start;
}

.dashboard-main {
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
}

.paper-card {
  border: 1px solid transparent;
  border-radius: 28px 22px 26px 18px;
  background:
    linear-gradient(180deg, rgba(248, 242, 233, 0.76), rgba(237, 228, 214, 0.58)),
    radial-gradient(circle at 10% 12%, rgba(255, 255, 255, 0.18), transparent 28%);
  box-shadow: 0 18px 36px rgba(72, 52, 40, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(10px);
}

.legend-block,
.metric-block,
.insight-block,
.note-block {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.legend-block__header,
.metric-block__head,
.insight-block__head,
.note-block__head {
  display: grid;
  gap: 4px;
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
  gap: 8px;
}

.type-card {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 22px 16px 20px 14px;
  background: linear-gradient(180deg, rgba(248, 242, 234, 0.78), rgba(245, 237, 227, 0.56));
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.26);
}

.type-card:hover {
  transform: translateX(2px);
  border-color: rgba(160, 74, 59, 0.22);
}

.type-card.active {
  border-color: rgba(160, 74, 59, 0.16);
  background: linear-gradient(180deg, rgba(246, 238, 228, 0.92), rgba(241, 231, 218, 0.72));
  box-shadow: 0 10px 22px rgba(125, 74, 53, 0.08), inset 0 0 0 1px rgba(160, 74, 59, 0.04);
}

.type-card__label {
  display: grid;
  gap: 2px;
}

.type-card__label strong {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 26px;
  line-height: 1;
  letter-spacing: 0.04em;
  color: #6d3026;
  font-weight: 400;
}

.type-card__label small {
  font-family: 'ContentFont', serif;
  font-size: 10px;
  line-height: 1.4;
  color: rgba(92, 70, 58, 0.62);
}

.type-card__meta {
  display: grid;
  justify-items: end;
  gap: 4px;
}

.type-card__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--type-color);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--type-color) 18%, transparent);
}

.type-card__meta em {
  font-family: 'ContentFont', serif;
  font-style: normal;
  font-size: 10px;
  color: rgba(83, 61, 49, 0.78);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  min-height: 0;
  background: linear-gradient(180deg, rgba(248, 242, 233, 0.62), rgba(238, 228, 214, 0.4));
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: 10px;
}

.dashboard-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 14px 10px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(248, 242, 233, 0.6), rgba(236, 225, 210, 0.36));
}

.dashboard-panel--frameless {
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  overflow: visible;
}

.dashboard-panel__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
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
  min-height: 0;
  margin-top: 8px;
  overflow: visible;
}

.dashboard-side-panel--right {
  min-height: 0;
  align-content: stretch;
  grid-template-rows: minmax(0, 1fr);
}

.dashboard-side-panel--right :deep(.art-timeline) {
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
    grid-template-columns: minmax(210px, 226px) minmax(0, 1fr) minmax(280px, 320px);
    gap: 10px;
    padding: 10px;
  }

  .dashboard-status {
    padding: 12px 14px;
  }

  .dashboard-status__heading h1 {
    font-size: 26px;
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

  .dashboard-status {
    flex-direction: column;
  }

  .dashboard-status__group {
    justify-content: flex-start;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .type-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .type-card__meta {
    justify-items: start;
    grid-auto-flow: column;
    align-items: center;
  }
}
</style>
