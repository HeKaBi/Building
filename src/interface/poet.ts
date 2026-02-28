export interface INode {
    name: string;
    isCenter?: boolean;
}

export interface ILink {
    source: string;
    target: string;
    name: string[];
    lineStyle: any;
}

export interface IPoet {
    ChineseName: string;
    EnglishName: string;
    Gender: string;
    YearBirth: string;
    EraBirth: string;
    EraYearBirth: string;
    YearDeath: string;
    EraDeath: string;
    EraYearDeath: string;
    Address: string;
    avatar: string;
    desc: string;
}