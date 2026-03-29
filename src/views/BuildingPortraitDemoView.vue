<template>
  <section class="building-portrait-view">
    <div class="building-portrait-view__wash"></div>
    <div class="building-portrait-view__grain"></div>
    <div class="building-portrait-view__roof"></div>
    <span class="building-portrait-view__petal building-portrait-view__petal--a"></span>
    <span class="building-portrait-view__petal building-portrait-view__petal--b"></span>
    <span class="building-portrait-view__petal building-portrait-view__petal--c"></span>
    <span class="building-portrait-view__petal building-portrait-view__petal--d"></span>

    <div class="building-portrait-view__search-row">
      <div class="building-search">
        <input
          v-model.trim="searchText"
          class="building-search__input"
          type="text"
          placeholder="请输入建筑名称、类别或结构类型，例如：故宫、岳阳楼、拱桥"
          @keydown.enter="handleSearch"
        />
        <el-button circle type="warning" :icon="Search" class="building-search__button" @click="handleSearch" />
      </div>
    </div>

    <div class="building-portrait-view__body">
      <section class="building-portrait-view__left">
        <article class="profile-card">
          <div class="profile-card__media">
            <img :src="selectedCover" :alt="selectedBuilding.name" />
            <span class="profile-card__seal">{{ selectedBuilding.category }}</span>
          </div>

          <div class="profile-card__content">
            <div class="profile-card__name">{{ selectedBuilding.name }}</div>
            <div class="profile-card__meta-grid">
              <div v-for="field in profileFields" :key="field.label" class="profile-card__meta-item">
                <strong>{{ field.label }}：</strong>
                <span>{{ field.value }}</span>
              </div>
            </div>
            <div class="profile-card__desc">
              <strong>简介：</strong>
              <span>{{ selectedBuilding.description }}</span>
            </div>
          </div>
        </article>

        <div class="chart-grid">
          <article class="chart-card">
            <header class="chart-card__header">
              <h3>建筑要素占比图</h3>
              <span>{{ selectedBuilding.structureType }}</span>
            </header>
            <div ref="pieChartRef" class="chart-card__canvas"></div>
          </article>

          <article class="chart-card">
            <header class="chart-card__header">
              <h3>营造关键词云图</h3>
              <span>{{ wordCloudMeta }}</span>
            </header>
            <div ref="cloudChartRef" class="chart-card__canvas"></div>
          </article>

          <article class="chart-card">
            <header class="chart-card__header">
              <h3>建筑维标雷达图</h3>
              <span>{{ radarMeta }}</span>
            </header>
            <div ref="radarChartRef" class="chart-card__canvas"></div>
          </article>
        </div>
      </section>

      <section class="building-portrait-view__right">
        <div class="network-panel">
          <header class="network-panel__header">
            <div>
              <h2>{{ selectedBuilding.name }}的“关联图谱”</h2>
              <p>{{ networkSubtitle }}</p>
            </div>

            <div class="network-panel__legend">
              <span v-for="item in relationLegendItems" :key="item.key" class="network-panel__legend-item">
                <i :style="{ backgroundColor: item.color }"></i>
                {{ item.label }}
              </span>
            </div>
          </header>

          <div ref="graphChartRef" class="network-panel__canvas"></div>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts/core';
import 'echarts-wordcloud';
import { GraphChart, PieChart, RadarChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, type Ref, watch } from 'vue';

import vintage from '@/assets/theme/vintage.json';
import { buildingImageMap } from '@/demo/building-section-catalog/generatedImageMap';
import rawBuildings from '../../building.json';
import canonicalRawBuildings from '../../building-jittered.json';
import lineageManifestData from '../../public/building-lineage/lineage_manifest.json';
import lineageIndexData from '../../public/building-lineage/building_index.json';

echarts.use([TooltipComponent, LegendComponent, PieChart, RadarChart, GraphChart, CanvasRenderer, LabelLayout]);

const THEME_NAME = 'building-portrait-vintage';
echarts.registerTheme(THEME_NAME, vintage);

type BuildingCategory = '民居' | '官府' | '宫殿' | '桥梁';
type ChartKey = 'pie' | 'cloud' | 'radar' | 'graph';
type RelationKey = 'structure' | 'region' | 'dynasty' | 'category';

interface BuildingRecord {
  id: string;
  name: string;
  category: BuildingCategory;
  structureType: string;
  dynasty: string;
  year: number;
  eraLabel: string;
  province: string;
  city: string;
  coordinates: [number, number];
  level: string;
  importance: number;
  description: string;
}

interface RelationEntry {
  item: BuildingRecord;
  reasons: Set<RelationKey>;
  score: number;
  primaryRelation: RelationKey;
}

interface WeightedItem {
  name: string;
  value: number;
}

interface LineageIndexEntry {
  line_no: string;
  name: string;
  building_type: BuildingCategory;
  province: string;
  start_dynasty: string;
  lineage_id: string;
  lineage_name: string;
  graph_file: string;
}

interface LineageManifest {
  building_count?: number;
  lineage_count?: number;
  parameters?: {
    mutual_k?: number;
    min_weight?: number;
    resolution?: number;
  };
}

interface LineageGraphNode {
  id: string;
  line_no: string;
  name: string;
  building_type: BuildingCategory;
  province: string;
  start_dynasty: string;
  century_num?: number;
  role?: 'center' | 'bridge' | 'member';
  hop: number;
  score: number;
  shared_features?: string[];
}

interface LineageGraphEdge {
  source: string;
  target: string;
  weight: number;
  reasons?: string[];
  primary?: boolean;
}

interface LineageGraph {
  center_building?: {
    line_no: string;
    name: string;
    building_type: BuildingCategory;
    start_dynasty: string;
    century_num?: number;
    province: string;
  };
  lineage_id: string;
  lineage_name: string;
  building_type: BuildingCategory;
  signature_summary?: string;
  community_member_count: number;
  nodes: LineageGraphNode[];
  edges: LineageGraphEdge[];
}

const buildings = rawBuildings as BuildingRecord[];
const canonicalBuildings = canonicalRawBuildings as BuildingRecord[];
const canonicalBuildingMap = new Map(canonicalBuildings.map((item) => [item.id, item] as const));
const buildingMap = new Map(buildings.map((item) => [item.id, item] as const));

const pieChartRef = ref<HTMLDivElement | null>(null);
const cloudChartRef = ref<HTMLDivElement | null>(null);
const radarChartRef = ref<HTMLDivElement | null>(null);
const graphChartRef = ref<HTMLDivElement | null>(null);

const chartRefs: Record<ChartKey, Ref<HTMLDivElement | null>> = {
  pie: pieChartRef,
  cloud: cloudChartRef,
  radar: radarChartRef,
  graph: graphChartRef,
};

const chartInstances = new Map<ChartKey, echarts.EChartsType>();
const lineageGraphCache = new Map<string, LineageGraph>();
const lineageGraphModules = import.meta.glob('../../public/building-lineage/topk_graphs/*.json');
const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const searchText = ref('故宫');
const lineageManifest = ref<LineageManifest | null>(null);
const lineageIndex = ref<LineageIndexEntry[]>([]);
const activeLineageGraph = ref<LineageGraph | null>(null);
const lineageLoading = ref(false);

const defaultBuilding = (() => {
  const canonicalDefault =
    canonicalBuildings.find((item) => item.name === '故宫') ??
    canonicalBuildings.find((item) => item.name === '岳阳楼') ??
    canonicalBuildings[0];

  return buildingMap.get(canonicalDefault.id) ?? buildings[0];
})();

const selectedBuilding = ref<BuildingRecord>(defaultBuilding);

const coverModules = import.meta.glob('../assets/images/building-covers/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const coverAssets = Object.fromEntries(
  Object.entries(coverModules).map(([path, asset]) => [path.split('/').pop() ?? path, asset]),
) as Record<string, string>;

const chartPalette = ['#D78A7B', '#D5AE79', '#92A9A2', '#8BA5B7', '#8F7B68', '#C66F5B'];

const relationLegend = [
  { key: 'structure', label: '同结构', color: '#b56a54' },
  { key: 'region', label: '同地域', color: '#879b7d' },
  { key: 'dynasty', label: '同时代', color: '#7a94ab' },
  { key: 'category', label: '同类别', color: '#c49362' },
] as const satisfies ReadonlyArray<{ key: RelationKey; label: string; color: string }>;

const lineageLegend = [
  { key: 'center', label: '中心建筑', color: '#d87c7c' },
  { key: 'hop1', label: '一跳节点', color: '#919e8b' },
  { key: 'hop2', label: '二跳节点', color: '#d7ab82' },
  { key: 'bridge', label: '桥接节点', color: '#724e58' },
  { key: 'hop3', label: '外缘节点', color: '#6e7074' },
] as const;

const relationColorMap = Object.fromEntries(relationLegend.map((item) => [item.key, item.color])) as Record<RelationKey, string>;
const lineageRoleColorMap = Object.fromEntries(lineageLegend.map((item) => [item.key, item.color])) as Record<string, string>;

const featurePresets: Record<BuildingCategory, Array<{ label: string; base: number; keywords: string[] }>> = {
  民居: [
    { label: '院落', base: 34, keywords: ['宅', '院', '府第', '院落'] },
    { label: '聚落', base: 30, keywords: ['聚落', '村', '寨'] },
    { label: '宗族', base: 24, keywords: ['宗祠', '宗族', '会馆'] },
    { label: '防御', base: 22, keywords: ['围屋', '土楼', '碉楼', '堡'] },
    { label: '园居', base: 20, keywords: ['园', '草堂', '山居'] },
    { label: '木构', base: 18, keywords: ['木', '梁', '构'] },
  ],
  官府: [
    { label: '城防', base: 34, keywords: ['城墙', '城门', '防御', '重镇'] },
    { label: '楼阁', base: 28, keywords: ['楼', '阁', '钟', '鼓'] },
    { label: '政务', base: 24, keywords: ['衙', '署', '府', '堂'] },
    { label: '礼制', base: 22, keywords: ['礼', '朝', '门阙', '甬道'] },
    { label: '文教', base: 18, keywords: ['学', '考院', '书院'] },
    { label: '砖石', base: 16, keywords: ['砖', '石'] },
  ],
  宫殿: [
    { label: '礼制', base: 34, keywords: ['殿', '宫', '礼', '朝'] },
    { label: '宫城', base: 30, keywords: ['宫城', '城', '门', '阙'] },
    { label: '园林', base: 24, keywords: ['园', '苑', '山庄'] },
    { label: '台基', base: 20, keywords: ['台基', '基座'] },
    { label: '重檐', base: 18, keywords: ['重檐', '屋顶', '屋脊'] },
    { label: '皇家', base: 16, keywords: ['皇家', '王府', '行宫'] },
  ],
  桥梁: [
    { label: '拱券', base: 34, keywords: ['拱桥', '拱', '券'] },
    { label: '梁架', base: 28, keywords: ['梁桥', '梁', '栈道'] },
    { label: '廊亭', base: 24, keywords: ['廊桥', '风雨桥', '亭'] },
    { label: '交通', base: 22, keywords: ['桥', '渡', '通行'] },
    { label: '水工', base: 18, keywords: ['纤道', '堤闸', '水工'] },
    { label: '景观', base: 16, keywords: ['景', '江', '河', '湖'] },
  ],
};

const keywordCandidates = [
  '木构',
  '砖石',
  '斗拱',
  '台基',
  '重檐',
  '宫城',
  '宫殿',
  '王府',
  '园林',
  '山庄',
  '城防',
  '城墙',
  '城门',
  '楼阁',
  '衙署',
  '考院',
  '宅院',
  '聚落',
  '园居',
  '围屋',
  '土楼',
  '拱桥',
  '梁桥',
  '廊桥',
  '水工',
  '礼制',
  '防御',
  '交通',
  '景观',
  '皇家',
  '名楼',
  '世界遗产',
  '营造',
  '保护',
  '轴线',
  '门阙',
  '庭院',
  '木结构',
];

const structureCountMap = buildings.reduce<Record<string, number>>((accumulator, item) => {
  accumulator[item.structureType] = (accumulator[item.structureType] ?? 0) + 1;
  return accumulator;
}, {});

const provinceCategoryCountMap = buildings.reduce<Record<string, number>>((accumulator, item) => {
  const key = `${item.province}-${item.category}`;
  accumulator[key] = (accumulator[key] ?? 0) + 1;
  return accumulator;
}, {});

const maxStructureCount = Math.max(...Object.values(structureCountMap));

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const cleanProvince = (value: string) =>
  value
    .replace(/省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区/g, '')
    .trim();

const cleanCity = (value: string) => value.replace(/市|地区|自治州|自治县|盟/g, '').trim();

const resolveCanonicalBuilding = (building: BuildingRecord) => canonicalBuildingMap.get(building.id) ?? building;

const parseLineageLineNoFromBuildingId = (buildingId: string) => {
  const matched = /^building-(\d+)-/i.exec(buildingId);
  return matched?.[1] ?? null;
};

const normalizeLookupText = (value: string) =>
  value
    .replace(/\s+/g, '')
    .replace(/[·•・\-—()（）《》「」『』、，。,.：:]/g, '')
    .replace(/遗址|旧址|景区|风景名胜区|全国重点文物保护单位/g, '')
    .trim()
    .toLowerCase();

const buildLineageIndexScore = (entry: LineageIndexEntry, building: BuildingRecord) => {
  const canonicalBuilding = resolveCanonicalBuilding(building);
  const buildingName = normalizeLookupText(canonicalBuilding.name);
  const entryName = normalizeLookupText(entry.name);
  const buildingProvince = normalizeLookupText(cleanProvince(canonicalBuilding.province));
  const entryProvince = normalizeLookupText(cleanProvince(entry.province));
  const buildingDynasty = normalizeLookupText(canonicalBuilding.dynasty);
  const entryDynasty = normalizeLookupText(entry.start_dynasty);

  let score = 0;

  if (entryName === buildingName) score += 1200;
  if (entryName.includes(buildingName) || buildingName.includes(entryName)) score += 520 - Math.abs(entryName.length - buildingName.length) * 12;
  if (entry.building_type === canonicalBuilding.category) score += 180;
  if (entryProvince === buildingProvince) score += 80;
  if (entryProvince.includes(buildingProvince) || buildingProvince.includes(entryProvince)) score += 32;
  if (entryDynasty === buildingDynasty) score += 64;
  if (`${entry.lineage_name}|${entry.name}`.includes(canonicalBuilding.structureType)) score += 24;

  return score;
};

const resolveLineageIndexEntry = (building: BuildingRecord) => {
  if (lineageIndex.value.length === 0) return null;

  const directLineNo = parseLineageLineNoFromBuildingId(building.id);
  if (directLineNo) {
    const directEntry = lineageIndex.value.find((entry) => entry.line_no === directLineNo);
    if (directEntry) {
      const canonicalBuilding = resolveCanonicalBuilding(building);
      const sameName = normalizeLookupText(directEntry.name) === normalizeLookupText(canonicalBuilding.name);
      const sameType = directEntry.building_type === canonicalBuilding.category;
      if (sameName || sameType) {
        return directEntry;
      }
    }
  }

  const ranked = lineageIndex.value
    .map((entry) => ({ entry, score: buildLineageIndexScore(entry, building) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.name.length - right.entry.name.length);

  return ranked[0]?.entry ?? null;
};

const resolveBuildingFromLineageEntry = (entry: LineageIndexEntry) => {
  const targetName = normalizeLookupText(entry.name);
  const exactMatch = canonicalBuildings.find(
    (item) => item.category === entry.building_type && normalizeLookupText(item.name) === targetName,
  );

  if (exactMatch) return buildingMap.get(exactMatch.id) ?? exactMatch;
  return findBestMatch(entry.name);
};

const levelBonusMap: Record<string, number> = {
  国保: 18,
  省保: 12,
  市保: 8,
};

const resolvePublicImageUrl = (url?: string) => {
  if (!url) return '';

  const normalizedBase = import.meta.env.BASE_URL ?? '/';
  return `${normalizedBase}${url.replace(/^\/+/, '')}`;
};

const resolveCoverFile = (building: BuildingRecord) => {
  const structure = building.structureType;

  if (building.category === '民居') {
    if (structure.includes('围屋') || structure.includes('土楼') || structure.includes('碉楼')) return 'residence-group-fortified.png';
    if (structure.includes('聚落') || structure.includes('村寨')) return 'residence-group-settlement.png';
    if (structure.includes('园') || structure.includes('草堂')) return 'residence-group-garden.png';
    if (structure.includes('宅') || structure.includes('府第')) return 'residence-group-manor.png';
    return 'residence-cover.png';
  }

  if (building.category === '官府') {
    if (structure.includes('城墙') || structure.includes('城防')) return 'office-group-citywall.png';
    if (structure.includes('楼') || structure.includes('阁') || structure.includes('钟鼓')) return 'office-group-tower.png';
    if (structure.includes('衙') || structure.includes('考院') || structure.includes('学署')) return 'office-group-yamen.png';
    if (structure.includes('府') || structure.includes('会馆')) return 'office-group-mansion-hall.png';
    return 'office-cover.png';
  }

  if (building.category === '宫殿') {
    if (structure.includes('宫城')) return 'palace-group-palace-city.png';
    if (structure.includes('园') || structure.includes('山庄')) return 'palace-group-garden-resort.png';
    if (structure.includes('王府') || structure.includes('府')) return 'palace-group-mansion-garden.png';
    if (structure.includes('楼') || structure.includes('影壁')) return 'palace-group-tower-screen.png';
    return 'palace-cover.png';
  }

  if (structure.includes('拱')) return 'bridge-group-arch.png';
  if (structure.includes('梁') || structure.includes('栈道')) return 'bridge-group-beam.png';
  if (structure.includes('廊') || structure.includes('风雨桥')) return 'bridge-group-corridor.png';
  if (structure.includes('桥群') || structure.includes('综合')) return 'bridge-group-general.png';
  return 'bridge-cover.png';
};

const buildSearchScore = (building: BuildingRecord, keyword: string) => {
  if (!keyword) return 0;

  let score = 0;
  const text = `${building.name}|${building.category}|${building.structureType}|${building.dynasty}|${building.province}|${building.city}|${building.description}`;

  if (building.name === keyword) score += 1200;
  if (building.name.includes(keyword)) score += 720 - building.name.indexOf(keyword) * 8;
  if (building.category === keyword) score += 240;
  if (building.category.includes(keyword)) score += 180;
  if (building.structureType === keyword) score += 260;
  if (building.structureType.includes(keyword)) score += 200;
  if (building.city.includes(keyword)) score += 180;
  if (building.province.includes(keyword)) score += 160;
  if (building.dynasty.includes(keyword)) score += 130;
  if (building.description.includes(keyword)) score += 90;
  if (text.includes(keyword)) score += 24;

  return score + building.importance * 8;
};

const findBestMatch = (keyword: string) => {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) return null;

  const ranked = canonicalBuildings
    .map((item) => ({ item, score: buildSearchScore(item, trimmedKeyword) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.item.importance - left.item.importance || left.item.year - right.item.year);

  const matched = ranked[0]?.item ?? null;
  return matched ? (buildingMap.get(matched.id) ?? matched) : null;
};

const loadLineageGraph = async (lineNo: string) => {
  if (lineageGraphCache.has(lineNo)) {
    return lineageGraphCache.get(lineNo)!;
  }

  const importer = lineageGraphModules[`../../public/building-lineage/topk_graphs/${lineNo}.json`];
  if (!importer) {
    throw new Error(`未找到谱系子图文件：${lineNo}.json`);
  }

  const loaded = (await importer()) as { default?: LineageGraph } | LineageGraph;
  const graph = ('default' in loaded ? loaded.default : loaded) as LineageGraph;
  lineageGraphCache.set(lineNo, graph);
  return graph;
};

let lineageRequestId = 0;

const syncLineageGraph = async (building: BuildingRecord) => {
  const directLineNo = parseLineageLineNoFromBuildingId(building.id);
  const matchedEntry = lineageIndex.value.length > 0 ? resolveLineageIndexEntry(building) : null;
  const candidateLineNos = [directLineNo, matchedEntry?.line_no].filter(
    (value, index, array): value is string => Boolean(value) && array.indexOf(value) === index,
  );
  if (candidateLineNos.length === 0) {
    activeLineageGraph.value = null;
    return;
  }

  const requestId = ++lineageRequestId;
  lineageLoading.value = true;

  try {
    let loadedGraph: LineageGraph | null = null;

    for (const lineNo of candidateLineNos) {
      try {
        loadedGraph = await loadLineageGraph(lineNo);
        break;
      } catch (error) {
        console.error(`failed to load lineage graph ${lineNo}`, error);
      }
    }

    if (requestId !== lineageRequestId) return;
    activeLineageGraph.value = loadedGraph;
  } finally {
    if (requestId === lineageRequestId) {
      lineageLoading.value = false;
    }
  }
};

const loadLineageResources = async () => {
  try {
    lineageManifest.value = lineageManifestData as LineageManifest;
    lineageIndex.value = lineageIndexData as LineageIndexEntry[];
    await syncLineageGraph(selectedBuilding.value);
  } catch (error) {
    console.error('failed to initialize lineage resources', error);
    lineageManifest.value = null;
    lineageIndex.value = [];
    activeLineageGraph.value = null;
  }
};

const buildRelationPool = (target: BuildingRecord) => {
  const pool = new Map<string, RelationEntry>();

  const register = (item: BuildingRecord, reason: RelationKey, baseScore: number) => {
    if (item.id === target.id) return;

    const existing = pool.get(item.id);
    if (existing) {
      existing.reasons.add(reason);
      existing.score += baseScore;
      return;
    }

    pool.set(item.id, {
      item,
      reasons: new Set([reason]),
      score: baseScore,
      primaryRelation: reason,
    });
  };

  const chronologicalDistance = (item: BuildingRecord) => Math.abs(item.year - target.year);

  buildings
    .filter((item) => item.id !== target.id && item.structureType === target.structureType)
    .sort((left, right) => right.importance - left.importance || chronologicalDistance(left) - chronologicalDistance(right))
    .slice(0, 8)
    .forEach((item) => register(item, 'structure', 42));

  buildings
    .filter((item) => item.id !== target.id && item.province === target.province)
    .sort((left, right) => right.importance - left.importance || chronologicalDistance(left) - chronologicalDistance(right))
    .slice(0, 6)
    .forEach((item) => register(item, 'region', 34));

  buildings
    .filter((item) => item.id !== target.id && item.dynasty === target.dynasty)
    .sort((left, right) => right.importance - left.importance || chronologicalDistance(left) - chronologicalDistance(right))
    .slice(0, 6)
    .forEach((item) => register(item, 'dynasty', 28));

  buildings
    .filter((item) => item.id !== target.id && item.category === target.category)
    .sort((left, right) => right.importance - left.importance || chronologicalDistance(left) - chronologicalDistance(right))
    .slice(0, 8)
    .forEach((item) => register(item, 'category', 22));

  pool.forEach((entry) => {
    if (entry.item.category === target.category) entry.score += 8;
    if (entry.item.level === target.level) entry.score += 6;
    if (entry.item.city === target.city) entry.score += 10;
    entry.score += Math.max(0, 8 - chronologicalDistance(entry.item) / 250);

    entry.primaryRelation =
      (['structure', 'region', 'dynasty', 'category'] as RelationKey[]).find((key) => entry.reasons.has(key)) ?? 'category';
  });

  if (pool.size < 18) {
    buildings
      .filter((item) => item.id !== target.id)
      .map((item) => ({
        item,
        score:
          (item.category === target.category ? 12 : 0) +
          (item.structureType === target.structureType ? 22 : 0) +
          (item.province === target.province ? 16 : 0) +
          (item.dynasty === target.dynasty ? 14 : 0) +
          item.importance * 4 -
          Math.abs(item.year - target.year) / 180,
      }))
      .filter((item) => item.score > 16)
      .sort((left, right) => right.score - left.score || right.item.importance - left.item.importance)
      .slice(0, 10)
      .forEach(({ item, score }) => {
        if (!pool.has(item.id)) {
          pool.set(item.id, {
            item,
            reasons: new Set(['category']),
            score,
            primaryRelation: 'category',
          });
        }
      });
  }

  return [...pool.values()]
    .sort((left, right) => right.score - left.score || right.item.importance - left.item.importance || left.item.year - right.item.year)
    .slice(0, 22);
};

const relatedBuildings = computed(() => buildRelationPool(selectedBuilding.value));
const activeLineageEntry = computed(() => resolveLineageIndexEntry(selectedBuilding.value));
const relationLegendItems = computed(() => (activeLineageGraph.value ? lineageLegend : relationLegend));

const selectedCover = computed(
  () => resolvePublicImageUrl(buildingImageMap[selectedBuilding.value.id]) || coverAssets[resolveCoverFile(selectedBuilding.value)] || '',
);

const profileFields = computed(() => [
  { label: '类别', value: selectedBuilding.value.category },
  { label: '结构', value: selectedBuilding.value.structureType },
  { label: '朝代', value: selectedBuilding.value.dynasty },
  { label: '地点', value: `${cleanProvince(selectedBuilding.value.province)} · ${cleanCity(selectedBuilding.value.city)}` },
  { label: '年代', value: selectedBuilding.value.eraLabel },
  { label: '级别', value: selectedBuilding.value.level },
]);

const pieData = computed<WeightedItem[]>(() => {
  const building = selectedBuilding.value;
  const related = relatedBuildings.value.map((item) => item.item);
  const referenceText = `${building.name} ${building.structureType} ${building.description} ${building.eraLabel}`;

  return featurePresets[building.category]
    .map((feature) => {
      let score = feature.base + building.importance * 2;

      feature.keywords.forEach((keyword) => {
        if (referenceText.includes(keyword)) score += 14;
        score += related.filter((item) => `${item.structureType} ${item.description}`.includes(keyword)).length * 2;
      });

      return {
        name: feature.label,
        value: Math.max(8, Math.round(score)),
      };
    })
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
});

const addWeight = (map: Map<string, number>, name: string, value: number) => {
  const trimmed = name.trim();
  if (!trimmed) return;
  map.set(trimmed, (map.get(trimmed) ?? 0) + value);
};

const wordCloudData = computed<WeightedItem[]>(() => {
  const building = selectedBuilding.value;
  const weights = new Map<string, number>();
  const referenceText = `${building.name} ${building.structureType} ${building.description} ${building.eraLabel}`;

  addWeight(weights, building.name, 84);
  addWeight(weights, building.category, 72);
  addWeight(weights, building.structureType, 68);
  addWeight(weights, building.dynasty, 58);
  addWeight(weights, cleanProvince(building.province), 50);
  addWeight(weights, cleanCity(building.city), 42);
  addWeight(weights, building.level, 36);

  pieData.value.forEach((item, index) => {
    addWeight(weights, item.name, item.value + 12 - index * 2);
  });

  keywordCandidates.forEach((keyword) => {
    let score = 0;
    if (referenceText.includes(keyword)) score += 26;
    score += relatedBuildings.value.filter((item) => `${item.item.structureType} ${item.item.description}`.includes(keyword)).length * 4;
    if (score > 0) addWeight(weights, keyword, score);
  });

  relatedBuildings.value.slice(0, 12).forEach((entry) => {
    addWeight(weights, entry.item.structureType, 8 + entry.item.importance * 2);
    addWeight(weights, entry.item.dynasty, 5);
    addWeight(weights, cleanProvince(entry.item.province), 6);
  });

  return [...weights.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 40);
});

const radarIndicators = computed(() => [
  { name: '历史价值', max: 100 },
  { name: '结构辨识', max: 100 },
  { name: '空间层次', max: 100 },
  { name: '地域代表', max: 100 },
  { name: '文化影响', max: 100 },
]);

const radarValues = computed(() => {
  const building = selectedBuilding.value;
  const age = building.year < 0 ? 2026 + Math.abs(building.year) : 2026 - building.year;
  const levelBonus = levelBonusMap[building.level] ?? 6;
  const rarityRatio = 1 - (structureCountMap[building.structureType] ?? 1) / maxStructureCount;
  const provinceCategoryCount = provinceCategoryCountMap[`${building.province}-${building.category}`] ?? 1;
  const descriptionHitCount = keywordCandidates.filter((keyword) => building.description.includes(keyword)).length;
  const fameHitCount = ['唯一', '典范', '闻名', '代表', '最大', '完整', '世界', '皇家', '名楼'].filter((keyword) =>
    building.description.includes(keyword),
  ).length;

  const history = clamp(34 + age / 26 + building.importance * 6 + levelBonus, 40, 100);
  const structure = clamp(36 + rarityRatio * 30 + building.importance * 7 + descriptionHitCount * 3, 36, 98);
  const spatial = clamp(
    38 +
      (building.category === '宫殿' ? 18 : building.category === '官府' ? 14 : building.category === '民居' ? 12 : 10) +
      descriptionHitCount * 4,
    38,
    98,
  );
  const regional = clamp(
    32 +
      provinceCategoryCount * 2.2 +
      levelBonus * 1.2 +
      relatedBuildings.value.filter((item) => item.reasons.has('region')).length * 2.4,
    34,
    96,
  );
  const influence = clamp(35 + fameHitCount * 9 + building.importance * 8 + relatedBuildings.value.length * 1.2, 36, 100);

  return [history, structure, spatial, regional, influence].map((value) => Math.round(value));
});

const wordCloudMeta = computed(() => `${wordCloudData.value.length} 个关键词`);

const radarMeta = computed(() => `${selectedBuilding.value.level} · 权重 ${selectedBuilding.value.importance}/5`);

const networkSubtitle = computed(() => {
  if (lineageLoading.value) {
    return activeLineageEntry.value
      ? `已命中谱系子图 #${activeLineageEntry.value.line_no}，正在加载...`
      : '正在加载 stage10 建筑谱系图...';
  }

  if (activeLineageGraph.value && activeLineageEntry.value) {
    return `谱系 #${activeLineageEntry.value.line_no}：${activeLineageGraph.value.lineage_name} · 社区成员 ${activeLineageGraph.value.community_member_count} · 子图节点 ${activeLineageGraph.value.nodes.length}`;
  }

  if (activeLineageGraph.value) {
    return `谱系子图已加载 · 社区成员 ${activeLineageGraph.value.community_member_count} · 子图节点 ${activeLineageGraph.value.nodes.length}`;
  }

  if (activeLineageEntry.value) {
    return `已命中谱系子图 #${activeLineageEntry.value.line_no}，但子图未加载成功，已回退为默认关联网络`;
  }

  if (lineageManifest.value && lineageIndex.value.length > 0) {
    return '当前建筑未命中谱系子图，已回退为结构/地域/时代关联网络';
  }

  return `围绕“${selectedBuilding.value.structureType}”与 ${selectedBuilding.value.category}、${selectedBuilding.value.dynasty} 语境，收束 ${relatedBuildings.value.length} 个关联样本。`;
});

const truncateLabel = (value: string, length: number) => (value.length > length ? `${value.slice(0, length)}…` : value);

const renderPieChart = () => {
  const chart = chartInstances.get('pie');
  if (!chart) return;

  chart.setOption(
    {
      animationDuration: 500,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(249, 244, 236, 0.97)',
        borderColor: 'rgba(129, 100, 74, 0.18)',
        borderWidth: 1,
        textStyle: {
          color: '#3d2f25',
          fontFamily: 'ContentFont',
          fontSize: 13,
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['24%', '68%'],
          center: ['50%', '56%'],
          minAngle: 8,
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: 'rgba(255,255,255,0.92)',
            borderWidth: 2,
          },
          label: {
            show: true,
            position: 'outside',
            color: '#3f3027',
            fontFamily: 'ContentFont',
            fontSize: 12,
            fontWeight: 'bold',
            formatter: (params: { name: string }) => truncateLabel(params.name, 4),
          },
          labelLine: {
            show: true,
            length: 8,
            length2: 8,
            smooth: 0.35,
          },
          data: pieData.value.map((item, index) => ({
            ...item,
            itemStyle: {
              color: chartPalette[index % chartPalette.length],
            },
          })),
        },
      ],
    },
    { notMerge: true },
  );
};

const renderWordCloudChart = () => {
  const chart = chartInstances.get('cloud');
  if (!chart) return;

  chart.setOption(
    {
      tooltip: {
        show: true,
        backgroundColor: 'rgba(249, 244, 236, 0.97)',
        borderColor: 'rgba(129, 100, 74, 0.18)',
        borderWidth: 1,
        textStyle: {
          color: '#3d2f25',
          fontFamily: 'ContentFont',
          fontSize: 13,
        },
        formatter: (params: { data: WeightedItem }) => `${params.data.name}<br/>权重：${params.data.value}`,
      },
      series: [
        {
          type: 'wordCloud',
          shape: 'circle',
          width: '88%',
          height: '94%',
          left: 'center',
          top: 'center',
          sizeRange: [12, 42],
          gridSize: 5,
          rotationRange: [0, 0],
          drawOutOfBound: false,
          textStyle: {
            fontFamily: 'ContentFont',
            fontWeight: 'bold',
            color: () => chartPalette[Math.floor(Math.random() * chartPalette.length)],
            shadowBlur: 8,
            shadowColor: 'rgba(71, 57, 46, 0.16)',
          },
          emphasis: {
            textStyle: {
              shadowBlur: 12,
              shadowColor: 'rgba(100, 69, 49, 0.3)',
            },
          },
          data: wordCloudData.value,
        },
      ],
    },
    { notMerge: true },
  );
};

const renderRadarChart = () => {
  const chart = chartInstances.get('radar');
  if (!chart) return;

  chart.setOption(
    {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(249, 244, 236, 0.97)',
        borderColor: 'rgba(129, 100, 74, 0.18)',
        borderWidth: 1,
        textStyle: {
          color: '#3d2f25',
          fontFamily: 'ContentFont',
          fontSize: 13,
        },
      },
      radar: {
        radius: '66%',
        shape: 'circle',
        indicator: radarIndicators.value,
        axisName: {
          color: '#2f241d',
          fontFamily: 'ContentFont',
          fontSize: 13,
          fontWeight: 'bold',
        },
        splitNumber: 4,
        splitArea: {
          areaStyle: {
            color: ['rgba(236, 187, 104, 0.02)', 'rgba(236, 187, 104, 0.12)'],
          },
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(120, 89, 62, 0.18)',
          },
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(120, 89, 62, 0.24)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: radarValues.value,
              areaStyle: {
                color: 'rgba(213, 132, 128, 0.35)',
              },
              lineStyle: {
                color: '#D58480',
                width: 2,
              },
              itemStyle: {
                color: '#B85C59',
              },
            },
          ],
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    },
    { notMerge: true },
  );
};

const escapeTooltipHtml = (value: string) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const detectLineageEntityKind = (name: string) =>
  /古建筑群|建筑群|古村落|聚落|宅群|故居群|民居群|大院|村落|村$|寨$/.test(name) ? 'collection' : 'single';

const getLineageRoleKey = (node: LineageGraphNode) => {
  if (node.role === 'center') return 'center';
  if (node.role === 'bridge') return 'bridge';
  if (node.hop === 1) return 'hop1';
  if (node.hop === 2) return 'hop2';
  return 'hop3';
};

const lineageRoleLabel = (node: LineageGraphNode) => {
  const roleKey = getLineageRoleKey(node);
  return lineageLegend.find((item) => item.key === roleKey)?.label ?? '谱系节点';
};

const wrapLineageLabel = (text: string, max: number) => {
  if (text.length <= max) return text;

  const parts: string[] = [];
  for (let index = 0; index < text.length; index += max) {
    parts.push(text.slice(index, index + max));
  }

  return parts.join('\n');
};

const arcAngles = (count: number, startDeg: number, endDeg: number) => {
  if (count <= 0) return [];
  if (count === 1) return [(startDeg + endDeg) / 2];
  const step = (endDeg - startDeg) / count;
  return Array.from({ length: count }, (_value, index) => startDeg + step * index + step / 2);
};

const lineageEdgeKey = (edge: Pick<LineageGraphEdge, 'source' | 'target'>) =>
  [String(edge.source), String(edge.target)].sort().join('::');

const buildCenterStarEdges = (graph: LineageGraph) => {
  const edges = graph.edges ?? [];
  const centerId = String(graph.center_building?.line_no ?? '');
  if (!centerId) return [] as LineageGraphEdge[];

  const nodeById = new Map((graph.nodes ?? []).map((node) => [String(node.id), node]));

  return (graph.nodes ?? [])
    .filter((node) => String(node.id) !== centerId)
    .map((node) => {
      const nodeId = String(node.id);
      const directEdge = edges.find(
        (edge) =>
          (String(edge.source) === centerId && String(edge.target) === nodeId) ||
          (String(edge.source) === nodeId && String(edge.target) === centerId),
      );

      if (directEdge) {
        return {
          ...directEdge,
          source: centerId,
          target: nodeId,
          primary: true,
        };
      }

      const bestProxyEdge = edges
        .filter((edge) => String(edge.source) === nodeId || String(edge.target) === nodeId)
        .sort((left, right) => Number(right.weight || 0) - Number(left.weight || 0))[0];

      const proxyNodeId =
        bestProxyEdge
          ? String(bestProxyEdge.source) === nodeId
            ? String(bestProxyEdge.target)
            : String(bestProxyEdge.source)
          : null;
      const proxyNode = proxyNodeId ? nodeById.get(proxyNodeId) : null;
      const syntheticReasons = [
        ...(node.shared_features?.length ? [`共享特征：${node.shared_features.join('、')}`] : []),
        proxyNode ? `经由${proxyNode.name}接入谱系` : '',
        `节点性质：${lineageRoleLabel(node)}`,
      ].filter(Boolean);

      return {
        source: centerId,
        target: nodeId,
        weight: Math.max(0.18, Number(node.score || 0)),
        reasons: syntheticReasons,
        primary: true,
      } as LineageGraphEdge & { primary: boolean };
    });
};

const buildLineageGraphOption = (graph: LineageGraph): echarts.EChartsCoreOption => {
  const visibleEdges = buildCenterStarEdges(graph);

  const nodes = graph.nodes.map((node) => {
    const roleKey = getLineageRoleKey(node);
    const baseColor = lineageRoleColorMap[roleKey] ?? '#c5c9c1';
    const isCenter = node.role === 'center';
    const symbolSize = isCenter ? [132, 46] : 24;

    return {
      id: String(node.id),
      name: node.name,
      symbol: isCenter ? 'roundRect' : 'circle',
      symbolSize,
      value: Number(node.score || 0),
      itemStyle: {
        color: isCenter ? '#e6c3c9' : withAlpha(baseColor, 0.86),
        borderWidth: 0,
        shadowBlur: isCenter ? 10 : 6,
        shadowColor: isCenter ? 'rgba(124, 95, 105, 0.12)' : 'rgba(93, 85, 72, 0.08)',
        shadowOffsetX: 1,
        shadowOffsetY: 1,
      },
      label: {
        show: true,
        position: isCenter ? 'inside' : 'bottom',
        distance: isCenter ? 0 : 6,
        formatter: isCenter ? wrapLineageLabel(node.name, 10) : wrapLineageLabel(node.name, 7),
        color: '#333333',
        fontFamily: 'PortraitRefContentFont, ContentFont, serif',
        fontWeight: 'bold',
        fontSize: isCenter ? 18 : 14,
        lineHeight: 18,
        textBorderColor: isCenter ? 'transparent' : 'rgba(255, 250, 243, 0.95)',
        textBorderWidth: isCenter ? 0 : 3,
      },
      raw: node,
    };
  });

  const links = visibleEdges.map((edge) => {
    const isPrimary = Boolean(edge.primary);
    return {
      source: String(edge.source),
      target: String(edge.target),
      value: Number(edge.weight || 0),
      lineStyle: {
        width: isPrimary ? 1.8 : 1.1,
        color: isPrimary ? '#928e82' : 'rgba(146, 142, 130, 0.34)',
        opacity: isPrimary ? 0.72 : 0.3,
        curveness: 0.4,
      },
      raw: edge,
    };
  });

  return {
    backgroundColor: 'transparent',
    animationDuration: reducedMotion ? 0 : 420,
    animationDurationUpdate: reducedMotion ? 0 : 1200,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'quinticInOut',
    tooltip: {
      backgroundColor: 'rgba(248, 242, 232, 0.98)',
      borderColor: 'rgba(151, 117, 93, 0.22)',
      borderWidth: 1,
      textStyle: {
        color: '#333333',
        fontFamily: 'PortraitRefContentFont, ContentFont, serif',
        fontSize: 16,
        fontWeight: 'bold',
      },
      formatter: (params: { dataType: 'node' | 'edge'; data: any }) => {
        if (params.dataType === 'edge') {
          const edge = params.data.raw as LineageGraphEdge;
          const reasons = (edge.reasons ?? []).map((item) => escapeTooltipHtml(item)).join('<br/>');
          return `<div><strong>边权</strong> ${Number(edge.weight || 0).toFixed(3)}<br/>${reasons || '暂无边解释'}</div>`;
        }

        const node = params.data.raw as LineageGraphNode;
        const shared = (node.shared_features ?? []).map((item) => escapeTooltipHtml(item)).join('、');
        return `
          <div>
            <strong>${escapeTooltipHtml(node.name)}</strong><br/>
            ${escapeTooltipHtml(lineageRoleLabel(node))} · ${escapeTooltipHtml(node.building_type)}<br/>
            score ${Number(node.score || 0).toFixed(3)}<br/>
            ${escapeTooltipHtml(cleanProvince(node.province))} · ${escapeTooltipHtml(node.start_dynasty)}<br/>
            ${shared ? `共享特征：${shared}` : '共享特征：待补充'}
          </div>
        `;
      },
    },
    series: [
      {
        type: 'graph',
        top: '8%',
        right: '6%',
        bottom: '8%',
        left: '6%',
        layout: 'force',
        force: {
          repulsion: 180,
          edgeLength: [130, 240],
          friction: 0.1,
          layoutAnimation: !reducedMotion,
        },
        data: nodes,
        links,
        roam: true,
        draggable: true,
        focusNodeAdjacency: true,
        autoCurveness: true,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 8,
        scaleLimit: {
          min: 0.55,
          max: 1.9,
        },
        labelLayout: {
          hideOverlap: true,
        },
        lineStyle: {
          opacity: 0.6,
        },
      },
    ],
  };
};

const handleLineageNodeClick = (params: { dataType?: string; data?: { id?: string } }) => {
  if (params.dataType !== 'node') return;

  const nextId = params.data?.id;
  if (!nextId) return;

  const matchedEntry = lineageIndex.value.find((item) => item.line_no === String(nextId));
  if (!matchedEntry) return;

  const nextBuilding = resolveBuildingFromLineageEntry(matchedEntry);
  if (!nextBuilding || nextBuilding.id === selectedBuilding.value.id) return;

  selectedBuilding.value = nextBuilding;
  searchText.value = nextBuilding.name;
};

const renderGraphChart = () => {
  const chart = chartInstances.get('graph');
  if (!chart) return;

  if (activeLineageGraph.value) {
    chart.off('click');
    chart.on('click', handleLineageNodeClick);
    chart.setOption(buildLineageGraphOption(activeLineageGraph.value), { notMerge: true });
    return;
  }

  chart.off('click');

  const coreNode = {
    id: selectedBuilding.value.id,
    name: selectedBuilding.value.name,
    symbol: 'roundRect',
    symbolSize: [64, 40],
    draggable: false,
    itemStyle: {
      color: '#E0B3BC',
      borderWidth: 0,
      shadowBlur: 12,
      shadowColor: 'rgba(141, 95, 103, 0.18)',
    },
    label: {
      show: true,
      position: 'inside',
      color: '#1b120d',
      fontFamily: 'ContentFont',
      fontSize: 15,
      fontWeight: 'bold',
      textBorderColor: 'rgba(255, 247, 239, 0.95)',
      textBorderWidth: 2,
    },
    value: selectedBuilding.value.description,
  };

  const relatedNodes = relatedBuildings.value.map((entry) => ({
    id: entry.item.id,
    name: entry.item.name,
    symbol: 'circle',
    symbolSize: 16 + entry.item.importance * 5,
    draggable: false,
    itemStyle: {
      color: withAlpha(relationColorMap[entry.primaryRelation], 0.28),
      borderColor: withAlpha(relationColorMap[entry.primaryRelation], 0.62),
      borderWidth: 1,
    },
    label: {
      show: true,
      position: 'right',
      distance: 4,
      color: '#2a211c',
      fontFamily: 'ContentFont',
      fontSize: 11,
      fontWeight: 'bold',
      formatter: entry.item.name,
    },
    meta: `${entry.item.dynasty} · ${cleanProvince(entry.item.province)} · ${entry.item.structureType}`,
    relation: entry.primaryRelation,
  }));

  const graphLinks = relatedBuildings.value.map((entry) => ({
    source: selectedBuilding.value.id,
    target: entry.item.id,
    relationText: [...entry.reasons].map((key) => relationLegend.find((item) => item.key === key)?.label ?? key).join(' / '),
    lineStyle: {
      color: withAlpha(relationColorMap[entry.primaryRelation], 0.42),
      width: 1 + entry.item.importance * 0.22,
      curveness: 0.18,
      opacity: 0.8,
    },
  }));

  let secondaryLinkCount = 0;
  for (let leftIndex = 0; leftIndex < relatedBuildings.value.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < relatedBuildings.value.length; rightIndex += 1) {
      if (secondaryLinkCount >= 12) break;

      const left = relatedBuildings.value[leftIndex];
      const right = relatedBuildings.value[rightIndex];
      const sharedReasons = [...left.reasons].filter((reason) => right.reasons.has(reason));

      if (sharedReasons.length >= 2) {
        graphLinks.push({
          source: left.item.id,
          target: right.item.id,
          relationText: sharedReasons.map((key) => relationLegend.find((item) => item.key === key)?.label ?? key).join(' / '),
          lineStyle: {
            color: 'rgba(146, 138, 126, 0.26)',
            width: 0.9,
            curveness: 0.12,
            opacity: 0.5,
          },
        });
        secondaryLinkCount += 1;
      }
    }
  }

  chart.setOption(
    {
      animationDuration: 600,
      tooltip: {
        backgroundColor: 'rgba(249, 244, 236, 0.97)',
        borderColor: 'rgba(129, 100, 74, 0.18)',
        borderWidth: 1,
        textStyle: {
          color: '#3d2f25',
          fontFamily: 'ContentFont',
          fontSize: 13,
        },
        formatter: (params: { dataType: 'node' | 'edge'; data: any }) => {
          if (params.dataType === 'node') {
            if (params.data.id === selectedBuilding.value.id) {
              return `<strong>${selectedBuilding.value.name}</strong><br/>${selectedBuilding.value.dynasty} · ${cleanProvince(selectedBuilding.value.province)}<br/>${selectedBuilding.value.structureType}`;
            }

            return `<strong>${params.data.name}</strong><br/>${params.data.meta}`;
          }

          return params.data.relationText;
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: false,
          data: [coreNode, ...relatedNodes],
          links: graphLinks,
          edgeSymbol: ['none', 'none'],
          labelLayout: {
            hideOverlap: true,
          },
          force: {
            repulsion: 220,
            gravity: 0.06,
            edgeLength: [66, 150],
            friction: 0.12,
          },
          emphasis: {
            focus: 'adjacency',
            scale: true,
          },
          lineStyle: {
            color: 'source',
            opacity: 0.6,
          },
        },
      ],
    },
    { notMerge: true },
  );
};

const renderAllCharts = () => {
  renderPieChart();
  renderWordCloudChart();
  renderRadarChart();
  renderGraphChart();
};

const initCharts = () => {
  (Object.keys(chartRefs) as ChartKey[]).forEach((key) => {
    const element = chartRefs[key].value;
    if (!element || chartInstances.has(key)) return;

    chartInstances.set(key, echarts.init(element, THEME_NAME));
  });
};

let resizeFrame = 0;

const handleResize = () => {
  if (resizeFrame) {
    window.cancelAnimationFrame(resizeFrame);
  }

  resizeFrame = window.requestAnimationFrame(() => {
    chartInstances.forEach((chart) => chart.resize());
    renderAllCharts();
    resizeFrame = 0;
  });
};

const handleSearch = () => {
  const keyword = searchText.value.trim();

  if (!keyword) {
    ElMessage.warning('请输入建筑名称、类别或结构类型');
    return;
  }

  const nextBuilding = findBestMatch(keyword);

  if (!nextBuilding) {
    ElMessage.warning('未找到匹配的建筑样本');
    return;
  }

  selectedBuilding.value = nextBuilding;
  searchText.value = nextBuilding.name;
};

watch(
  selectedBuilding,
  () => {
    activeLineageGraph.value = null;
    nextTick(() => {
      renderAllCharts();
      void syncLineageGraph(selectedBuilding.value);
    });
  },
  { flush: 'post' },
);

watch(
  activeLineageGraph,
  () => {
    nextTick(() => {
      renderGraphChart();
    });
  },
  { flush: 'post' },
);

onMounted(() => {
  nextTick(() => {
    initCharts();
    renderAllCharts();
    handleResize();
  });

  window.addEventListener('resize', handleResize);
  void loadLineageResources();
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
.building-portrait-view {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 6px 20px 18px;
  background:
    linear-gradient(180deg, rgba(247, 241, 231, 0.76), rgba(240, 231, 218, 0.72)),
    radial-gradient(circle at 12% 10%, rgba(255, 255, 255, 0.52), transparent 18%),
    radial-gradient(circle at 84% 20%, rgba(255, 255, 255, 0.36), transparent 20%);
}

.building-portrait-view__wash,
.building-portrait-view__grain,
.building-portrait-view__roof {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.building-portrait-view__wash {
  background:
    radial-gradient(circle at 20% 16%, rgba(255, 255, 255, 0.4), transparent 22%),
    radial-gradient(circle at 74% 24%, rgba(214, 186, 164, 0.18), transparent 22%);
}

.building-portrait-view__grain {
  background: repeating-linear-gradient(135deg, rgba(129, 99, 77, 0.025) 0, rgba(129, 99, 77, 0.025) 1px, transparent 1px, transparent 16px);
}

.building-portrait-view__roof {
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

.building-portrait-view__petal {
  position: absolute;
  width: 14px;
  height: 24px;
  border-radius: 50% 50% 46% 46%;
  background: rgba(244, 176, 196, 0.68);
  filter: blur(0.3px);
  transform: rotate(20deg);
  pointer-events: none;
}

.building-portrait-view__petal--a {
  top: 9%;
  left: 22%;
}

.building-portrait-view__petal--b {
  top: 30%;
  left: 18%;
  transform: rotate(-20deg);
}

.building-portrait-view__petal--c {
  top: 18%;
  right: 8%;
}

.building-portrait-view__petal--d {
  top: 56%;
  right: 18%;
  transform: rotate(-16deg);
}

.building-portrait-view__search-row,
.building-portrait-view__body {
  position: relative;
  z-index: 2;
}

.building-portrait-view__search-row {
  display: flex;
  justify-content: center;
  padding: 4px 0 12px;
}

.building-search {
  width: min(980px, 82%);
  display: flex;
  align-items: center;
  gap: 10px;
}

.building-search__input {
  flex: 1;
  height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  border: 2px solid rgba(219, 177, 111, 0.92);
  background: rgba(255, 251, 245, 0.42);
  color: #46362b;
  font-family: 'ContentFont', serif;
  font-size: 18px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.building-search__input::placeholder {
  color: rgba(105, 84, 71, 0.64);
}

.building-search__input:focus {
  outline: none;
  border-color: #dca24c;
  box-shadow: 0 0 0 4px rgba(221, 177, 111, 0.14);
}

.building-search__button {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
}

.building-portrait-view__body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.82fr);
  gap: 18px;
}

.building-portrait-view__left,
.building-portrait-view__right {
  min-height: 0;
}

.building-portrait-view__left {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 18px;
}

.profile-card,
.chart-card,
.network-panel {
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  border: none;
  backdrop-filter: none;
}

.profile-card {
  display: grid;
  grid-template-columns: 208px minmax(0, 1fr);
  gap: 20px;
  align-items: center;
  padding: 18px 22px;
}

.profile-card__media {
  position: relative;
  display: grid;
  place-items: center;
}

.profile-card__media img {
  width: 192px;
  height: 192px;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: none;
  border: none;
  background: rgba(255, 255, 255, 0.58);
}

.profile-card__seal {
  position: absolute;
  right: 6px;
  bottom: 10px;
  padding: 6px 12px 4px;
  border-radius: 999px;
  background: rgba(127, 73, 52, 0.88);
  color: #fff6ee;
  font-family: 'ContentFont', serif;
  font-size: 13px;
  line-height: 1;
}

.profile-card__content {
  min-width: 0;
  display: grid;
  gap: 10px;
}

.profile-card__name {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 40px;
  line-height: 1.04;
  color: #231a14;
}

.profile-card__meta-grid {
  display: grid;
  gap: 6px;
}

.profile-card__meta-item,
.profile-card__desc {
  font-family: 'ContentFont', serif;
  color: #2d231c;
  font-size: 20px;
  line-height: 1.45;
}

.profile-card__meta-item strong,
.profile-card__desc strong {
  color: #1f1611;
}

.chart-grid {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.chart-card {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 14px 14px 10px;
}

.chart-card__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chart-card__header h3,
.network-panel__header h2 {
  margin: 0;
  font-family: 'PortraitRefTitleFont', 'TitleFont', serif;
  color: #333333;
  line-height: 1.08;
}

.chart-card__header h3 {
  font-size: 28px;
}

.chart-card__header span,
.network-panel__header p,
.network-panel__legend-item {
  font-family: 'PortraitRefContentFont', 'ContentFont', serif;
  color: rgba(82, 74, 63, 0.82);
}

.chart-card__header span,
.network-panel__header p {
  font-size: 12px;
  line-height: 1.5;
}

.chart-card__canvas {
  flex: 1;
  min-height: 300px;
}

.building-portrait-view__right {
  display: flex;
}

.network-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 18px 18px 12px;
}

.network-panel__header {
  display: grid;
  gap: 8px;
  margin-bottom: 4px;
}

.network-panel__header h2 {
  font-size: 40px;
  text-align: center;
}

.network-panel__header p {
  margin: 0;
  text-align: center;
  font-size: 13px;
  line-height: 1.45;
}

.network-panel__legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 12px;
}

.network-panel__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}

.network-panel__legend-item i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.network-panel__canvas {
  flex: 1;
  min-height: 0;
  margin-top: 2px;
}

@media (max-width: 1460px) {
  .profile-card {
    grid-template-columns: 180px minmax(0, 1fr);
  }

  .profile-card__media img {
    width: 166px;
    height: 166px;
  }

  .profile-card__name {
    font-size: 34px;
  }

  .profile-card__meta-item,
  .profile-card__desc {
    font-size: 18px;
  }

  .chart-card__header h3 {
    font-size: 24px;
  }

  .network-panel__header h2 {
    font-size: 34px;
  }
}

@media (max-width: 1220px) {
  .building-search {
    width: 100%;
  }

  .building-portrait-view__body {
    grid-template-columns: 1fr;
    overflow: auto;
    padding-right: 4px;
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }

  .chart-card__canvas {
    min-height: 260px;
  }

  .network-panel__canvas {
    min-height: 520px;
  }
}

@media (max-width: 880px) {
  .building-portrait-view {
    padding-inline: 12px;
  }

  .profile-card {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: left;
  }

  .profile-card__content {
    width: 100%;
  }

  .profile-card__name {
    font-size: 30px;
    text-align: center;
  }

  .network-panel__header h2 {
    font-size: 28px;
  }
}
</style>
