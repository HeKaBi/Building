import rawBuildings from '../../../building.json';

import type {
  BuildingCategory,
  BuildingCategoryId,
  BuildingGalleryItem,
  SketchVariant,
} from './types';
import { buildingImageMap } from './generatedImageMap';
import bridgeCover from '@/assets/images/building-covers/bridge-cover.png';
import bridgeGroupArchCover from '@/assets/images/building-covers/bridge-group-arch.png';
import bridgeGroupBeamCover from '@/assets/images/building-covers/bridge-group-beam.png';
import bridgeGroupCorridorCover from '@/assets/images/building-covers/bridge-group-corridor.png';
import bridgeGroupGeneralCover from '@/assets/images/building-covers/bridge-group-general.png';
import officeCover from '@/assets/images/building-covers/office-cover.png';
import officeGroupCitywallCover from '@/assets/images/building-covers/office-group-citywall.png';
import officeGroupMansionHallCover from '@/assets/images/building-covers/office-group-mansion-hall.png';
import officeGroupTowerCover from '@/assets/images/building-covers/office-group-tower.png';
import officeGroupYamenCover from '@/assets/images/building-covers/office-group-yamen.png';
import palaceCover from '@/assets/images/building-covers/palace-cover.png';
import palaceGroupGardenResortCover from '@/assets/images/building-covers/palace-group-garden-resort.png';
import palaceGroupMansionGardenCover from '@/assets/images/building-covers/palace-group-mansion-garden.png';
import palaceGroupPalaceCityCover from '@/assets/images/building-covers/palace-group-palace-city.png';
import palaceGroupTowerScreenCover from '@/assets/images/building-covers/palace-group-tower-screen.png';
import residenceCover from '@/assets/images/building-covers/residence-cover.png';
import residenceGroupFortifiedCover from '@/assets/images/building-covers/residence-group-fortified.png';
import residenceGroupGardenCover from '@/assets/images/building-covers/residence-group-garden.png';
import residenceGroupManorCover from '@/assets/images/building-covers/residence-group-manor.png';
import residenceGroupSettlementCover from '@/assets/images/building-covers/residence-group-settlement.png';
import qingchengPaperSketch from '@/assets/images/building-paper/building-1852-b868caf8.png';

type SourceCategory = '民居' | '官府' | '宫殿' | '桥梁';

interface SourceBuildingRecord {
  id: string;
  name: string;
  category: SourceCategory;
  dynasty: string;
  year: number;
  eraLabel: string;
  province: string;
  city: string;
  level: string;
  importance: number;
  description: string;
  structureType?: string;
}

interface CategorySeed {
  sourceCategory: SourceCategory;
  id: BuildingCategoryId;
  title: string;
  alias: string;
  english: string;
  seal: string;
  summaryLead: string;
  description: string;
  accent: string;
  outline: string;
  coverVariant: SketchVariant;
  coverImage: string;
  coverPosition: string;
  coverSize: string;
  useCoverAsPoster: boolean;
}

interface GroupSeed {
  title: string;
  subtitle: string;
  description: string;
  previewVariant: SketchVariant;
  coverImage?: string;
  coverPosition?: string;
  coverSize?: string;
  useCoverAsPoster?: boolean;
}

const categorySeeds: CategorySeed[] = [
  {
    sourceCategory: '民居',
    id: 'residence',
    title: '民居',
    alias: '宅院聚落',
    english: 'Residences',
    seal: '宅',
    summaryLead: '从日常居住空间切入，按结构继续拆分宅院、村寨与围护住居。',
    description: '以真实民居样本构成二级图册，适合继续承接地区、朝代与营造方式对比。',
    accent: '#b45b47',
    outline: '#8d3b32',
    coverVariant: 'residence-courtyard',
    coverImage: residenceCover,
    coverPosition: 'center center',
    coverSize: 'contain',
    useCoverAsPoster: true,
  },
  {
    sourceCategory: '官府',
    id: 'office',
    title: '官府',
    alias: '治所公署',
    english: 'Administrations',
    seal: '署',
    summaryLead: '从官式空间进入城防、衙署、考院与楼阁等不同治理单元。',
    description: '二级结构以空间职能和形制差异为主，适合展示行政与城防建筑的系统性。',
    accent: '#a44a3d',
    outline: '#7c3029',
    coverVariant: 'office-yamen',
    coverImage: officeCover,
    coverPosition: 'center center',
    coverSize: 'contain',
    useCoverAsPoster: true,
  },
  {
    sourceCategory: '宫殿',
    id: 'palace',
    title: '宫殿',
    alias: '宫苑王府',
    english: 'Palaces',
    seal: '宫',
    summaryLead: '把王府、宫城、山庄与楼台影壁拆成独立结构专题。',
    description: '样本总量不大，但结构差异清楚，适合用二级分组强化宫苑建筑的观看路径。',
    accent: '#9d3f34',
    outline: '#7d2f26',
    coverVariant: 'palace-hall',
    coverImage: palaceCover,
    coverPosition: 'center center',
    coverSize: 'contain',
    useCoverAsPoster: true,
  },
  {
    sourceCategory: '桥梁',
    id: 'bridge',
    title: '桥梁',
    alias: '跨水通路',
    english: 'Bridges',
    seal: '桥',
    summaryLead: '按桥型和水工构成拆分拱桥、廊桥、梁桥与堤闸系统。',
    description: '桥梁样本适合按结构形制组织，二级目录能明显拉开不同跨越方式的视觉差异。',
    accent: '#5a748d',
    outline: '#466176',
    coverVariant: 'bridge-arch',
    coverImage: bridgeCover,
    coverPosition: 'center center',
    coverSize: 'contain',
    useCoverAsPoster: true,
  },
];

const groupSeedsByCategory: Record<SourceCategory, GroupSeed[]> = {
  民居: [
    {
      title: '宅院府第',
      subtitle: '院落礼制与深进家宅',
      description: '重点观察门厅、正房、套院和家族礼序如何在一组宅院中层层展开。',
      previewVariant: 'residence-courtyard',
      coverImage: residenceGroupManorCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '聚落村寨',
      subtitle: '村巷肌理与群体营建',
      description: '这类样本更适合整体观看，重点不在单体，而在巷道、院落和公共空间关系。',
      previewVariant: 'residence-courtyard',
      coverImage: residenceGroupSettlementCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '园居草堂',
      subtitle: '园宅交织与文人起居',
      description: '院落与园林、书斋、草堂交织，是民居中最强调生活意境的一组结构类型。',
      previewVariant: 'residence-courtyard',
      coverImage: residenceGroupGardenCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '土楼碉堡',
      subtitle: '围护聚居与垂直防御',
      description: '这组样本强调厚墙、围合、瞭望和聚族而居，是辨识度最高的民居形制之一。',
      previewVariant: 'residence-tulou',
      coverImage: residenceGroupFortifiedCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '吊脚干栏',
      subtitle: '架空木构与山地适应',
      description: '重点看架空层、木构柱网和山地路径，理解居住空间如何顺应地形与湿热气候。',
      previewVariant: 'residence-stilted',
    },
  ],
  官府: [
    {
      title: '城墙城防',
      subtitle: '门关城楼与防御体系',
      description: '围绕城门、墙体、箭楼与边防设施展开，适合突出官式建筑的外向控制性。',
      previewVariant: 'office-gate',
      coverImage: officeGroupCitywallCover,
      coverPosition: '72% bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '衙署公堂',
      subtitle: '治所序列与厅堂空间',
      description: '衙门、公堂和办公院落构成行政核心，是官府建筑中最典型的中轴序列。',
      previewVariant: 'office-yamen',
      coverImage: officeGroupYamenCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '楼阁钟鼓',
      subtitle: '城市制高点与报时望景',
      description: '钟楼、鼓楼与谯楼兼具观望、报时与城市标志功能，立面辨识度最强。',
      previewVariant: 'palace-tower',
      coverImage: officeGroupTowerCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '府第会馆',
      subtitle: '官式府邸与会馆接待',
      description: '从将军府、官邸到会馆，重点看礼仪接待与起居空间如何叠加。',
      previewVariant: 'office-hall',
      coverImage: officeGroupMansionHallCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '仓驿设施',
      subtitle: '仓场驿站与后勤节点',
      description: '这类样本强调运输、储存和驿路节点的组织方式，功能性明显强于装饰性。',
      previewVariant: 'office-yamen',
    },
    {
      title: '考院学署',
      subtitle: '考试制度与文治空间',
      description: '考棚、试院和学政建筑适合从规整布局和制度化空间控制来理解。',
      previewVariant: 'office-hall',
    },
    {
      title: '书院礼制',
      subtitle: '监学礼制与官学系统',
      description: '这类样本数量少，但制度属性很强，可作为官学空间的单独专题浏览。',
      previewVariant: 'office-hall',
    },
    {
      title: '监狱设施',
      subtitle: '近代监管与控制空间',
      description: '近代监狱类样本更强调围护、隔离与管理线路，与传统衙署区别明显。',
      previewVariant: 'office-yamen',
    },
  ],
  桥梁: [
    {
      title: '拱桥',
      subtitle: '券拱跨水与石作体系',
      description: '这一组以石拱为主，重点观察券洞、桥墩、泄洪和跨度组织。',
      previewVariant: 'bridge-arch',
      coverImage: bridgeGroupArchCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '廊桥风雨桥',
      subtitle: '桥廊合一与停驻空间',
      description: '桥不仅承担通行，也承担遮蔽、社交和观景功能，是最具空间层次的桥型。',
      previewVariant: 'bridge-corridor',
      coverImage: bridgeGroupCorridorCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '梁桥栈道',
      subtitle: '梁架连跨与线性交通',
      description: '这类样本适合从梁架、桥面和沿线地形关系来理解连续跨越的构造逻辑。',
      previewVariant: 'bridge-beam',
      coverImage: bridgeGroupBeamCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '堤闸纤道',
      subtitle: '水工设施与复合通路',
      description: '桥与闸、堤、坝、纤道结合时，重点应放在水工系统和交通系统的叠合。',
      previewVariant: 'bridge-beam',
    },
    {
      title: '桥群复合',
      subtitle: '桥群网络与多点通行',
      description: '桥群更适合整体观察，重点看多座桥如何共同组织水陆交通和聚落联系。',
      previewVariant: 'bridge-corridor',
    },
    {
      title: '综合桥梁',
      subtitle: '未再细分的典型桥例',
      description: '保留少量未再细分的样本，用于补足桥梁谱系中的边缘类型。',
      previewVariant: 'bridge-arch',
      coverImage: bridgeGroupGeneralCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
  ],
  宫殿: [
    {
      title: '王府宫苑',
      subtitle: '王府制度与苑囿生活',
      description: '王府与宫苑更适合从礼制等级、入口控制和生活起居序列来观察。',
      previewVariant: 'palace-gate',
      coverImage: palaceGroupMansionGardenCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '宫殿宫城',
      subtitle: '宫城核心与高等级殿宇',
      description: '这组样本突出高台、殿宇和核心礼制空间，是宫殿类最集中也最典型的一组。',
      previewVariant: 'palace-hall',
      coverImage: palaceGroupPalaceCityCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '园林山庄',
      subtitle: '山水经营与离宫游憩',
      description: '适合观察宫苑如何把建筑、园路和自然地形编织成连续游观空间。',
      previewVariant: 'palace-hall',
      coverImage: palaceGroupGardenResortCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
    {
      title: '楼台影壁',
      subtitle: '象征构件与立面标识',
      description: '角楼、影壁、石坊等更偏向标识性构筑，适合作为宫殿类的形象节点专题。',
      previewVariant: 'palace-tower',
      coverImage: palaceGroupTowerScreenCover,
      coverPosition: 'center bottom',
      coverSize: 'auto 126%',
      useCoverAsPoster: true,
    },
  ],
};

const provinceToMacroRegion: Record<string, string> = {
  北京: '华北',
  天津: '华北',
  河北: '华北',
  山西: '华北',
  内蒙古: '华北',
  辽宁: '东北',
  吉林: '东北',
  黑龙江: '东北',
  上海: '华东',
  江苏: '华东',
  浙江: '华东',
  安徽: '华东',
  福建: '华东',
  江西: '华东',
  山东: '华东',
  河南: '华中',
  湖北: '华中',
  湖南: '华中',
  广东: '华南',
  广西: '华南',
  海南: '华南',
  重庆: '西南',
  四川: '西南',
  贵州: '西南',
  云南: '西南',
  西藏: '西南',
  陕西: '西北',
  甘肃: '西北',
  青海: '西北',
  宁夏: '西北',
  新疆: '西北',
};

const structureRulesByCategory: Record<SourceCategory, Array<[string, RegExp]>> = {
  民居: [
    ['土楼碉堡', /土楼|围屋|碉楼|碉堡|碉寨|碉|土堡|堡/],
    ['吊脚干栏', /吊脚|干栏/],
    ['聚落村寨', /古建筑群|建筑群|村|寨|乡土建筑|聚落|故里|老城/],
    ['园居草堂', /园|草堂|亭|阁/],
    ['宅院府第', /宅|院|堂|府|民居|故居|祠/],
  ],
  官府: [
    ['城墙城防', /城墙|城门|所城|卫城|古城|水城|关|门|屯|堡|寨|箭楼|敌台|烽火|长城/],
    ['衙署公堂', /衙|署|大堂|堂|府衙|县衙|州署|官寨|土司/],
    ['楼阁钟鼓', /楼|阁|钟楼|鼓楼|谯楼/],
    ['考院学署', /考棚|考院|试院|贡院|学政/],
    ['府第会馆', /将军府|进士第|府第|王府|公主府|尚书第|会馆|公所|花园|瞻园|皇史宬|宅院|吕府|董府/],
    ['仓驿设施', /仓|驿/],
    ['书院礼制', /国子监|学宫|文庙|书院/],
    ['监狱设施', /监狱/],
  ],
  桥梁: [
    ['廊桥风雨桥', /廊桥|风雨桥/],
    ['桥群复合', /桥群|三桥|古桥群|桥和/],
    ['拱桥', /拱桥|单拱|双拱|多孔石拱|石拱|圆拱|联拱|券洞/],
    ['梁桥栈道', /梁桥|木桥|浮桥|索桥|铁索|栈道/],
    ['堤闸纤道', /闸桥|闸|坝|堤|纤道/],
    ['综合桥梁', /桥/],
  ],
  宫殿: [
    ['王府宫苑', /王府|府/],
    ['宫殿宫城', /故宫|宫|殿/],
    ['园林山庄', /山庄|园|景山|罗布林卡/],
    ['楼台影壁', /楼|壁|坊/],
  ],
};

const sourceBuildings = (rawBuildings as SourceBuildingRecord[]).filter((item) =>
  ['民居', '官府', '宫殿', '桥梁'].includes(item.category),
);

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const formatYear = (year: number) => (year < 0 ? `前${Math.abs(year)}年` : `${year}年`);

const getStructureType = (item: SourceBuildingRecord) => {
  const normalizedStructureType = item.structureType?.trim();

  if (normalizedStructureType) {
    return normalizedStructureType === '围屋土楼碉楼' ? '土楼碉堡' : normalizedStructureType;
  }

  const rules = structureRulesByCategory[item.category];
  const text = `${item.name} ${item.description}`;

  for (const [label, pattern] of rules) {
    if (pattern.test(text)) {
      return label;
    }
  }

  switch (item.category) {
    case '民居':
      return '宅院府第';
    case '官府':
      return '衙署公堂';
    case '桥梁':
      return '综合桥梁';
    case '宫殿':
      return '宫殿宫城';
    default:
      return '未分类';
  }
};

const getSketchVariant = (item: SourceBuildingRecord, structureType: string): SketchVariant => {
  const text = `${item.name} ${item.description}`;

  switch (structureType) {
    case '土楼碉堡':
    case '围屋土楼碉楼':
      return /碉楼|碉|塔/.test(text) ? 'residence-diaolou' : 'residence-tulou';
    case '吊脚干栏':
      return 'residence-stilted';
    case '城墙城防':
      return 'office-gate';
    case '衙署公堂':
      return 'office-yamen';
    case '楼阁钟鼓':
      return 'palace-tower';
    case '府第会馆':
      return 'office-hall';
    case '仓驿设施':
      return 'office-yamen';
    case '考院学署':
      return 'office-hall';
    case '书院礼制':
      return 'office-hall';
    case '监狱设施':
      return 'office-yamen';
    case '拱桥':
      return 'bridge-arch';
    case '廊桥风雨桥':
      return 'bridge-corridor';
    case '梁桥栈道':
      return 'bridge-beam';
    case '堤闸纤道':
      return 'bridge-beam';
    case '桥群复合':
      return 'bridge-corridor';
    case '综合桥梁':
      return 'bridge-arch';
    case '王府宫苑':
      return 'palace-gate';
    case '宫殿宫城':
      return 'palace-hall';
    case '园林山庄':
      return 'palace-hall';
    case '楼台影壁':
      return 'palace-tower';
    default:
      switch (item.category) {
        case '民居':
          return 'residence-courtyard';
        case '官府':
          return 'office-yamen';
        case '宫殿':
          return 'palace-hall';
        case '桥梁':
          return 'bridge-arch';
        default:
          return 'residence-courtyard';
      }
  }
};

const getRegionFamily = (item: SourceBuildingRecord) => provinceToMacroRegion[item.province] ?? '跨区域';

const buildTags = (item: SourceBuildingRecord, structureType: string) =>
  unique([structureType, item.dynasty, item.province, item.city, item.level]).slice(0, 5);

const resolvePublicImageUrl = (url?: string) => {
  if (!url) {
    return undefined;
  }

  const normalizedBase = import.meta.env.BASE_URL ?? '/';
  return `${normalizedBase}${url.replace(/^\/+/, '')}`;
};

const paperSketchImageMap: Record<string, string> = {
  'building-1852-b868caf8': qingchengPaperSketch,
};

const buildItem = (item: SourceBuildingRecord): BuildingGalleryItem => {
  const structureType = getStructureType(item);

  return {
    id: item.id,
    name: item.name,
    dynasty: item.dynasty,
    year: item.year,
    eraLabel: item.eraLabel,
    region: `${item.province} ${item.city}`,
    summary: item.description,
    tags: buildTags(item, structureType),
    variant: getSketchVariant(item, structureType),
    structureFeature: structureType,
    regionFamily: getRegionFamily(item),
    image: resolvePublicImageUrl(buildingImageMap[item.id]),
    paperSketchImage: paperSketchImageMap[item.id] ?? (item.name === '青城古民居' ? qingchengPaperSketch : undefined),
  };
};

const buildGroupDescription = (seed: GroupSeed, items: BuildingGalleryItem[]) => {
  const years = items.map((item) => item.year);
  const dynasties = unique(items.map((item) => item.dynasty)).slice(0, 3);
  const dynastyLabel = dynasties.length ? dynasties.join('、') : '多时段';
  const yearLabel = years.length ? `${formatYear(Math.min(...years))}至${formatYear(Math.max(...years))}` : '年代待补充';

  return `${seed.description} 当前收录 ${items.length} 处样本，以 ${dynastyLabel} 为主，时间覆盖 ${yearLabel}。`;
};

const buildGroups = (sourceCategory: SourceCategory) => {
  const seedOrder = new Map(groupSeedsByCategory[sourceCategory].map((seed, index) => [seed.title, index]));
  const items = sourceBuildings
    .filter((item) => item.category === sourceCategory)
    .map(buildItem);
  const grouped = new Map<string, BuildingGalleryItem[]>();

  for (const item of items) {
    const list = grouped.get(item.structureFeature ?? '未分类') ?? [];
    list.push(item);
    grouped.set(item.structureFeature ?? '未分类', list);
  }

  return groupSeedsByCategory[sourceCategory]
    .map((seed) => {
      const groupItems = [...(grouped.get(seed.title) ?? [])].sort((left, right) => left.year - right.year);

      if (!groupItems.length) {
        return null;
      }

      return {
        id: `${categorySeeds.find((item) => item.sourceCategory === sourceCategory)?.id ?? sourceCategory}-${seed.title}`,
        title: seed.title,
        subtitle: seed.subtitle,
        description: buildGroupDescription(seed, groupItems),
        previewVariant: seed.previewVariant,
        coverImage: seed.coverImage,
        coverPosition: seed.coverPosition,
        coverSize: seed.coverSize,
        useCoverAsPoster: seed.useCoverAsPoster,
        items: groupItems,
      };
    })
    .filter((group): group is NonNullable<typeof group> => group !== null)
    .sort((left, right) => {
      const countDelta = right.items.length - left.items.length;

      if (countDelta !== 0) {
        return countDelta;
      }

      return (seedOrder.get(left.title) ?? 0) - (seedOrder.get(right.title) ?? 0);
    })
    .slice(0, 4);
};

export const buildingCatalog: BuildingCategory[] = categorySeeds.map((seed) => {
  const groups = buildGroups(seed.sourceCategory);
  const itemCount = groups.reduce((total, group) => total + group.items.length, 0);

  return {
    id: seed.id,
    title: seed.title,
    alias: seed.alias,
    english: seed.english,
    seal: seed.seal,
    summary: `${seed.summaryLead} 当前收录 ${itemCount} 处真实样本。`,
    description: seed.description,
    accent: seed.accent,
    outline: seed.outline,
    coverVariant: seed.coverVariant,
    coverImage: seed.coverImage,
    coverPosition: seed.coverPosition,
    coverSize: seed.coverSize,
    useCoverAsPoster: seed.useCoverAsPoster,
    groups,
  };
});
