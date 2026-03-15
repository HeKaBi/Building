<template>
  <section class="building-dashboard-screen">
    <div class="building-dashboard-screen__wash"></div>
    <div class="building-dashboard-screen__grain"></div>
    <div class="building-dashboard-screen__motif"></div>
    <div class="dashboard-shell">
      <aside class="dashboard-side-panel dashboard-side-panel--left">
        <section class="paper-card legend-block legend-block--compact">
          <div class="legend-block__header">
            <p class="legend-block__eyebrow">第三部分</p>
            <h2 class="legend-block__title">时代筛选</h2>
          </div>
          <button type="button" class="legend-row legend-row--all" :class="{ active: activeDynasty === null }" @click="toggleDynasty(null)">
            <span class="legend-row__text">
              <strong class="legend-row__glyph">全部</strong>
              <small>{{ formatRange(buildings) }}</small>
            </span>
            <span class="legend-row__meta">
              <i class="legend-row__dot" style="--legend-color: #7f6a58"></i>
              <em>{{ buildings.length }}</em>
            </span>
          </button>
          <button
            v-for="row in dynastyFilterRows"
            :key="row.label"
            type="button"
            class="legend-row"
            :class="{ active: activeDynasty === row.label }"
            @click="toggleDynasty(row.label)"
          >
            <span class="legend-row__text">
              <strong class="legend-row__glyph">{{ row.label }}</strong>
              <small>{{ row.description }}</small>
            </span>
            <span class="legend-row__meta">
              <i class="legend-row__dot" :style="{ '--legend-color': row.color }"></i>
              <em>{{ row.count }}</em>
            </span>
          </button>
          <div class="legend-block__footer">
            <div class="legend-footnote">
              <span class="legend-footnote__label">时代跨度</span>
              <strong>{{ formatRange(timelineScopedBuildings) }}</strong>
            </div>
            <div class="legend-footnote">
              <span class="legend-footnote__label">地域覆盖</span>
              <strong>{{ new Set(timelineScopedBuildings.map((item) => item.province)).size }} 省</strong>
            </div>
            <div class="legend-footnote">
              <span class="legend-footnote__label">当前样本</span>
              <strong>{{ timelineScopedBuildings.length }} 处</strong>
            </div>
          </div>
          <button type="button" class="dashboard-reset" @click="resetFilters">重置筛选</button>
        </section>
      </aside>

      <main class="dashboard-main">
        <header class="paper-card dashboard-status">
          <div class="dashboard-status__group">
            <span class="dashboard-status__tag">时代：{{ activeDynasty ?? '全部' }}</span>
            <span class="dashboard-status__tag">时段：{{ activeRangeLabel }}</span>
          </div>
          <div class="dashboard-status__group">
            <span v-for="card in overviewCards" :key="card.label" class="dashboard-status__tag">
              {{ card.label }} {{ card.value }}
            </span>
          </div>
        </header>

        <section class="chart-grid">
          <article class="paper-card dashboard-panel dashboard-panel--frameless">
            <div class="dashboard-panel__head">
              <div>
                <h3>地域分布玫瑰图</h3>
              </div>
              <div class="dashboard-panel__meta">{{ rosePanelMeta }}</div>
            </div>
            <div :ref="chartRefs.rose" class="dashboard-panel__chart"></div>
          </article>
          <article class="paper-card dashboard-panel dashboard-panel--frameless">
            <div class="dashboard-panel__head">
              <div>
                <h3>建筑术语词云</h3>
              </div>
              <div class="dashboard-panel__meta">{{ wordCloudPanelMeta }}</div>
            </div>
            <div :ref="chartRefs.cloud" class="dashboard-panel__chart"></div>
          </article>
          <article class="paper-card dashboard-panel dashboard-panel--frameless">
            <div class="dashboard-panel__head">
              <div>
                <h3>类别 → 维度 → 术语桑基图</h3>
              </div>
              <div class="dashboard-panel__meta">{{ sankeyPanelMeta }}</div>
            </div>
            <div :ref="chartRefs.sankey" class="dashboard-panel__chart"></div>
          </article>
          <article class="paper-card dashboard-panel dashboard-panel--frameless">
            <div class="dashboard-panel__head">
              <div>
                <h3>朝代 · 类别 · 地域旭日图</h3>
              </div>
              <div class="dashboard-panel__meta">{{ sunburstPanelMeta }}</div>
            </div>
            <div :ref="chartRefs.sunburst" class="dashboard-panel__chart"></div>
          </article>
        </section>
      </main>

      <aside class="dashboard-side-panel dashboard-side-panel--right">
        <BuildingFilterTimeline
          :buildings="timelineScopedBuildings"
          :active-range="activeYearRange"
          accent="#4f7462"
          @select-range="toggleYearRange"
        />
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
import BuildingFilterTimeline from '@/demo/building-dashboard/components/BuildingFilterTimeline.vue';
import type { DashboardBuilding, DashboardCategory, DashboardYearRange } from '@/demo/building-dashboard/types';
import rawBuildings from '../../building.json';
import termsLongRaw from '../../dataset/13_terms_long_exploded.jsonl?raw';

echarts.use([TooltipComponent, GraphicComponent, PieChart, SankeyChart, SunburstChart, CanvasRenderer, LabelLayout]);
const THEME_NAME = 'building-dashboard-vintage';
echarts.registerTheme(THEME_NAME, vintage);

const categoryOrder = ['民居', '官府', '宫殿', '桥梁'] as const;
type CategoryKey = (typeof categoryOrder)[number];
type ChartKey = 'rose' | 'cloud' | 'sankey' | 'sunburst';

interface TermRecord { line_no: number; name: string; building_type: DashboardCategory; start_dynasty: string; start_year: number; century: string; province: string; dimension: string; term: string; term_confidence: number; }
interface SankeyNode { name: string; depth: number; rawType: 'category' | 'dimension' | 'term'; displayName: string; itemStyle?: { color: string; opacity?: number }; }
interface SankeyLink { source: string; target: string; value: number; }
interface SunburstNode { name: string; value?: number; children?: SunburstNode[]; itemStyle?: { color?: string }; }

const rosePalette = ['#b67a4a', '#4b765f', '#a3473a', '#6f7f8f', '#c59b6d', '#7f5f4c', '#8b9c8d', '#c86c5b', '#8f7c69', '#5f6d79', '#d2ad86', '#67806c', '#b15e48', '#7d8da1'];
const wordCloudPalette = ['#b65e48', '#5d7761', '#c28744', '#886e5a', '#7b5f96', '#6688a3', '#9a4d3f', '#6a7f92'];
const categoryColorMap: Record<CategoryKey, string> = { 民居: '#b67a4a', 官府: '#4b765f', 宫殿: '#a3473a', 桥梁: '#6f7f8f' };
const preferredDimensionOrder = ['建筑结构体系', '建筑材料', '建筑功能', '营造技艺', '建筑空间布局'] as const;
const dynastyGroupConfig = [
  {
    label: '唐宋前',
    dynasties: ['东周', '东汉', '西晋', '东晋', '南北朝', '隋'] as const,
    color: '#8a5a44',
  },
  {
    label: '唐宋',
    dynasties: ['唐', '五代十国', '宋', '辽', '金'] as const,
    color: '#b67a4a',
  },
  {
    label: '元明',
    dynasties: ['元', '明'] as const,
    color: '#4b765f',
  },
  {
    label: '清',
    dynasties: ['清'] as const,
    color: '#6f7f8f',
  },
] as const;

const parseJsonl = <T,>(raw: string): T[] => raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line) as T);
const buildings = rawBuildings as DashboardBuilding[];
const termRecords = parseJsonl<TermRecord>(termsLongRaw);

const dimensionCounts = termRecords.reduce((map, item) => map.set(item.dimension, (map.get(item.dimension) ?? 0) + 1), new Map<string, number>());
const dimensionOrder = Array.from(new Set(termRecords.map((item) => item.dimension))).sort((left, right) => {
  const leftIndex = preferredDimensionOrder.indexOf(left as (typeof preferredDimensionOrder)[number]);
  const rightIndex = preferredDimensionOrder.indexOf(right as (typeof preferredDimensionOrder)[number]);
  if (leftIndex !== -1 && rightIndex !== -1) return leftIndex - rightIndex;
  if (leftIndex !== -1) return -1;
  if (rightIndex !== -1) return 1;
  return (dimensionCounts.get(right) ?? 0) - (dimensionCounts.get(left) ?? 0);
});
const dimensionColorMap = Object.fromEntries(dimensionOrder.map((dimension, index) => [dimension, rosePalette[(index + 2) % rosePalette.length]])) as Record<string, string>;
const dynastyYearMap = buildings.reduce((map, item) => { const current = map.get(item.dynasty); if (current === undefined || item.year < current) map.set(item.dynasty, item.year); return map; }, new Map<string, number>());
const dynastyOrder = Array.from(dynastyYearMap.entries()).sort((left, right) => left[1] - right[1]).map(([dynasty]) => dynasty);
const dynastyColorMap = Object.fromEntries(dynastyOrder.map((dynasty, index) => [dynasty, rosePalette[index % rosePalette.length]])) as Record<string, string>;
const dynastyToGroupMap = new Map(dynastyGroupConfig.flatMap((group) => group.dynasties.map((dynasty) => [dynasty, group.label] as const)));

const activeDynasty = ref<string | null>(null);
const activeYearRange = ref<DashboardYearRange | null>(null);
const isYearInRange = (year: number) => !activeYearRange.value || (year >= activeYearRange.value.start && year <= activeYearRange.value.end);
const matchesActiveDynastyGroup = (dynasty: string) => !activeDynasty.value || dynastyToGroupMap.get(dynasty) === activeDynasty.value;

const timelineScopedBuildings = computed(() => buildings.filter((item) => matchesActiveDynastyGroup(item.dynasty)));
const timelineScopedTermRecords = computed(() => termRecords.filter((item) => matchesActiveDynastyGroup(item.start_dynasty)));
const filteredBuildings = computed(() => timelineScopedBuildings.value.filter((item) => isYearInRange(item.year)));
const filteredTermRecords = computed(() => timelineScopedTermRecords.value.filter((item) => isYearInRange(item.start_year)));

const formatYear = (year: number) => (year < 0 ? `前${Math.abs(year)}` : `${year}`);
const formatRange = (items: Array<{ year: number }>) => { if (items.length === 0) return '暂无数据'; const years = items.map((item) => item.year); const min = Math.min(...years); const max = Math.max(...years); return min === max ? formatYear(min) : `${formatYear(min)} - ${formatYear(max)}`; };
const activeRangeLabel = computed(() => activeYearRange.value ? `${formatYear(activeYearRange.value.start)} - ${formatYear(activeYearRange.value.end)}` : '全部时段');
const dynastyFilterRows = computed(() => dynastyGroupConfig.map((group) => {
  const items = buildings.filter((item) => group.dynasties.includes(item.dynasty as never));
  return {
    label: group.label,
    count: items.length,
    color: group.color,
    description: group.dynasties.join(' · '),
  };
}));
const overviewCards = computed(() => [{ label: '样本', value: filteredBuildings.value.length }, { label: '省份', value: new Set(filteredBuildings.value.map((item) => item.province)).size }, { label: '术语', value: filteredTermRecords.value.length }, { label: '类别', value: new Set(filteredBuildings.value.map((item) => item.category)).size }]);

const provinceDistribution = computed(() => {
  const counts = filteredBuildings.value.reduce((map, item) => map.set(item.province, (map.get(item.province) ?? 0) + 1), new Map<string, number>());
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]).slice(0, 12).map(([province, count]) => ({ province, count, ratio: filteredBuildings.value.length ? count / filteredBuildings.value.length : 0 }));
});
const wordCloudWords = computed(() => {
  const grouped = filteredTermRecords.value.reduce((map, item) => { const bucket = map.get(item.term) ?? { value: 0, dimensions: new Set<string>() }; bucket.value += 1; bucket.dimensions.add(item.dimension); map.set(item.term, bucket); return map; }, new Map<string, { value: number; dimensions: Set<string> }>());
  return Array.from(grouped.entries()).map(([name, meta]) => ({ name, value: meta.value, dimensionLabel: Array.from(meta.dimensions).join('、') })).sort((left, right) => right.value - left.value).slice(0, 72);
});
const sankeyGraph = computed(() => {
  const grouped = filteredTermRecords.value.reduce((map, item) => map.set(`${item.dimension}::${item.term}`, (map.get(`${item.dimension}::${item.term}`) ?? 0) + 1), new Map<string, number>());
  const topTermsByDimension = new Map<string, Array<{ term: string; value: number }>>();
  for (const [key, value] of grouped.entries()) { const [dimension, term] = key.split('::'); const items = topTermsByDimension.get(dimension) ?? []; items.push({ term, value }); topTermsByDimension.set(dimension, items); }
  const keptTerms = new Set<string>();
  for (const [dimension, items] of topTermsByDimension.entries()) items.sort((left, right) => right.value - left.value).slice(0, 6).forEach((item) => keptTerms.add(`${dimension}::${item.term}`));
  const scopedRows = filteredTermRecords.value.filter((item) => keptTerms.has(`${item.dimension}::${item.term}`));
  const categoryDimensionLinks = new Map<string, number>(); const dimensionTermLinks = new Map<string, number>(); const nodes = new Map<string, SankeyNode>();
  for (const item of scopedRows) {
    const categoryName = item.building_type; const dimensionName = `dimension::${item.dimension}`; const termName = `term::${item.dimension}::${item.term}`;
    nodes.set(categoryName, { name: categoryName, depth: 0, rawType: 'category', displayName: categoryName, itemStyle: { color: categoryColorMap[item.building_type as CategoryKey] } });
    nodes.set(dimensionName, { name: dimensionName, depth: 1, rawType: 'dimension', displayName: item.dimension, itemStyle: { color: dimensionColorMap[item.dimension] ?? '#a68461', opacity: 0.95 } });
    nodes.set(termName, { name: termName, depth: 2, rawType: 'term', displayName: item.term, itemStyle: { color: '#ccb390', opacity: 0.92 } });
    categoryDimensionLinks.set(`${categoryName}::${dimensionName}`, (categoryDimensionLinks.get(`${categoryName}::${dimensionName}`) ?? 0) + 1);
    dimensionTermLinks.set(`${dimensionName}::${termName}`, (dimensionTermLinks.get(`${dimensionName}::${termName}`) ?? 0) + 1);
  }
  return { nodes, categoryDimensionLinks, dimensionTermLinks };
});
const sunburstData = computed<SunburstNode[]>(() => {
  if (filteredBuildings.value.length === 0) return [];
  if (activeDynasty.value) {
    const categoryMap = filteredBuildings.value.reduce((map, item) => { const provinceMap = map.get(item.category) ?? new Map<string, number>(); provinceMap.set(item.province, (provinceMap.get(item.province) ?? 0) + 1); map.set(item.category, provinceMap); return map; }, new Map<DashboardCategory, Map<string, number>>());
    return categoryOrder.filter((category) => categoryMap.has(category)).map((category) => { const provinceMap = categoryMap.get(category)!; const provinces = Array.from(provinceMap.entries()).sort((left, right) => right[1] - left[1]).slice(0, 8); return { name: category, value: provinces.reduce((sum, [, count]) => sum + count, 0), itemStyle: { color: categoryColorMap[category] }, children: provinces.map(([province, count], index) => ({ name: province, value: count, itemStyle: { color: rosePalette[(categoryOrder.indexOf(category) + index + 3) % rosePalette.length] } })) }; });
  }
  const dynastyMap = filteredBuildings.value.reduce((map, item) => { const categoryMap = map.get(item.dynasty) ?? new Map<DashboardCategory, Map<string, number>>(); const provinceMap = categoryMap.get(item.category) ?? new Map<string, number>(); provinceMap.set(item.province, (provinceMap.get(item.province) ?? 0) + 1); categoryMap.set(item.category, provinceMap); map.set(item.dynasty, categoryMap); return map; }, new Map<string, Map<DashboardCategory, Map<string, number>>>());
  return dynastyOrder.filter((dynasty) => dynastyMap.has(dynasty)).map((dynasty) => { const categoryMap = dynastyMap.get(dynasty)!; return { name: dynasty, value: Array.from(categoryMap.values()).reduce((sum, provinceMap) => sum + Array.from(provinceMap.values()).reduce((inner, count) => inner + count, 0), 0), itemStyle: { color: dynastyColorMap[dynasty] ?? '#b68b61' }, children: categoryOrder.filter((category) => categoryMap.has(category)).map((category) => { const provinceMap = categoryMap.get(category)!; const provinces = Array.from(provinceMap.entries()).sort((left, right) => right[1] - left[1]).slice(0, 6); return { name: category, value: provinces.reduce((sum, [, count]) => sum + count, 0), itemStyle: { color: categoryColorMap[category] }, children: provinces.map(([province, count], index) => ({ name: province, value: count, itemStyle: { color: rosePalette[(index + dynastyOrder.indexOf(dynasty) + 2) % rosePalette.length] } })) }; }) }; });
});

const rosePanelMeta = computed(() => provinceDistribution.value.length ? `Top ${provinceDistribution.value.length} 省份` : '暂无地域样本');
const wordCloudPanelMeta = computed(() => wordCloudWords.value.length ? `${wordCloudWords.value.length} 个高频词` : '暂无术语');
const sankeyPanelMeta = computed(() => sankeyGraph.value.nodes.size ? `${sankeyGraph.value.nodes.size} 个节点` : '暂无语义流');
const sunburstPanelMeta = computed(() => activeDynasty.value ? `${activeDynasty.value}下的类别与地域结构` : '时代-类别-省份层级');

const chartRefs: Record<ChartKey, Ref<HTMLDivElement | null>> = { rose: ref<HTMLDivElement | null>(null), cloud: ref<HTMLDivElement | null>(null), sankey: ref<HTMLDivElement | null>(null), sunburst: ref<HTMLDivElement | null>(null) };
const chartInstances = new Map<ChartKey, echarts.EChartsType>();
const buildEmptyGraphic = (title: string, note: string) => [{ type: 'group', left: 'center', top: 'middle', children: [{ type: 'text', style: { text: title, fill: '#6a4d3f', font: '600 20px ContentFont', textAlign: 'center' }, x: 0, y: -10 }, { type: 'text', style: { text: note, fill: 'rgba(92, 70, 58, 0.72)', font: '12px ContentFont', textAlign: 'center' }, x: 0, y: 18 }] }];

const renderRoseChart = () => {
  const chart = chartInstances.get('rose'); if (!chart) return;
  if (provinceDistribution.value.length === 0) { chart.setOption({ tooltip: { show: false }, series: [], graphic: buildEmptyGraphic('当前筛选没有地域样本', '请切换朝代或放宽时间范围') }, { notMerge: true }); return; }
  chart.setOption({ animationDuration: 450, tooltip: { trigger: 'item', backgroundColor: 'rgba(248, 242, 232, 0.96)', borderColor: 'rgba(151, 117, 93, 0.22)', borderWidth: 1, textStyle: { color: '#4f3b2f', fontFamily: 'ContentFont', fontSize: 13 }, formatter: (params: any) => `${params.name}<br/>建筑数量：${params.value}<br/>占当前样本：${(params.data.ratio * 100).toFixed(1)}%` }, graphic: [{ type: 'text', left: 'center', top: '42%', style: { text: `${activeDynasty.value ?? '全部时代'}\n${filteredBuildings.value.length} 处`, fill: '#5a3427', font: '600 20px ContentFont', textAlign: 'center', lineHeight: 28 } }], series: [{ type: 'pie', roseType: 'radius', radius: ['18%', '78%'], center: ['50%', '56%'], minAngle: 8, itemStyle: { borderRadius: 8, borderColor: 'rgba(255,255,255,0.9)', borderWidth: 1.5 }, label: { color: '#5c4034', fontFamily: 'ContentFont', fontSize: 11, formatter: '{b}' }, labelLine: { length: 8, length2: 6, lineStyle: { color: 'rgba(113, 84, 64, 0.5)' } }, emphasis: { scale: true, scaleSize: 8 }, data: provinceDistribution.value.map((item, index) => ({ name: item.province, value: item.count, ratio: item.ratio, itemStyle: { color: rosePalette[index % rosePalette.length] } })) }] }, { notMerge: true });
};
const renderWordCloudChart = () => {
  const chart = chartInstances.get('cloud'); if (!chart) return;
  if (wordCloudWords.value.length === 0) { chart.setOption({ tooltip: { show: false }, series: [], graphic: buildEmptyGraphic('当前筛选没有术语记录', '请切换朝代或回到全部时段') }, { notMerge: true }); return; }
  chart.setOption({ animationDuration: 500, tooltip: { show: true, backgroundColor: 'rgba(248, 242, 232, 0.96)', borderColor: 'rgba(151, 117, 93, 0.22)', borderWidth: 1, textStyle: { color: '#4f3b2f', fontFamily: 'ContentFont', fontSize: 13 }, formatter: (params: any) => `${params.data.name}<br/>记录频次：${params.data.value}<br/>维度：${params.data.dimensionLabel}` }, series: [{ type: 'wordCloud', shape: 'circle', left: 'center', top: 'center', width: '96%', height: '96%', sizeRange: [14, 52], rotationRange: [0, 0], gridSize: 6, drawOutOfBound: false, textStyle: { fontFamily: 'ContentFont', fontWeight: 'bold' }, emphasis: { textStyle: { shadowBlur: 14, shadowColor: 'rgba(92, 67, 55, 0.35)' } }, data: wordCloudWords.value.map((item, index) => ({ ...item, textStyle: { color: wordCloudPalette[index % wordCloudPalette.length] } })) }] }, { notMerge: true });
};
const renderSankeyChart = () => {
  const chart = chartInstances.get('sankey'); if (!chart) return;
  if (sankeyGraph.value.nodes.size === 0 || sankeyGraph.value.categoryDimensionLinks.size === 0) { chart.setOption({ tooltip: { show: false }, series: [], graphic: buildEmptyGraphic('当前筛选没有可用语义流', '可以尝试切回全部时段查看整体关系') }, { notMerge: true }); return; }
  const nodes = Array.from(sankeyGraph.value.nodes.values()).sort((left, right) => { if (left.depth !== right.depth) return left.depth - right.depth; if (left.rawType === 'category' && right.rawType === 'category') return categoryOrder.indexOf(left.displayName as CategoryKey) - categoryOrder.indexOf(right.displayName as CategoryKey); if (left.rawType === 'dimension' && right.rawType === 'dimension') return dimensionOrder.indexOf(left.displayName) - dimensionOrder.indexOf(right.displayName); return left.displayName.localeCompare(right.displayName, 'zh-Hans-CN'); });
  const links: SankeyLink[] = [...Array.from(sankeyGraph.value.categoryDimensionLinks.entries()).map(([key, value]) => { const [source, target] = key.split('::dimension::'); return { source, target: `dimension::${target}`, value }; }), ...Array.from(sankeyGraph.value.dimensionTermLinks.entries()).map(([key, value]) => { const [sourceDimension, targetSuffix] = key.split('::term::'); return { source: sourceDimension, target: `term::${targetSuffix}`, value }; })];
  const nodeLookup = new Map(nodes.map((node) => [node.name, node]));
  chart.setOption({ animationDuration: 450, tooltip: { trigger: 'item', triggerOn: 'mousemove', backgroundColor: 'rgba(248, 242, 232, 0.98)', borderColor: 'rgba(151, 117, 93, 0.22)', borderWidth: 1, textStyle: { color: '#4f3b2f', fontFamily: 'ContentFont', fontSize: 13 }, formatter: (params: any) => params.dataType === 'node' ? `${params.data.displayName}` : `${nodeLookup.get(params.data.source)?.displayName ?? params.data.source} → ${nodeLookup.get(params.data.target)?.displayName ?? params.data.target}<br/>术语记录：${params.data.value}` }, series: [{ type: 'sankey', left: 10, right: 12, top: 14, bottom: 14, nodeGap: 14, nodeWidth: 14, draggable: false, emphasis: { focus: 'adjacency' }, lineStyle: { color: 'source', curveness: 0.52, opacity: 0.25 }, label: { color: '#52392c', fontFamily: 'ContentFont', fontSize: 11, formatter: (params: any) => params.data.displayName }, data: nodes, links, levels: [{ depth: 0, itemStyle: { borderRadius: 6, borderColor: 'rgba(255,255,255,0.72)', borderWidth: 1 } }, { depth: 1, itemStyle: { borderRadius: 6, borderColor: 'rgba(255,255,255,0.72)', borderWidth: 1 } }, { depth: 2, itemStyle: { borderRadius: 6, borderColor: 'rgba(255,255,255,0.72)', borderWidth: 1 } }] }] }, { notMerge: true });
};
const renderSunburstChart = () => {
  const chart = chartInstances.get('sunburst'); if (!chart) return;
  if (sunburstData.value.length === 0) { chart.setOption({ tooltip: { show: false }, series: [], graphic: buildEmptyGraphic('当前筛选没有层级结构', '请切换朝代或放宽时间范围') }, { notMerge: true }); return; }
  chart.setOption({ animationDuration: 450, tooltip: { trigger: 'item', backgroundColor: 'rgba(248, 242, 232, 0.98)', borderColor: 'rgba(151, 117, 93, 0.22)', borderWidth: 1, textStyle: { color: '#4f3b2f', fontFamily: 'ContentFont', fontSize: 13 }, formatter: (params: any) => `${params.treePathInfo.slice(1).map((item: { name: string }) => item.name).join(' · ')}<br/>建筑数量：${params.value}` }, series: [{ type: 'sunburst', radius: ['10%', '76%'], center: ['50%', '51%'], sort: null, emphasis: { focus: 'ancestor' }, nodeClick: false, itemStyle: { borderColor: 'rgba(255,255,255,0.78)', borderWidth: 1 }, label: { color: '#52392c', fontFamily: 'ContentFont', rotate: 'radial', minAngle: 6 }, data: sunburstData.value, levels: [{}, { r0: '10%', r: activeDynasty.value ? '42%' : '30%', label: { rotate: 0, fontSize: 11 } }, { r0: activeDynasty.value ? '42%' : '30%', r: activeDynasty.value ? '76%' : '54%', label: { fontSize: 10 } }, { r0: '54%', r: '76%', label: { fontSize: 9 } }] }] }, { notMerge: true });
};
const renderAllCharts = () => { renderRoseChart(); renderWordCloudChart(); renderSankeyChart(); renderSunburstChart(); };
const handleResize = () => chartInstances.forEach((chart) => chart.resize());
const initCharts = () => { (Object.keys(chartRefs) as ChartKey[]).forEach((key) => { const element = chartRefs[key].value; if (!element) return; chartInstances.set(key, echarts.init(element, THEME_NAME)); }); renderAllCharts(); };
const toggleDynasty = (dynasty: string | null) => { activeDynasty.value = activeDynasty.value === dynasty ? null : dynasty; };
const toggleYearRange = (range: DashboardYearRange | null) => { activeYearRange.value = range; };
const resetFilters = () => { activeDynasty.value = null; activeYearRange.value = null; };

watch(timelineScopedBuildings, (items) => {
  if (!activeYearRange.value) return;
  const hasMatch = items.some((item) => item.year >= activeYearRange.value!.start && item.year <= activeYearRange.value!.end);
  if (!hasMatch) activeYearRange.value = null;
}, { immediate: true });
watch([activeDynasty, activeYearRange], () => renderAllCharts());

onMounted(() => { initCharts(); window.addEventListener('resize', handleResize); });
onBeforeUnmount(() => { window.removeEventListener('resize', handleResize); chartInstances.forEach((chart) => chart.dispose()); chartInstances.clear(); });
</script>

<style scoped lang="scss">
.building-dashboard-screen { position: fixed; inset: 0; overflow: hidden; background: linear-gradient(180deg, rgba(243, 235, 221, 0.98), rgba(232, 222, 206, 0.98)), linear-gradient(90deg, rgba(255, 255, 255, 0.18), transparent 28%, transparent 72%, rgba(255, 255, 255, 0.12)); }
.building-dashboard-screen__wash, .building-dashboard-screen__grain, .building-dashboard-screen__motif { position: absolute; inset: 0; pointer-events: none; }
.building-dashboard-screen__wash { background: radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.34), transparent 18%), radial-gradient(circle at 82% 18%, rgba(255, 255, 255, 0.22), transparent 18%), linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)); }
.building-dashboard-screen__grain { background: repeating-linear-gradient(135deg, rgba(124, 96, 76, 0.03) 0, rgba(124, 96, 76, 0.03) 1px, transparent 1px, transparent 16px); mix-blend-mode: multiply; }
.building-dashboard-screen__motif { opacity: 0.18; background: radial-gradient(circle at 24% 74%, rgba(128, 96, 77, 0.1), transparent 18%), radial-gradient(circle at 74% 38%, rgba(128, 96, 77, 0.08), transparent 20%); }

.dashboard-shell { position: relative; z-index: 10; height: 100vh; padding: 14px; box-sizing: border-box; display: grid; grid-template-columns: minmax(232px, 260px) minmax(0, 1fr) minmax(260px, 292px); gap: 12px; }
.dashboard-side-panel { min-height: 0; display: grid; gap: 14px; }
.dashboard-main { min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 10px; }
.paper-card { border: 1px solid transparent; border-radius: 28px 22px 26px 18px; background: linear-gradient(180deg, rgba(248, 242, 233, 0.76), rgba(237, 228, 214, 0.58)), radial-gradient(circle at 10% 12%, rgba(255, 255, 255, 0.18), transparent 28%); box-shadow: 0 18px 36px rgba(72, 52, 40, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.22); backdrop-filter: blur(10px); }

.legend-block { display: grid; gap: 8px; }
.legend-block__eyebrow { margin: 0; font-family: 'ContentFont', serif; font-size: 10px; letter-spacing: 0.18em; color: rgba(109, 81, 66, 0.68); text-transform: uppercase; }
.legend-block__header { display: grid; gap: 2px; }
.legend-block__title, .dashboard-panel__head h3 { margin: 0; font-family: 'ChartTitleFont', 'TitleFont', serif; color: #7c3125; line-height: 1.08; }
.legend-block__title { font-size: 22px; }
.dashboard-panel__head h3 { font-size: 20px; margin-bottom: 2px; }
.dashboard-panel__head p { margin: 0; font-family: 'ContentFont', serif; font-size: 11px; line-height: 1.45; color: rgba(88, 66, 54, 0.76); max-width: 30ch; }
.dashboard-panel__meta, .dashboard-status__tag { display: inline-flex; align-items: center; padding: 4px 8px 3px; border: 1px solid rgba(147, 116, 93, 0.16); background: rgba(249, 244, 236, 0.82); font-family: 'ContentFont', serif; font-size: 11px; color: rgba(83, 61, 49, 0.78); }

.legend-block { padding: 12px; min-height: 0; }
.legend-block--compact { align-content: stretch; height: 100%; overflow: hidden; grid-template-rows: auto repeat(5, minmax(0, 1fr)) auto auto; }
.legend-row { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 9px 12px; border: 1px solid transparent; border-radius: 22px 16px 20px 14px; background: linear-gradient(180deg, rgba(248, 242, 234, 0.78), rgba(245, 237, 227, 0.56)); text-align: left; cursor: pointer; transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.26); }
.legend-row:hover { transform: translateX(2px); border-color: rgba(160, 74, 59, 0.22); }
.legend-row.active { border-color: rgba(160, 74, 59, 0.16); background: linear-gradient(180deg, rgba(246, 238, 228, 0.92), rgba(241, 231, 218, 0.72)); box-shadow: 0 10px 22px rgba(125, 74, 53, 0.08), inset 0 0 0 1px rgba(160, 74, 59, 0.04); }
.legend-row__text { display: grid; gap: 2px; }
.legend-row__glyph { font-family: 'ChartTitleFont', 'TitleFont', serif; font-size: 26px; line-height: 1; letter-spacing: 0.04em; color: #6d3026; font-weight: 400; }
.legend-row--all .legend-row__glyph { font-size: 24px; }
.legend-row__text small, .legend-row__meta em { font-family: 'ContentFont', serif; }
.legend-row__text small { font-size: 10px; line-height: 1.35; color: rgba(92, 70, 58, 0.62); letter-spacing: 0.03em; }
.legend-row__meta { display: grid; justify-items: end; gap: 4px; }
.legend-row__dot { width: 10px; height: 10px; border-radius: 999px; background: var(--legend-color); box-shadow: 0 0 0 4px color-mix(in srgb, var(--legend-color) 18%, transparent); }
.legend-row__meta em { font-style: normal; font-size: 10px; color: rgba(83, 61, 49, 0.78); }
.legend-block__footer { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 8px 2px 4px; }
.legend-footnote { display: grid; gap: 4px; align-content: start; padding: 8px 10px; border-radius: 16px 12px 14px 10px; background: linear-gradient(180deg, rgba(246, 239, 229, 0.6), rgba(241, 232, 219, 0.38)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.18); }
.legend-footnote__label { font-family: 'ContentFont', serif; font-size: 9px; letter-spacing: 0.14em; color: rgba(112, 84, 68, 0.58); text-transform: uppercase; }
.legend-footnote strong { font-family: 'ChartTitleFont', 'TitleFont', serif; font-size: 16px; line-height: 1.08; color: #734031; font-weight: 400; }
.dashboard-reset { justify-self: stretch; margin-top: 4px; padding: 8px 12px 7px; border: 1px solid transparent; border-radius: 999px; background: linear-gradient(180deg, rgba(248, 242, 234, 0.84), rgba(243, 235, 226, 0.66)); font-family: 'ContentFont', serif; font-size: 12px; color: rgba(84, 62, 49, 0.82); cursor: pointer; transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; box-shadow: inset 0 1px 0 rgba(255,255,255,0.22); }
.dashboard-reset:hover { transform: translateY(-1px); border-color: rgba(160, 74, 59, 0.26); }

.dashboard-status { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; min-height: 0; background: linear-gradient(180deg, rgba(248, 242, 233, 0.62), rgba(238, 228, 214, 0.4)); }
.dashboard-status__group { display: flex; flex-wrap: wrap; gap: 8px; }

.chart-grid { min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); gap: 10px; }
.dashboard-panel { min-height: 0; display: flex; flex-direction: column; padding: 10px 12px 10px; overflow: hidden; background: linear-gradient(180deg, rgba(248, 242, 233, 0.6), rgba(236, 225, 210, 0.36)); }
.dashboard-panel--frameless { border: none; border-radius: 0; background: transparent; box-shadow: none; backdrop-filter: none; }
.dashboard-panel__head { display: flex; justify-content: space-between; gap: 10px; align-items: start; }
.dashboard-panel__chart { flex: 1; min-height: 0; margin-top: 6px; }
.dashboard-side-panel--right { min-height: 0; }
.dashboard-side-panel--right :deep(.dashboard-timeline) { height: 100%; }
.dashboard-side-panel--right :deep(.dashboard-timeline) { border: 1px solid transparent; border-radius: 30px 18px 28px 16px; background: linear-gradient(180deg, rgba(243, 235, 221, 0.72), rgba(232, 220, 201, 0.48)), radial-gradient(circle at 16% 14%, rgba(255, 255, 255, 0.24), transparent 28%), repeating-linear-gradient(135deg, rgba(129, 98, 77, 0.028) 0, rgba(129, 98, 77, 0.028) 1px, transparent 1px, transparent 16px); box-shadow: 0 18px 36px rgba(72, 52, 40, 0.05), inset 0 1px 0 rgba(255,255,255,0.22); }
.dashboard-side-panel--right :deep(.dashboard-timeline__focus) { border: 1px solid transparent; border-radius: 18px 12px 16px 10px; background: linear-gradient(180deg, rgba(247, 241, 231, 0.68), rgba(243, 236, 227, 0.44)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.22); }
.dashboard-side-panel--right :deep(.dashboard-timeline__clear) { border: 1px solid transparent; background: linear-gradient(180deg, rgba(248, 242, 234, 0.84), rgba(242, 234, 224, 0.62)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.22); }
.dashboard-side-panel--right :deep(.dashboard-timeline__seal) { border-color: rgba(163, 72, 58, 0.14); }

@media (max-width: 1380px) {
  .dashboard-shell { grid-template-columns: minmax(220px, 248px) minmax(0, 1fr) minmax(240px, 272px); gap: 10px; padding: 10px; }
  .dashboard-status { padding: 8px 10px; }
  .legend-block__footer { grid-template-columns: 1fr; gap: 6px; }
}

@media (max-width: 1100px) {
  .building-dashboard-screen { overflow: auto; }
  .dashboard-shell { height: auto; min-height: 100vh; grid-template-columns: 1fr; }
  .chart-grid { grid-template-columns: 1fr; }
  .dashboard-side-panel--right { min-height: 420px; }
}

@media (max-width: 720px) {
  .building-dashboard-screen { position: relative; inset: auto; min-height: 100vh; }
  .dashboard-shell { padding: 10px; }
  .dashboard-status { align-items: start; flex-direction: column; }
  .legend-row { grid-template-columns: minmax(0, 1fr); }
  .legend-row__meta { justify-items: start; grid-auto-flow: column; align-items: center; }
  .legend-block--compact { grid-template-rows: auto repeat(5, minmax(72px, auto)) auto auto; }
}
</style>
