export interface BuildingRecord {
  id: string;
  name: string;
  category: '\u6c11\u5c45' | '\u5b98\u5e9c' | '\u5b97\u6559' | '\u56ed\u6797' | '\u57ce\u9632';
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
