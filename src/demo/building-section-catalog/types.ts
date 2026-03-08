export type BuildingCategoryId = 'residence' | 'office' | 'palace' | 'bridge';

export type SketchVariant =
  | 'residence-courtyard'
  | 'residence-tulou'
  | 'residence-diaolou'
  | 'residence-stilted'
  | 'office-hall'
  | 'office-gate'
  | 'office-yamen'
  | 'palace-hall'
  | 'palace-gate'
  | 'palace-tower'
  | 'bridge-arch'
  | 'bridge-beam'
  | 'bridge-corridor';

export interface BuildingGalleryItem {
  id: string;
  name: string;
  dynasty: string;
  year: number;
  eraLabel: string;
  region: string;
  summary: string;
  tags: string[];
  variant: SketchVariant;
}

export interface BuildingGroup {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  previewVariant: SketchVariant;
  items: BuildingGalleryItem[];
}

export interface BuildingCategory {
  id: BuildingCategoryId;
  title: string;
  alias: string;
  english: string;
  seal: string;
  summary: string;
  description: string;
  accent: string;
  outline: string;
  coverVariant: SketchVariant;
  coverImage?: string;
  coverPosition?: string;
  coverSize?: string;
  useCoverAsPoster?: boolean;
  groups: BuildingGroup[];
}
