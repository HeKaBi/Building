import axios from 'axios';

import type { IMessage } from '@/interface/llm';
import rawBuildings from '../../building.json';

export type BuildingQuizTopicId = 'dynasty' | 'region' | 'category' | 'structure' | 'landmark';
export type BuildingQuizMode = 'remote' | 'local';
type QuestionKind = 'building-name' | 'category' | 'dynasty' | 'province';

interface BuildingRecord {
  id: string;
  name: string;
  category: '民居' | '官府' | '宫殿' | '桥梁';
  structureType: string;
  dynasty: string;
  year: number;
  eraLabel: string;
  province: string;
  city: string;
  importance: number;
  description: string;
}

export interface BuildingQuizTopic {
  id: BuildingQuizTopicId;
  title: string;
  description: string;
  intro: string;
}

export interface BuildingQuizSession {
  topicId: BuildingQuizTopicId;
  round: number;
  hintUsed: number;
  currentQuestion: LocalQuizQuestion | null;
  usedQuestionIds: string[];
}

export interface BuildingQuizTurnResult {
  reply: string;
  session: BuildingQuizSession;
  mode: BuildingQuizMode;
}

interface LocalQuizQuestion {
  id: string;
  prompt: string;
  hint: string;
  explanation: string;
  acceptedValues: string[];
  kind: QuestionKind;
  sampleAnswers: string[];
}

const REMOTE_URL = import.meta.env.VITE_BUILDING_QA_URL;
const MAX_HINTS = 3;
const buildingRecords = rawBuildings as BuildingRecord[];

export const buildingQuizTopics: BuildingQuizTopic[] = [
  {
    id: 'dynasty',
    title: '朝代考场',
    description: '围绕建筑所属朝代出题。',
    intro: '这一轮我会从朝代维度出题，你可以准备好“唐、宋、元、明、清”这些时代线索。',
  },
  {
    id: 'region',
    title: '地域考场',
    description: '围绕建筑所在省份或地区出题。',
    intro: '这一轮我更关注建筑分布的地域线索，你可以多留意省份和地区信息。',
  },
  {
    id: 'category',
    title: '类型考场',
    description: '围绕民居、官府、宫殿、桥梁出题。',
    intro: '这一轮的重点是建筑类别，我会问你样本属于哪一类，或者让你举出同类代表。',
  },
  {
    id: 'structure',
    title: '结构考场',
    description: '围绕城墙、拱桥、聚落村寨等结构类型出题。',
    intro: '这一轮会更多出现结构类型，比如城墙城防、拱桥、聚落村寨、宅院府第。',
  },
  {
    id: 'landmark',
    title: '地标考场',
    description: '围绕代表性建筑样本出题。',
    intro: '这一轮我会直接拿代表建筑来考你，比如岳阳楼、安济桥、宏村古建筑群这些样本。',
  },
];

const categoryLabels = ['民居', '官府', '宫殿', '桥梁'] as const;
const prominentDynasties = ['唐', '宋', '元', '明', '清'].filter((dynasty) =>
  buildingRecords.some((item) => item.dynasty === dynasty),
);
const prominentProvinces = countBy(buildingRecords.map((item) => item.province))
  .slice(0, 8)
  .map((item) => item.label);
const prominentStructures = countBy(buildingRecords.map((item) => item.structureType))
  .slice(0, 8)
  .map((item) => item.label);
const landmarkBuildings = [...buildingRecords]
  .sort((left, right) => right.importance - left.importance || left.year - right.year)
  .slice(0, 10);

export const createBuildingQuizSession = (topicId: BuildingQuizTopicId): BuildingQuizSession => ({
  topicId,
  round: 0,
  hintUsed: 0,
  currentQuestion: null,
  usedQuestionIds: [],
});

export const createBuildingQuizOpening = async (
  topic: BuildingQuizTopic,
  session: BuildingQuizSession,
): Promise<BuildingQuizTurnResult> => {
  if (REMOTE_URL) {
    try {
      const reply = await requestRemoteQuizReply(topic, [
        {
          role: 'user',
          content: `我们开始建筑知识问答。请先用“本轮主题是【${topic.title}】。”开头欢迎我，再直接出第一题。`,
        },
      ]);

      return {
        reply,
        session: {
          ...session,
          round: session.round + 1,
          currentQuestion: null,
        },
        mode: 'remote',
      };
    } catch (error) {
      console.warn('building quiz remote opening failed, fallback to local', error);
    }
  }

  return createLocalOpening(topic, session);
};

export const submitBuildingQuizTurn = async ({
  topic,
  session,
  messages,
  answer,
}: {
  topic: BuildingQuizTopic;
  session: BuildingQuizSession;
  messages: IMessage[];
  answer: string;
}): Promise<BuildingQuizTurnResult> => {
  if (REMOTE_URL) {
    try {
      const reply = await requestRemoteQuizReply(topic, messages);
      return {
        reply,
        session: {
          ...session,
          round: session.round + 1,
        },
        mode: 'remote',
      };
    } catch (error) {
      console.warn('building quiz remote turn failed, fallback to local', error);
    }
  }

  return submitLocalTurn(topic, session, answer);
};

const createLocalOpening = (topic: BuildingQuizTopic, session: BuildingQuizSession): BuildingQuizTurnResult => {
  const prepared = prepareNextQuestion(session);
  const reply = [
    `欢迎来到建筑知识问答擂台，本轮主题是【${topic.title}】。`,
    `${topic.intro}输入[提示]可以拿线索，输入[我不会]可以直接看答案并切到下一题。`,
    `第一题：${prepared.question.prompt}`,
  ].join('\n\n');

  return {
    reply,
    session: prepared.session,
    mode: 'local',
  };
};

const submitLocalTurn = (
  topic: BuildingQuizTopic,
  session: BuildingQuizSession,
  answer: string,
): BuildingQuizTurnResult => {
  if (!session.currentQuestion) {
    const reopened = createLocalOpening(topic, session);
    return {
      reply: `这一轮先切回本地题库继续。\n\n${reopened.reply}`,
      session: reopened.session,
      mode: 'local',
    };
  }

  const currentQuestion = session.currentQuestion;
  const trimmedAnswer = answer.trim();

  if (trimmedAnswer === '[提示]') {
    if (session.hintUsed >= MAX_HINTS) {
      return {
        reply: `提示次数已经用完啦。本题继续：${currentQuestion.prompt}`,
        session,
        mode: 'local',
      };
    }

    return {
      reply: `给你一个提示：${currentQuestion.hint}\n\n请继续回答这一题：${currentQuestion.prompt}`,
      session: {
        ...session,
        hintUsed: session.hintUsed + 1,
      },
      mode: 'local',
    };
  }

  if (trimmedAnswer === '[我不会]' || trimmedAnswer === '[下一题]') {
    const next = prepareNextQuestion({
      ...session,
      currentQuestion: null,
    });

    return {
      reply: [
        `这题先公布一个可接受答案：${currentQuestion.sampleAnswers[0]}。`,
        currentQuestion.explanation,
        `下一题：${next.question.prompt}`,
      ].join('\n\n'),
      session: next.session,
      mode: 'local',
    };
  }

  const matchedValue = findMatchedValue(trimmedAnswer, currentQuestion);
  const next = prepareNextQuestion({
    ...session,
    currentQuestion: null,
  });

  if (matchedValue) {
    return {
      reply: [
        `答得不错，你的回答命中了【${matchedValue}】。`,
        currentQuestion.explanation,
        `下一题：${next.question.prompt}`,
      ].join('\n\n'),
      session: next.session,
      mode: 'local',
    };
  }

  return {
    reply: [
      `这一题更合适的答案可以是：${currentQuestion.sampleAnswers.join('、')}。`,
      currentQuestion.explanation,
      `下一题：${next.question.prompt}`,
    ].join('\n\n'),
    session: next.session,
    mode: 'local',
  };
};

const prepareNextQuestion = (session: BuildingQuizSession) => {
  const pool = questionPools[session.topicId];
  const usedSet = new Set(session.usedQuestionIds);

  if (usedSet.size >= pool.length) {
    usedSet.clear();
  }

  const candidates = pool.filter((question) => !usedSet.has(question.id));
  const nextQuestion = candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];
  usedSet.add(nextQuestion.id);

  return {
    question: nextQuestion,
    session: {
      ...session,
      round: session.round + 1,
      currentQuestion: nextQuestion,
      usedQuestionIds: [...usedSet],
    },
  };
};

const requestRemoteQuizReply = async (topic: BuildingQuizTopic, messages: IMessage[]) => {
  const response = await axios.post(
    REMOTE_URL as string,
    {
      messages: buildRemoteMessages(topic, messages),
      mode: 'building-quiz',
      topic: topic.title,
    },
    {
      timeout: 15000,
    },
  );

  return extractRemoteReply(response.data) ?? '这一轮没有成功拿到模型回复，你可以再试一次。';
};

const buildRemoteMessages = (topic: BuildingQuizTopic, messages: IMessage[]): IMessage[] => {
  const contextLines = buildTopicContext(topic.id)
    .slice(0, 6)
    .map(
      (item, index) =>
        `${index + 1}. ${item.name}｜${item.category}｜${item.eraLabel}｜${normalizeProvince(item.province)}｜${item.structureType}`,
    );

  return [
    {
      role: 'system',
      content: [
        '你是“营造小柿”，正在进行建筑知识问答擂台。',
        '你的任务是主动出题，一次只出一道题。',
        '当用户回答后，你要先判断大体是否正确，再用简洁中文点评或补充，然后继续出下一题。',
        '当用户输入[提示]时，给一条线索但不要直接说出完整答案。',
        '当用户输入[我不会]或[下一题]时，给出一个可接受答案，再继续下一题。',
        `当前主题：${topic.title}。${topic.description}`,
        '不要编造不存在于当前样本上下文中的建筑信息。',
        '当前可用样本：',
        ...(contextLines.length > 0 ? contextLines : ['暂无更多样本上下文。']),
      ].join('\n'),
    },
    ...messages.slice(-10),
  ];
};

const extractRemoteReply = (payload: any): string | null => {
  if (!payload) return null;
  if (typeof payload === 'string') return payload.trim() || null;
  if (typeof payload.reply === 'string') return payload.reply.trim() || null;
  if (typeof payload.content === 'string') return payload.content.trim() || null;
  if (typeof payload.data === 'string') return payload.data.trim() || null;
  if (typeof payload.data?.reply === 'string') return payload.data.reply.trim() || null;
  if (typeof payload.data?.content === 'string') return payload.data.content.trim() || null;

  if (Array.isArray(payload.data)) {
    const assistantMessage = [...payload.data]
      .reverse()
      .find((item) => item?.role === 'assistant' && typeof item?.content === 'string');
    return assistantMessage?.content?.trim() || null;
  }

  if (Array.isArray(payload.choices)) {
    const content = payload.choices[0]?.message?.content ?? payload.choices[0]?.delta?.content;
    return typeof content === 'string' ? content.trim() || null : null;
  }

  return null;
};

const findMatchedValue = (answer: string, question: LocalQuizQuestion) => {
  const normalizedAnswer = normalizeText(answer);
  const matched = question.acceptedValues.find((value) => normalizedAnswer.includes(normalizeText(value)));
  return matched ?? null;
};

const buildDynastyQuestions = () => {
  const sampleQuestions: LocalQuizQuestion[] = prominentDynasties.map((dynasty) => {
    const items = pickRepresentativeBuildings(buildingRecords.filter((item) => item.dynasty === dynasty), 4);
    const sampleAnswers = items.map((item) => item.name);
    return {
      id: `dynasty-sample-${dynasty}`,
      prompt: `请说出一座属于${dynasty}代的建筑样本。`,
      hint: `比如“${sampleAnswers[0]}”就在这一朝代样本里。`,
      explanation: `只要答出样本库里任意一座${dynasty}代建筑即可，例如${sampleAnswers.join('、')}。`,
      acceptedValues: buildingRecords.filter((item) => item.dynasty === dynasty).map((item) => item.name),
      kind: 'building-name',
      sampleAnswers,
    };
  });

  const identifyQuestions = pickRepresentativeBuildings(
    buildingRecords.filter((item) => prominentDynasties.includes(item.dynasty)),
    8,
  ).map((item) => ({
    id: `dynasty-identify-${item.id}`,
    prompt: `请问【${item.name}】主要归入哪个朝代？`,
    hint: `它的时代标注是“${item.eraLabel}”。`,
    explanation: `${item.name}在当前样本库里的朝代归类是${item.dynasty}，时代标注为${item.eraLabel}。`,
    acceptedValues: [item.dynasty],
    kind: 'dynasty',
    sampleAnswers: [item.dynasty],
  }));

  return [...sampleQuestions, ...identifyQuestions];
};

const buildRegionQuestions = () => {
  const sampleQuestions: LocalQuizQuestion[] = prominentProvinces.map((province) => {
    const items = pickRepresentativeBuildings(buildingRecords.filter((item) => item.province === province), 4);
    const sampleAnswers = items.map((item) => item.name);
    return {
      id: `region-sample-${province}`,
      prompt: `请说出一座位于${province}的建筑样本。`,
      hint: `这一省份的样本中，${sampleAnswers[0]}比较典型。`,
      explanation: `样本库里位于${province}的建筑不少，例如${sampleAnswers.join('、')}。`,
      acceptedValues: buildingRecords.filter((item) => item.province === province).map((item) => item.name),
      kind: 'building-name',
      sampleAnswers,
    };
  });

  const identifyQuestions = pickRepresentativeBuildings(
    buildingRecords.filter((item) => prominentProvinces.includes(item.province)),
    8,
  ).map((item) => ({
    id: `region-identify-${item.id}`,
    prompt: `请问【${item.name}】位于哪个省级地区？`,
    hint: `它所在城市是${item.city}。`,
    explanation: `${item.name}位于${item.province}，城市标注为${item.city}。`,
    acceptedValues: [item.province, normalizeProvince(item.province)],
    kind: 'province',
    sampleAnswers: [item.province],
  }));

  return [...sampleQuestions, ...identifyQuestions];
};

const buildCategoryQuestions = () => {
  const sampleQuestions: LocalQuizQuestion[] = categoryLabels.map((category) => {
    const items = pickRepresentativeBuildings(buildingRecords.filter((item) => item.category === category), 4);
    const sampleAnswers = items.map((item) => item.name);
    return {
      id: `category-sample-${category}`,
      prompt: `请说出一座${category}类建筑样本。`,
      hint: `比如“${sampleAnswers[0]}”就属于${category}类。`,
      explanation: `只要答出样本库中任意一座${category}类建筑即可，例如${sampleAnswers.join('、')}。`,
      acceptedValues: buildingRecords.filter((item) => item.category === category).map((item) => item.name),
      kind: 'building-name',
      sampleAnswers,
    };
  });

  const identifyQuestions = pickRepresentativeBuildings(buildingRecords, 10).map((item) => ({
    id: `category-identify-${item.id}`,
    prompt: `请问【${item.name}】属于哪一类建筑？`,
    hint: `它的结构类型是“${item.structureType}”。`,
    explanation: `${item.name}在样本库中被归为${item.category}类建筑。`,
    acceptedValues: [item.category],
    kind: 'category',
    sampleAnswers: [item.category],
  }));

  return [...sampleQuestions, ...identifyQuestions];
};

const buildStructureQuestions = () => {
  const structureSampleQuestions: LocalQuizQuestion[] = prominentStructures.map((structureType) => {
    const items = pickRepresentativeBuildings(buildingRecords.filter((item) => item.structureType === structureType), 4);
    const sampleAnswers = items.map((item) => item.name);
    return {
      id: `structure-sample-${structureType}`,
      prompt: `请说出一座结构类型属于“${structureType}”的建筑样本。`,
      hint: `比如“${sampleAnswers[0]}”就在这个结构类型里。`,
      explanation: `这一结构类型下的代表样本包括${sampleAnswers.join('、')}。`,
      acceptedValues: buildingRecords.filter((item) => item.structureType === structureType).map((item) => item.name),
      kind: 'building-name',
      sampleAnswers,
    };
  });

  const identifyQuestions = pickRepresentativeBuildings(
    buildingRecords.filter((item) => prominentStructures.includes(item.structureType)),
    8,
  ).map((item) => ({
    id: `structure-identify-${item.id}`,
    prompt: `请问【${item.name}】的结构类型是什么？`,
    hint: `它属于${item.category}类建筑。`,
    explanation: `${item.name}在样本库中的结构类型标注为“${item.structureType}”。`,
    acceptedValues: [item.structureType],
    kind: 'category',
    sampleAnswers: [item.structureType],
  }));

  return [...structureSampleQuestions, ...identifyQuestions];
};

const buildLandmarkQuestions = () =>
  landmarkBuildings.flatMap<LocalQuizQuestion>((item) => [
    {
      id: `landmark-category-${item.id}`,
      prompt: `请问【${item.name}】属于哪一类建筑？`,
      hint: `它的结构类型是“${item.structureType}”。`,
      explanation: `${item.name}属于${item.category}类建筑，时代标注为${item.eraLabel}。`,
      acceptedValues: [item.category],
      kind: 'category',
      sampleAnswers: [item.category],
    },
    {
      id: `landmark-province-${item.id}`,
      prompt: `请问【${item.name}】位于哪个省级地区？`,
      hint: `它的城市标注是${item.city}。`,
      explanation: `${item.name}位于${item.province}。`,
      acceptedValues: [item.province, normalizeProvince(item.province)],
      kind: 'province',
      sampleAnswers: [item.province],
    },
  ]);

const questionPools: Record<BuildingQuizTopicId, LocalQuizQuestion[]> = {
  dynasty: buildDynastyQuestions(),
  region: buildRegionQuestions(),
  category: buildCategoryQuestions(),
  structure: buildStructureQuestions(),
  landmark: buildLandmarkQuestions(),
};

const buildTopicContext = (topicId: BuildingQuizTopicId) => {
  if (topicId === 'dynasty') {
    return pickRepresentativeBuildings(
      buildingRecords.filter((item) => prominentDynasties.includes(item.dynasty)),
      8,
    );
  }

  if (topicId === 'region') {
    return pickRepresentativeBuildings(
      buildingRecords.filter((item) => prominentProvinces.includes(item.province)),
      8,
    );
  }

  if (topicId === 'category') {
    return pickRepresentativeBuildings(buildingRecords, 8);
  }

  if (topicId === 'structure') {
    return pickRepresentativeBuildings(
      buildingRecords.filter((item) => prominentStructures.includes(item.structureType)),
      8,
    );
  }

  return landmarkBuildings;
};

function pickRepresentativeBuildings(items: BuildingRecord[], count: number) {
  return [...items]
    .sort((left, right) => right.importance - left.importance || left.year - right.year)
    .slice(0, count);
}

function countBy(values: string[]) {
  const counter = new Map<string, number>();
  values.forEach((value) => {
    counter.set(value, (counter.get(value) ?? 0) + 1);
  });

  return [...counter.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-Hans-CN'))
    .map(([label, count]) => ({ label, count }));
}

function normalizeProvince(province: string) {
  return province
    .replace(/省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区/g, '')
    .trim();
}

function normalizeText(text: string) {
  return text.replace(/[\s，。！？；：、“”‘’（）()【】\[\]·\-]/g, '').toLowerCase();
}
