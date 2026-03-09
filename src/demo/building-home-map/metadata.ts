import type { BuildingRecord } from './types';
import type { SketchVariant } from '@/demo/building-section-catalog/types';

export type StructureType = '\u6c11\u5c45' | '\u5b98\u5e9c' | '\u7687\u5bab' | '\u6865\u6881';

export interface StructureLegendItem {
  key: StructureType;
  label: string;
  color: string;
  description: string;
}

export interface ImportanceLegendItem {
  label: string;
  title: string;
  description: string;
  className: 'triangle' | 'rect' | 'pentagon' | 'circle' | 'circle-large';
  size: number;
}

export const PENTAGON_SYMBOL = 'path://M50 3L97 38L79 96L21 96L3 38Z';

export const structureLegend: StructureLegendItem[] = [
  {
    key: '\u6c11\u5c45',
    label: '\u6c11\u5c45',
    color: '#b67a4a',
    description: '\u5b85\u9662\u3001\u805a\u843d\u4e0e\u5730\u65b9\u6c11\u5c45\u5efa\u7b51',
  },
  {
    key: '\u5b98\u5e9c',
    label: '\u5b98\u5e9c',
    color: '#4b765f',
    description: '\u57ce\u5899\u3001\u8859\u7f72\u3001\u697c\u9601\u7b49\u5b98\u5f0f\u5efa\u7b51',
  },
  {
    key: '\u7687\u5bab',
    label: '\u7687\u5bab',
    color: '#a3473a',
    description: '\u5bab\u57ce\u3001\u5bab\u6bbf\u4e0e\u9ad8\u7b49\u7ea7\u793c\u5236\u7a7a\u95f4',
  },
  {
    key: '\u6865\u6881',
    label: '\u6865\u6881',
    color: '#6f7f8f',
    description: '\u77f3\u6865\u3001\u5eca\u6865\u4e0e\u4ea4\u901a\u6c34\u5de5\u5efa\u7b51',
  },
];

export const importanceLegend: ImportanceLegendItem[] = [
  {
    label: '一级',
    title: '基础',
    description: '普通补充样本',
    className: 'triangle',
    size: 10,
  },
  {
    label: '二级',
    title: '常规',
    description: '信息较完整的展示点',
    className: 'rect',
    size: 10,
  },
  {
    label: '三级',
    title: '代表',
    description: '较有代表性的建筑案例',
    className: 'pentagon',
    size: 11,
  },
  {
    label: '四级',
    title: '重点',
    description: '需要优先关注的建筑',
    className: 'circle',
    size: 12,
  },
  {
    label: '五级+',
    title: '核心',
    description: '最醒目的核心节点',
    className: 'circle-large',
    size: 14,
  },
];

const structureByCategory: Record<BuildingRecord['category'], StructureType> = {
  '\u6c11\u5c45': '\u6c11\u5c45',
  '\u5b98\u5e9c': '\u5b98\u5e9c',
  '\u5bab\u6bbf': '\u7687\u5bab',
  '\u5b97\u6559': '\u7687\u5bab',
  '\u56ed\u6797': '\u6c11\u5c45',
  '\u57ce\u9632': '\u5b98\u5e9c',
  '\u6865\u6881': '\u6865\u6881',
};

const symbolByImportance = [
  { max: 1, symbol: 'triangle', size: 10 },
  { max: 2, symbol: 'rect', size: 10 },
  { max: 3, symbol: PENTAGON_SYMBOL, size: 11 },
  { max: 4, symbol: 'circle', size: 12 },
  { max: Number.POSITIVE_INFINITY, symbol: 'circle', size: 14 },
] as const;

export const getStructureType = (building: BuildingRecord): StructureType =>
  structureByCategory[building.category] ?? '\u6742\u6784';

export const getStructureColor = (value: StructureType | BuildingRecord) => {
  const key = typeof value === 'string' ? value : getStructureType(value);
  return structureLegend.find((item) => item.key === key)?.color ?? '#4b765f';
};

export const getBuildingSymbol = (building: BuildingRecord) => {
  const matched = symbolByImportance.find((item) => building.importance <= item.max) ?? symbolByImportance[symbolByImportance.length - 1];
  return matched.symbol;
};

export const getBuildingSymbolSize = (building: BuildingRecord) => {
  const matched = symbolByImportance.find((item) => building.importance <= item.max) ?? symbolByImportance[symbolByImportance.length - 1];
  return matched.size;
};

export const getDominantStructure = (buildings: BuildingRecord[]): StructureType => {
  const grouped = new Map<StructureType, number>();

  for (const building of buildings) {
    const structure = getStructureType(building);
    grouped.set(structure, (grouped.get(structure) ?? 0) + 1);
  }

  return Array.from(grouped.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? '\u6742\u6784';
};

const sketchByCategory: Record<BuildingRecord['category'], SketchVariant> = {
  '\u6c11\u5c45': 'residence-courtyard',
  '\u5b98\u5e9c': 'office-yamen',
  '\u5bab\u6bbf': 'palace-hall',
  '\u5b97\u6559': 'palace-hall',
  '\u56ed\u6797': 'bridge-corridor',
  '\u57ce\u9632': 'office-gate',
  '\u6865\u6881': 'bridge-arch',
};

const sketchByBuildingId: Partial<Record<string, SketchVariant>> = {
  'chengde-resort': 'bridge-corridor',
  'chen-clan-academy': 'office-hall',
  'daming-palace': 'palace-hall',
  'dule-temple': 'office-hall',
  'feihong-pagoda': 'palace-tower',
  'foguang-temple': 'palace-hall',
  'forbidden-city': 'palace-hall',
  'forbidden-city-corner': 'palace-tower',
  'forbidden-city-meridian': 'palace-gate',
  'gongwangfu': 'office-yamen',
  'humble-admin-garden': 'bridge-corridor',
  'huangcheng-xiangfu': 'residence-courtyard',
  'hualin-temple': 'office-hall',
  'jinci-temple': 'palace-hall',
  'kaiping-diaolou': 'residence-diaolou',
  'liuyuan-garden': 'bridge-corridor',
  'longxing-temple': 'palace-hall',
  'nanchan-temple': 'office-hall',
  'pingyao-wall': 'office-gate',
  'qiao-family': 'residence-courtyard',
  'qujia-courtyard': 'residence-courtyard',
  'shanhai-pass': 'palace-gate',
  'shanhua-temple': 'palace-hall',
  'shenyang-palace': 'palace-gate',
  'summer-palace': 'bridge-arch',
  'wang-family': 'residence-courtyard',
  'wangshi-garden': 'bridge-corridor',
  'yanmen-pass': 'office-gate',
  'yingxian-pagoda': 'palace-tower',
  'yongding-tulou': 'residence-tulou',
};

export const getBuildingSketchVariant = (building: BuildingRecord): SketchVariant =>
  sketchByBuildingId[building.id] ?? sketchByCategory[building.category] ?? 'residence-courtyard';
