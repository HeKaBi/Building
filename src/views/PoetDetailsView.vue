<template>
    <div class="poet-details">
        <div class="left" id="poet-details-left">
            <button class="tour-button" @click="startTour">界面导引</button>
            <div class="search-box">
                <input type="text" class="poet-search" placeholder="请输入诗人姓名" v-model="poetName"
                    @keypress.enter="queryPoet">
                <el-button circle type="warning" :icon="Search" @click="queryPoet"></el-button>
            </div>
            <PoetCardComp :avatar="poetInfo?.avatar" :name="poetInfo?.ChineseName" :gender="poetInfo?.Gender"
                :address="poetInfo?.Address" :YearBirth="poetInfo?.YearBirth" :YearDeath="poetInfo?.YearDeath"
                :desc="poetInfo?.desc" :dynasty="dynasty"/>
            <div class="imagery-emotion">
                <div class="imagery">
                    <div class="chart-title">诗词意象占比图</div>
                    <ImageryPieComp :data="poetImagery" />
                </div>
                <div class="word">
                    <div class="chart-title">诗词频次词云图</div>
                    <WordCloudComp :words="selectedWordCloudWords" :title="false" />
                </div>
                <div class="emotion">
                    <div class="chart-title">诗词情感雷达图</div>
                    <EmotionRadarComp :indicator="poetEmotionIndicator" :value="poetEmotionValue" />
                </div>
            </div>
        </div>
        <div class="right" id="poet-details-right">
            <div class="friend-chart-title">{{ selectedName }}的“朋友圈”</div>
            <PersonalNetworkComp :nodes="poetNodes" :links="poetLinks" />
        </div>
        <div class="tour-comp" v-if="tourVisible" :style="{ bottom: `${tourSteps[currentIndex]['tour_bottom']}%` }">
            <TourComp :content="currentIntro" :stepCount="tourSteps.length" v-model="currentIndex"
                :left="tourSteps[currentIndex].left" :bottom="tourSteps[currentIndex].bottom" />
        </div>

        <el-tour id="el-tour" v-model="tourVisible" :z-index="3000" v-model:current="currentIndex">
            <el-tour-step v-for="(step, index) in tourSteps" :key="index" :target="step.target"
                :placement="step.placement">
                <template #header style="display: none;"></template>
            </el-tour-step>
            <template #indicators="{ }">
                <span></span>
            </template>
        </el-tour>
    </div>
</template>

<script setup lang='ts'>
// @ts-nocheck
import PoetCardComp from '@/components/PoetCardComp.vue'
import EmotionRadarComp from '@/components/EmotionRadarComp.vue'

import tangLink from '@/assets/data/tang/links_with_name.json'
import songLink from '@/assets/data/song/links_with_name.json'
import yuanLink from '@/assets/data/yuan/links_with_name.json'

import tangPoetInfo from '@/assets/data/tang/poet_basic_info.json'
import songPoetInfo from '@/assets/data/song/poet_basic_info.json'
import yuanPoetInfo from '@/assets/data/yuan/poet_basic_info.json'

import tangPoetEmotion from '@/assets/data/tang/emotion_poet.json'
import songPoetEmotion from '@/assets/data/song/emotion_poet.json'
import yuanPoetEmotion from '@/assets/data/yuan/emotion_poet.json'

import tangImagery from '@/assets/data/tang/imagery.json'
import songImagery from '@/assets/data/song/imagery.json'
import yuanImagery from '@/assets/data/yuan/imagery.json'

import wordCountDetails from '@/assets/data/word_cloud_details.json'

import { Search } from '@element-plus/icons-vue'
import { onMounted, ref, watch, onBeforeUnmount } from 'vue'
import type { ILink, INode, IPoet } from '../interface/poet'
import CONST from '../const'

let tangPoets = Object.keys(tangPoetInfo);
let songPoets = Object.keys(songPoetInfo);
let yuanPoets = Object.keys(yuanPoetInfo);
let wordPoets = Object.keys(wordCountDetails);

const poetName = ref('李白');
const dynasty = ref('唐朝');
const poetInfo = ref<IPoet>(CONST.DEFAULT_POET);
const poetEmotionIndicator = ref<Array<any>>([]);
const poetEmotionValue = ref<Array<any>>([]);
const poetImagery = ref<Array<any>>([]);
const poetNodes = ref<Array<INode>>([]);
const poetLinks = ref<Array<ILink>>([]);
const selectedWordCloudWords = ref<Array<any>>([]);
const selectedName = ref('');

const preprocessNetworkData = (info: Array) => {
    let tempNodes = new Set();
    tempNodes.add(poetName.value);
    for (let i = 0; i < info.length; i++) {
        if (info[i]['source'] === poetName.value && info[i]['target'] !== poetName.value) {
            tempNodes.add(info[i]['target']);
            let flag = false;
            for (let j = 0; j < poetLinks.value.length; j++) {
                if (poetLinks.value[j]['source'] === poetName.value && poetLinks.value[j]['target'] === info[i]['target']) {
                    flag = true;
                    poetLinks.value[j]['name'].push(info[i]['name']);
                    break;
                }
            }
            if (!flag) {
                poetLinks.value.push({
                    source: poetName.value,
                    target: info[i]['target'],
                    name: [info[i]['name']]
                })
            }
        }
    }
    for (let node of tempNodes) {
        poetNodes.value.push({
            name: node,
            isCenter: node === poetName.value
        })
    }
    // 对于非poetName的节点，看看是否有边的两个节点是位于tempNodes的节点，有则将边加入poetLinks
    // for (let i = 0; i < info.length; i++) {
    //     if (info[i]['source'] !== poetName.value && info[i]['target'] !== poetName.value) {
    //         if (tempNodes.has(info[i]['source']) && tempNodes.has(info[i]['target'])) {
    //             let flag = false;
    //             for (let j = 0; j < poetLinks.value.length; j++) {
    //                 if (poetLinks.value[j]['source'] === info[i]['source'] && poetLinks.value[j]['target'] === info[i]['target']) {
    //                     flag = true;
    //                     poetLinks.value[j]['name'].push(info[i]['name']);
    //                     break;
    //                 }
    //             }
    //             if (!flag) {
    //                 poetLinks.value.push({
    //                     source: info[i]['source'],
    //                     target: info[i]['target'],
    //                     name: [info[i]['name']],
    //                     lineStyle: {
    //                         width: Math.random() * 2 + 0.1,
    //                         opacity: Math.random() * 0.5 + 0.01
    //                     }
    //                 })
    //             }
    //         }
    //     }
    // }
}

const queryPoet = () => {
    poetEmotionIndicator.value = [];
    poetEmotionValue.value = [];
    poetNodes.value = [];
    poetLinks.value = [];
    if (poetName.value.length === 0) {
        // @ts-ignore
        ElMessage.warning('请输入诗人姓名');
        return;
    }
    selectedName.value = poetName.value;
    if (wordPoets.includes(poetName.value)) {
        selectedWordCloudWords.value = wordCountDetails[poetName.value];
    }
    if (tangPoets.includes(poetName.value)) {
        dynasty.value = '唐朝';
        poetInfo.value = tangPoetInfo[poetName.value];  // 诗人基本信息
        if (Object.keys(tangPoetEmotion).includes(poetName.value)) {   // 诗人诗词情感信息
            let emotion = tangPoetEmotion[poetName.value]['emotion'];
            let maxVal = Math.max(...emotion.map((item: any) => item['value']));
            for (let i = 0; i < emotion.length; i++) {
                poetEmotionIndicator.value.push({
                    name: emotion[i]['name'],
                    max: maxVal + 1
                });
                poetEmotionValue.value.push(emotion[i]['value']);
            }
        }
        if (Object.keys(tangImagery).includes(poetName.value)) { // 诗人诗词意象信息
            poetImagery.value = tangImagery[poetName.value];
        }
        preprocessNetworkData(tangLink);
    }
    else if (songPoets.includes(poetName.value)) {
        dynasty.value = '宋朝';
        poetInfo.value = songPoetInfo[poetName.value];
        if (Object.keys(songPoetEmotion).includes(poetName.value)) {   // 诗人诗词情感信息
            let emotion = songPoetEmotion[poetName.value]['emotion'];
            let maxVal = Math.max(...emotion.map((item: any) => item['value']));
            for (let i = 0; i < emotion.length; i++) {
                poetEmotionIndicator.value.push({
                    text: emotion[i]['name'],
                    max: maxVal + 1
                });
                poetEmotionValue.value.push(emotion[i]['value']);
            }
        }
        if (Object.keys(songImagery).includes(poetName.value)) { // 诗人诗词意象信息
            poetImagery.value = songImagery[poetName.value];
        }
        preprocessNetworkData(songLink);
    }
    else if (yuanPoets.includes(poetName.value)) {
        dynasty.value = '元朝';
        poetInfo.value = yuanPoetInfo[poetName.value];
        if (Object.keys(yuanPoetEmotion).includes(poetName.value)) {   // 诗人诗词情感信息
            let emotion = yuanPoetEmotion[poetName.value]['emotion'];
            let maxVal = Math.max(...emotion.map((item: any) => item['value']));

            for (let i = 0; i < emotion.length; i++) {
                poetEmotionIndicator.value.push({
                    name: emotion[i]['name'],
                    value: maxVal + 1
                });
                poetEmotionValue.value.push(emotion[i]['value']);
            }
        }
        if (Object.keys(yuanImagery).includes(poetName.value)) { // 诗人诗词意象信息
            poetImagery.value = yuanImagery[poetName.value];
        }
        preprocessNetworkData(yuanLink);
    }
}

onMounted(() => {
    queryPoet();
})

// 引导相关
const tourVisible = ref(false);
const currentIndex = ref(0);
const currentIntro = ref('');

import PoetDetailsJson from "@/assets/tour/PoetDetailsView.json"
// 引导步骤
const tourSteps = ref(Array.from(PoetDetailsJson));

// 监听引导步骤修改引导话语
watch(currentIndex, () => {
    if (currentIndex.value === tourSteps.value.length) {
        tourVisible.value = false;
        currentIndex.value = 0;
        return;
    }
    // @ts-ignore
    currentIntro.value = tourSteps.value[currentIndex.value]["content"];
}, {
    immediate: true
})

// 开始引导
const startTour = () => {
    tourVisible.value = true;
};

onBeforeUnmount(() => {
    tourVisible.value = false;
});
</script>

<style scope lang="scss">
.poet-details {
    width: 100%;
    height: 98%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    margin-top: 8px;
    position: relative;

    .left {
        width: 60%;
        height: 95%;
        display: flex;
        margin-top: 8px;
        position: relative;
        flex-direction: column;
        align-items: center;

        .search-box {
            width: 65%;
            display: flex;
            flex-direction: row;
            align-items: center;

            input {
                font-family: 'ContentFont';
                font-size: 18px;
            }

            .poet-search {
                flex: 9;
                margin-right: 8px;
                border: 2px solid #ddb16f;
                border-radius: 8px;
                padding: 8px;
                background: transparent;

                &:focus {
                    outline: none;
                    border: 2px solid #ddb16f;
                }
            }

            .poet-search-button {
                flex: 1;
            }
        }

        .imagery-emotion {
            width: 95%;
            height: 40vh;
            display: flex;
            flex-direction: row;
            align-items: center;

            .imagery {
                flex: 1.3;
                height: 100%;
                position: relative;
            }

            .emotion {
                flex: 1.3;
                height: 100%;
                position: relative;
            }

            .word {
                flex: 1.3;
                height: 100%;
                position: relative;
            }
        }
    }

    .right {
        width: 40%;
        height: 90%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-top: 3rem;
        margin-right: 1rem;
    }
}

.chart-title {
    font-family: 'TitleFont';
    font-size: 25px;
    text-align: center;
    font-weight: 600;
    position: relative;
    top: 6%;
}

.friend-chart-title {
    font-family: 'TitleFont';
    font-size: 25px;
    text-align: center;
    font-weight: 600;
}

.tour-comp {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 380px;
    z-index: 4000;
}

:global(.el-tour__content) {
    display: none;
}

.tour-button {
    position: absolute;
    left: 1rem;
    top: 0;
}
</style>