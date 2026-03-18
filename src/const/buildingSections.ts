export interface BuildingSectionNavItem {
    key: 'map' | 'atlas' | 'matrix' | 'portrait' | 'qa';
    title: string;
    subtitle: string;
    path: string;
    legacyPath: string;
}

export const buildingSections: BuildingSectionNavItem[] = [
    {
        key: 'map',
        title: '营造山河',
        subtitle: '分布与时间',
        path: '/building/map',
        legacyPath: '/building-map-demo',
    },
    {
        key: 'atlas',
        title: '建筑图册',
        subtitle: '分类与谱系',
        path: '/building/atlas',
        legacyPath: '/building-section-demo',
    },
    {
        key: 'matrix',
        title: '图谱矩阵',
        subtitle: '类型与指标',
        path: '/building/matrix',
        legacyPath: '/building-dashboard-demo',
    },
    {
        key: 'portrait',
        title: '建筑画像',
        subtitle: '单体与关联',
        path: '/building/portrait',
        legacyPath: '/building-portrait-demo',
    },
    {
        key: 'qa',
        title: '问答擂台',
        subtitle: 'AI 主动出题',
        path: '/building/qa',
        legacyPath: '/building-qa-demo',
    },
];
