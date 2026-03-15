export type DashboardCategory = '民居' | '官府' | '宫殿' | '桥梁';

export interface DashboardBuilding {
  id: string;
  name: string;
  category: DashboardCategory;
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

export interface DashboardYearRange {
  start: number;
  end: number;
}
