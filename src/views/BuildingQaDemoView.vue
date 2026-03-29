<template>
    <div class="feihua-container">
        <div class="body">
            <h1 class="title center-align">建筑问答擂台</h1>

            <div class="rules" v-show="compId === 0">
                <h3 class="subtitle center-align">欢迎来到建筑问答擂台！</h3>
                <h3 class="subtitle center-align">与营造小柿来一场酣畅淋漓的建筑知识问答挑战吧！</h3>
                <ol class="icon-rule-list">
                    <li class="icon-rule-item">请你根据本轮抽取的建筑主题，回答营造小柿提出的建筑知识问题，题目会持续围绕样本库展开。</li>
                    <li class="icon-rule-item">每一轮都由营造小柿先出题，你只需要直接输入答案即可。</li>
                    <li class="icon-rule-item">
                        如若需要营造小柿的帮助，可以输入<span
                            style="color: brown;">[提示]</span>，营造小柿会给出一条答题线索。<strong>注意：一局中有且仅有<span
                                style="color: brown;">3</span>次提示机会。</strong>
                    </li>
                    <li class="icon-rule-item">
                        如若无法继续作答，可以输入<span
                            style="color: brown;">[我不会]</span>，本题会公布一个可接受答案并继续下一题；若想直接跳题，也可以输入<span
                            style="color: brown;">[下一题]</span>。
                    </li>
                </ol>
                <h3 class="subtitle center-align">若准备完毕，请点击下方按钮，抽取本轮主题并开启挑战吧！</h3>
                <button class="start-button" @click="chooseTopic">开始游戏</button>
            </div>

            <div class="imagery-choose" v-show="compId === 1">
                <div class="imagery-container">
                    <img :src="currentTopic.cover" :alt="currentTopic.title" class="imagery-image" />
                </div>
            </div>

            <div class="chat-comp" v-show="compId === 2">
                <BuildingQuizComp
                    :messages="messages"
                    :pending="pending"
                    placeholder="输入你的回答"
                    assistant-name="营造小柿"
                    @send="handleSend"
                    @reset="resetQuiz"
                />
            </div>
        </div>

        <canvas ref="liveCanvas" class="live-canvas"></canvas>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

import BuildingQuizComp from '@/components/BuildingQuizComp.vue';
import type { IMessage } from '@/interface/llm';
import {
    buildingQuizTopics,
    createBuildingQuizOpening,
    createBuildingQuizSession,
    submitBuildingQuizTurn,
    type BuildingQuizSession,
    type BuildingQuizTopic,
} from '@/utils/buildingQuiz';

import bridgeCover from '@/assets/images/building-covers/bridge-cover.png';
import landmarkCover from '@/assets/images/building-covers/palace-group-palace-city.png';
import officeCover from '@/assets/images/building-covers/office-cover.png';
import palaceCover from '@/assets/images/building-covers/palace-cover.png';
import residenceCover from '@/assets/images/building-covers/residence-cover.png';

type TopicCard = BuildingQuizTopic & { cover: string };

(window as Window & { PIXI?: typeof PIXI }).PIXI = PIXI;

const topicCovers: Record<BuildingQuizTopic['id'], string> = {
    dynasty: palaceCover,
    region: residenceCover,
    category: officeCover,
    structure: bridgeCover,
    landmark: landmarkCover,
};

const topics: TopicCard[] = buildingQuizTopics.map((topic) => ({
    ...topic,
    cover: topicCovers[topic.id],
}));

const compId = ref(0);
const rollCount = ref(0);
const maxRolls = 20;
const targetIndex = ref(0);
const currentTopic = ref<TopicCard>(topics[0]);
const activeTopic = ref<TopicCard | null>(null);
const messages = ref<IMessage[]>([]);
const pending = ref(false);
const liveCanvas = ref<HTMLCanvasElement | null>(null);

let currentTopicIndex = 0;
let interval: number | undefined;
let app: PIXI.Application | null = null;
let model: Live2DModel | null = null;
let session: BuildingQuizSession = createBuildingQuizSession(topics[0].id);

const chooseTopic = () => {
    if (pending.value) return;
    compId.value = 1;
    targetIndex.value = Math.floor(Math.random() * topics.length);
    rollToTarget(targetIndex.value);
};

const rollToTarget = (nextIndex: number) => {
    rollCount.value = 0;
    if (interval) {
        window.clearInterval(interval);
    }

    interval = window.setInterval(() => {
        currentTopicIndex += 1;
        if (currentTopicIndex >= topics.length) {
            currentTopicIndex = 0;
        }

        currentTopic.value = topics[currentTopicIndex];
        rollCount.value += 1;

        if (rollCount.value >= maxRolls) {
            window.clearInterval(interval);
            currentTopic.value = topics[nextIndex];
        }
    }, 100);
};

const startQuiz = async (topic: TopicCard) => {
    activeTopic.value = topic;
    session = createBuildingQuizSession(topic.id);
    messages.value = [];
    pending.value = true;

    try {
        const result = await createBuildingQuizOpening(topic, session);
        session = result.session;
        messages.value = [
            {
                role: 'assistant',
                content: result.reply,
            },
        ];
        compId.value = 2;
    } catch (error) {
        console.error('failed to start building quiz', error);
        resetQuiz();
    } finally {
        pending.value = false;
    }
};

const handleSend = async (answer: string) => {
    if (!activeTopic.value || pending.value) return;

    const userMessage: IMessage = {
        role: 'user',
        content: answer,
    };

    messages.value = [...messages.value, userMessage];
    pending.value = true;

    try {
        const result = await submitBuildingQuizTurn({
            topic: activeTopic.value,
            session,
            messages: messages.value,
            answer,
        });

        session = result.session;
        messages.value = [
            ...messages.value,
            {
                role: 'assistant',
                content: result.reply,
            },
        ];
    } catch (error) {
        console.error('failed to continue building quiz', error);
        messages.value = [
            ...messages.value,
            {
                role: 'assistant',
                content: '这一轮出题暂时失败了，你可以再发一次答案，或者点击“重新挑战”重新开始。',
            },
        ];
    } finally {
        pending.value = false;
    }
};

const resetQuiz = () => {
    if (interval) {
        window.clearInterval(interval);
        interval = undefined;
    }

    compId.value = 0;
    rollCount.value = 0;
    currentTopicIndex = 0;
    currentTopic.value = topics[0];
    activeTopic.value = null;
    messages.value = [];
    pending.value = false;
    session = createBuildingQuizSession(topics[0].id);
};

watch(rollCount, async () => {
    if (rollCount.value === maxRolls) {
        window.setTimeout(async () => {
            await startQuiz(topics[targetIndex.value]);
        }, 220);
    }
});

onMounted(async () => {
    app = new PIXI.Application({
        view: liveCanvas.value ?? undefined,
        autoStart: true,
        resizeTo: window,
        backgroundAlpha: 0,
    });

    const modelPath = `${import.meta.env.BASE_URL}live2d/model/poet.model3.json`;
    model = await Live2DModel.from(modelPath);
    app.stage.addChild(model);
    model.scale.set(0.2);
});

onUnmounted(() => {
    if (interval) {
        window.clearInterval(interval);
    }

    model?.destroy();
    app?.destroy();
});
</script>

<style scoped lang="scss">
$color-primary: #3d0b0b;
$color-secondary: #d7ab82;
$color-text: #491f1f;

.feihua-container {
    width: 100%;
    height: 100%;
    flex-grow: 1;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: hidden;
    background:
        linear-gradient(180deg, rgba(242, 234, 219, 0.98), rgba(232, 223, 208, 0.98)),
        linear-gradient(90deg, rgba(255, 255, 255, 0.14), transparent 28%, transparent 72%, rgba(255, 255, 255, 0.12));
}

.feihua-container::before,
.feihua-container::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.feihua-container::before {
    z-index: 0;
    background:
        radial-gradient(circle at 16% 14%, rgba(255, 255, 255, 0.32), transparent 18%),
        radial-gradient(circle at 78% 18%, rgba(255, 255, 255, 0.22), transparent 20%),
        repeating-linear-gradient(
            135deg,
            rgba(124, 96, 76, 0.03) 0,
            rgba(124, 96, 76, 0.03) 1px,
            transparent 1px,
            transparent 14px
        );
}

.feihua-container::after {
    z-index: 0;
    opacity: 0.2;
    background:
        radial-gradient(circle at 34% 44%, rgba(128, 96, 77, 0.1), transparent 22%),
        radial-gradient(circle at 70% 58%, rgba(128, 96, 77, 0.08), transparent 24%);
}

.live-canvas {
    position: absolute;
    bottom: 0;
    left: 2%;
    z-index: 1;
    width: 50%;
    height: 50%;
    pointer-events: none;
}

.body {
    position: relative;
    z-index: 2;
    width: clamp(980px, 62vw, 1120px);
    max-width: calc(100vw - 96px);
    height: min(80vh, 780px);
    padding: 2rem 2.4rem 2.2rem;
    border-radius: 24px;
    border: 1px solid rgba(147, 116, 93, 0.16);
    background:
        linear-gradient(180deg, rgba(244, 236, 224, 0.86), rgba(236, 227, 211, 0.82)),
        radial-gradient(circle at top, rgba(255, 255, 255, 0.24), transparent 42%);
    box-shadow: 0 20px 44px rgba(72, 52, 40, 0.12);
    backdrop-filter: blur(6px);

    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    overflow: hidden;

    .title.center-align {
        flex-shrink: 0;
        margin-top: 0;
        margin-bottom: 20px;
        text-align: center;
        font-size: 2.7rem;
        font-family: 'ContentFont';
        color: $color-primary;
        border-bottom: 2px solid rgba(0, 0, 0, 0.1);
    }

    .subtitle.center-align {
        text-align: center;
        font-size: 1.5rem;
        padding: 0;
        margin: 4px;
        color: $color-text;
        font-family: 'ContentFont';
    }

    .rules {
        width: 95%;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding-right: 0.35rem;
    }

    .imagery-choose {
        width: 100%;
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        .imagery-container {
            width: 250px;
            height: 250px;
            border-radius: 50%;
            border: #cc7e63 2px solid;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            transition: transform 0.3s ease-in-out;

            .imagery-image {
                width: 100%;
                height: 100%;
                object-fit: fill;
            }
        }
    }

    .chat-comp {
        width: 100%;
        flex: 1;
        min-height: 0;
    }

    .icon-rule-list {
        padding-left: 1.5rem;
        list-style-type: none;

        .icon-rule-item {
            font-size: 1.35rem;
            font-weight: 600;
            font-family: 'ContentFont';
            color: $color-text;
            padding: 1rem;
            position: relative;

            &:before {
                content: "🪭";
                position: absolute;
                top: 50%;
                left: -1rem;
                transform: translateY(-50%);
                font-size: 1.25rem;
                color: $color-primary;
                font-weight: bold;
            }
        }
    }

    .start-button {
        display: block;
        width: 80%;
        margin: 2rem auto 0;
        padding: 1rem;
        font-family: 'ContentFont';
        background-color: $color-secondary;
        color: #ffffff;
        font-size: 1.8rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.3s;

        &:hover {
            background-color: #cc7e63;
        }
    }
}

@media (max-width: 1080px) {
    .body {
        width: calc(100vw - 56px);
        height: min(80vh, 720px);
        padding: 1.7rem 1.8rem 1.9rem;
    }

    .live-canvas {
        width: 48%;
        height: 52%;
    }
}

@media (max-width: 780px) {
    .live-canvas {
        width: 58%;
        height: 36%;
        left: -4%;
    }

    .body {
        width: calc(100vw - 24px);
        height: calc(100vh - 28px);
        padding: 1.2rem 1rem;
        border-radius: 18px;

        .title.center-align {
            font-size: 2rem;
            margin-bottom: 18px;
        }

        .subtitle.center-align,
        .icon-rule-list .icon-rule-item {
            font-size: 1rem;
        }

        .imagery-choose .imagery-container {
            width: 220px;
            height: 220px;
        }

        .start-button {
            width: 92%;
            font-size: 1.35rem;
        }
    }
}
</style>
