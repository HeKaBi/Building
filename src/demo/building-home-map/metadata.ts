import type { BuildingRecord } from './types';

export type StructureType = '\u6bbf\u9601' | '\u5385\u5802' | '\u6742\u6784';

export interface StructureLegendItem {
  key: StructureType;
  label: string;
  color: string;
  description: string;
}

export interface ShapeLegendItem {
  label: string;
  className: 'triangle' | 'rect' | 'pentagon' | 'circle' | 'circle-large';
  size: number;
}

export interface SizeLegendItem {
  label: string;
  size: number;
}

export const PENTAGON_SYMBOL = 'path://M50 3L97 38L79 96L21 96L3 38Z';

export const structureLegend: StructureLegendItem[] = [
  {
    key: '\u6bbf\u9601',
    label: '\u6bbf\u9601',
    color: '#4b765f',
    description: '\u5bab\u6bbf\u3001\u5b98\u7f72\u3001\u793c\u5236\u7a7a\u95f4',
  },
  {
    key: '\u5385\u5802',
    label: '\u5385\u5802',
    color: '#b44f42',
    description: '\u5bfa\u89c2\u3001\u56ed\u6797\u4e0e\u5385\u5802\u5efa\u7b51',
  },
  {
    key: '\u6742\u6784',
    label: '\u6742\u6784',
    color: '#b67a4a',
    description: '\u6c11\u5c45\u3001\u57ce\u9632\u53ca\u590d\u5408\u6784\u7b51',
  },
];

export const pointShapeLegend: ShapeLegendItem[] = [
  { label: '1', className: 'triangle', size: 12 },
  { label: '3', className: 'rect', size: 11 },
  { label: '5', className: 'pentagon', size: 12 },
  { label: '7', className: 'circle', size: 12 },
  { label: '9', className: 'circle-large', size: 14 },
];

export const depthSizeLegend: SizeLegendItem[] = [
  { label: '1 - 3', size: 9 },
  { label: '4 - 6', size: 11 },
  { label: '7 - 9', size: 13 },
  { label: '> 9', size: 15 },
];

const structureByCategory: Record<BuildingRecord['category'], StructureType> = {
  '\u6c11\u5c45': '\u6742\u6784',
  '\u5b98\u5e9c': '\u6bbf\u9601',
  '\u5b97\u6559': '\u5385\u5802',
  '\u56ed\u6797': '\u5385\u5802',
  '\u57ce\u9632': '\u6742\u6784',
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
