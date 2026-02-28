<template>
    <div class="feihua-container">
        <div class="body">
            <h1 class="title center-align">飞花擂台</h1>
            <div class="rules" v-show="compId === 0">
                <h3 class="subtitle center-align">欢迎来到飞花擂台！</h3>
                <h3 class="subtitle center-align">与诗词达人小柿子姑娘来一场酣畅淋漓的飞花令挑战吧！</h3>
                <ol class="icon-rule-list">
                    <li class="icon-rule-item">请你与小柿子轮流回答包含/描述某个意象（如山、水等）的一句诗词，意象在诗词的位置不作限制。</li>
                    <li class="icon-rule-item">双方均禁止在一局中重复回答出现过的诗词。</li>
                    <li class="icon-rule-item">
                        如若需要小柿子的帮助，可以输入<span
                            style="color: brown;">[提示]</span>，小柿子会给出一个包含指定意象的诗词作品名。<strong>注意：一局中有且仅有<span
                                style="color: brown;">3</span>次提示机会。</strong></li>
                    <li class="icon-rule-item">如若无法继续挑战，请输入<span
                            style="color: brown;">[我认输]</span>，本局游戏将结束；若你的回答违反规则，本局游戏也将结束。</li>
                </ol>
                <h3 class="subtitle center-align">若准备完毕，请点击下方按钮，抽取本局意象并开启挑战吧！</h3>
                <button class="start-button" @click="chooseImagery">开始游戏</button>
            </div>
            <div class="imagery-choose" v-show="compId === 1">
                <div class="imagery-container">
                    <img :src="currentImagery.path" :alt="currentImagery.name" class="imagery-image" />
                </div>
            </div>
            <div class="chat-comp" v-show="compId === 2">
                <ChatComp />
            </div>
        </div>
        <canvas ref="liveCanvas" class="live-canvas"></canvas>
    </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, onUnmounted, watch, onMounted } from 'vue';
import { useChatStore } from '../store/useChatStore';
import ChatComp from '@/components/ChatComp.vue';
import { chat } from '../utils/llm';

import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

import chaun from '@/assets/images/imagery/chuan.png';
import feng from '@/assets/images/imagery/feng.png';
import jiu from '@/assets/images/imagery/jiu.png';
import liu from '@/assets/images/imagery/liu.png';
import mei from '@/assets/images/imagery/mei.png';
import shan from '@/assets/images/imagery/shan.png';
import shui from '@/assets/images/imagery/shui.png';
import yan from '@/assets/images/imagery/yan.png';
import yue from '@/assets/images/imagery/yue.png';

window.PIXI = PIXI; // 为了pixi-live2d-display内部调用
let app; // 为了存储pixi实例
let model; // 为了存储live2d实例

const chatStore = useChatStore();
const compId = ref(0);
const rollCount = ref(0);
const maxRolls = 20;
const targetIndex = ref(0);
const imageries = ref([
    { name: '船', path: chaun },
    { name: '风', path: feng },
    { name: '酒', path: jiu },
    { name: '柳', path: liu },
    { name: '梅', path: mei },
    { name: '山', path: shan },
    { name: '水', path: shui },
    { name: '雁', path: yan },
    { name: '月', path: yue },
])

const currentImagery = ref(imageries.value[0]);
const liveCanvas = ref();
let currentImageIndex = 0;
let interval: number | undefined;

const chooseImagery = () => {
    compId.value = 1;
    targetIndex.value = Math.floor(Math.random() * imageries.value.length);
    rollToTarget(targetIndex.value);
}

const rollToTarget = (targetIndex: number) => {
    rollCount.value = 0;

    interval = window.setInterval(() => {
        currentImageIndex++;
        if (currentImageIndex >= imageries.value.length) {
            currentImageIndex = 0;
        }

        currentImagery.value = imageries.value[currentImageIndex];
        rollCount.value++;

        if (rollCount.value >= maxRolls) {
            window.clearInterval(interval);
            currentImagery.value = imageries.value[targetIndex];
        }
    }, 100);
};

watch(rollCount, () => {
    if (rollCount.value === maxRolls) {
        window.setTimeout(async () => {
            chatStore.messages.push({
                role: 'user',
                content: `意象抽取结果为【${imageries.value[targetIndex.value].name}】`
            });
            try {
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error('Timeout Error'));
                    }, 5000);
                });
                const res = await Promise.race([chat(chatStore.messages), timeoutPromise]);
                chatStore.messages = res.data.data;
                compId.value = 2;
            } catch (error) {
                compId.value = 0;
                ElMessage.error('请求失败，请稍后重试！');
                chatStore.messages = [];
            }
        }, 200);
    }
})

watch(compId, () => {
    localStorage.setItem('compId', compId.value.toString());
})

onMounted(async () => {
    const savedCompId = localStorage.getItem('compId');
    if (savedCompId) {
        compId.value = parseInt(savedCompId);
    }
    app = new PIXI.Application({
        view: liveCanvas.value,
        autoStart: true,
        resizeTo: window,
        backgroundAlpha: 0,
    })

    const modelPath = `${import.meta.env.BASE_URL}live2d/model/poet.model3.json`;
    model = await Live2DModel.from(modelPath);
    app.stage.addChild(model);
    model.scale.set(0.2);
})

onUnmounted(() => {
    if (interval) {
        window.clearInterval(interval);
    }
    model?.destroy();
    app?.destroy();
});
</script>

<style scoped lang="scss">
$color-primary: #3d0b0b; // 主色调
$color-secondary: #d7ab82; // 按钮颜色
$color-text: #491f1f; // 文字颜色

.feihua-container {
    width: 100%;
    height: 100%;
    flex-grow: 1;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    position: relative;
}

.live-canvas {
    position: absolute;
    bottom: 0;
    left: 2%;
    z-index: -1;
    width: 50%;
    height: 50%;
}

.body {
    width: 60%;
    height: 80vh;
    padding: 2.4rem;
    border-radius: 12px;
    background-color: transparent;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.1));

    display: flex;
    flex-direction: column;
    align-items: center;

    .title.center-align {
        margin-top: 0;
        margin-bottom: 32px;
        text-align: center;
        font-size: 3rem;
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
    }

    .imagery-choose {
        .imagery-container {
            width: 250px;
            height: 250px;
            border-radius: 50%;
            border: #cc7e63 2px solid;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
            // filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.5));
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
        height: 100%;
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
        margin: 2.5rem auto;
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
</style>
