<template>
    <div class="poet-summary-view" style="height: 100%;">
        <button class="tour-button" v-show="selectedDynasty === 0" @click="startTour">界面导引</button>
        <div class="dynasty-choose">
            <button v-for="(dynasty, index) in dynasties" :key="index"
                :class="['dynasty-button', { active: selectedDynasty === index }]" @click="selectDynasty(index)">
                {{ dynasty }}
            </button>
        </div>
        <div class="main">
            <div class="left">
                <PoetSanKeyComp :nodes="selectedSankey.nodes" :links="selectedSankey.links" />
                <PoetryCateBarComp :id="selectedDynasty" :regionName="selectedCateName"
                    :regionValue="selectedCateValue" />
            </div>
            <div class="right">
                <div class="legends">
                    <div class="legend" v-for="(item, index) in legend[selectedDynasty]" :key="index">
                        <div class="circle" :style="{ backgroundColor: item.color }"></div>
                        <div class="name">{{ item.name }}</div>
                    </div>
                </div>
                <RelationGraphComp :nodes="selectedNodes" :links="selectedLinks" :infos="selectedInfos"
                    :id="selectedDynasty" :group="groups[selectedDynasty]" />
            </div>
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
import PoetryCateBarComp from '@/components/PoetryCateBarComp.vue'
import PoetSanKeyComp from '@/components/PoetSanKeyComp.vue'
import RelationGraphComp from '@/components/RelationGraphComp.vue'

import tangPoetryCate from '@/assets/data/tang/natural_science.json'
import songPoetryCate from '@/assets/data/song/natural_science.json'
import yuanPoetryCate from '@/assets/data/yuan/natural_science.json'

import tangPoetSankey from '@/assets/data/tang/poet_sankey.json'
import songPoetSankey from '@/assets/data/song/poet_sankey.json'
import yuanPoetSankey from '@/assets/data/yuan/poet_sankey.json'

import tangNodes from '@/assets/data/tang/network/nodes.json'
import tangLinks from '@/assets/data/tang/network/links.json'
import tangInfos from '@/assets/data/tang/network/infos.json'

import songNodes from '@/assets/data/song/network/nodes.json'
import songLinks from '@/assets/data/song/network/links.json'
import songInfos from '@/assets/data/song/network/infos.json'

import yuanNodes from '@/assets/data/yuan/network/nodes.json'
import yuanLinks from '@/assets/data/yuan/network/links.json'
import yuanInfos from '@/assets/data/yuan/network/infos.json'

import { onMounted, ref, watch, onBeforeUnmount } from 'vue'

const modules = import.meta.glob('/src/assets/images/network/*');
const avatar = async (name) => {
    const path = `/src/assets/images/network/${name}.png`;
    const module = await modules[path]();
    return module.default;
}

const selectedDynasty = ref(0);
const dynasties = ['唐', '宋', '元'];
const selectedCateName = ref([]);
const selectedCateValue = ref([]);
const selectedSankey = ref({
    nodes: [],
    links: []
});
const selectedNodes = ref([]);
const selectedLinks = ref([]);
const selectedInfos = ref({});
const groups = ref([
    ['浪漫主义诗派', '现实主义诗派', '山水田园诗派', '边塞诗派'],
    ['豪放派', '婉约派'],
    ['豪放派', '清丽派']
])
const legend = ref([
    [
        {
            name: '浪漫主义诗派',
            color: '#f4a460'
        },
        {
            name: '现实主义诗派',
            color: '#919e8b'
        },
        {
            name: '山水田园诗派',
            color: '#d87c7c'
        },
        {
            name: '边塞诗派',
            color: '#0e6aab'
        },
    ],
    [
        {
            name: '豪放派',
            color: '#f4a460'
        },
        {
            name: '婉约派',
            color: '#919e8b'
        }
    ],
    [
        {
            name: '豪放派',
            color: '#f4a460'
        },
        {
            name: '清丽派',
            color: '#919e8b'
        }
    ]
])

const preprocessCate = (cate: Array) => {
    selectedCateName.value = [];
    selectedCateValue.value = [];
    for (let i = 0; i < cate.length; i++) {
        selectedCateName.value.push(cate[i].name);
        selectedCateValue.value.push(cate[i].value);
    }
}

const selectDynasty = async (index: number) => {
    selectedDynasty.value = index;

    switch (index) {
        case 0:
            // @ts-ignore
            preprocessCate(tangPoetryCate);
            selectedSankey.value = tangPoetSankey;
            selectedNodes.value = tangNodes;
            selectedLinks.value = tangLinks;
            selectedInfos.value = tangInfos;
            break;
        case 1:
            // @ts-ignore
            preprocessCate(songPoetryCate);
            selectedSankey.value = songPoetSankey;
            selectedNodes.value = songNodes;
            selectedLinks.value = songLinks;
            selectedInfos.value = songInfos;
            break;
        case 2:
            // @ts-ignore
            preprocessCate(yuanPoetryCate);
            selectedSankey.value = yuanPoetSankey;
            selectedNodes.value = yuanNodes;
            selectedLinks.value = yuanLinks;
            selectedInfos.value = yuanInfos;
            break;
    }
}

onMounted(async () => {
    selectDynasty(0);
})

// 引导相关
const tourVisible = ref(false);
const currentIndex = ref(0);
const currentIntro = ref('');

import PoetSummaryViewJson from "@/assets/tour/PoetSummaryView.json"
// 引导步骤
const tourSteps = ref(Array.from(PoetSummaryViewJson));

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

<style scoped lang="scss">
.dynasty-choose {
    width: 100%;
    height: 45px;
    display: flex;
    gap: 10px;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    margin-bottom: 8px;

    .dynasty-button {
        width: 32px;
        height: 32px;
        font-family: 'TitleFont';
        border-radius: 50%;
        background-size: cover;
        /* 覆盖整个容器 */
        background-position: center;
        /* 图片居中显示 */
        background-repeat: no-repeat;
        /* 禁止重复平铺 */
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
        color: #000000;
        transition: all 0.3s ease;
    }

    .active {
        width: 40px;
        height: 40px;
        font-size: 25px;
    }
}

.dynasty-choose button:nth-child(1) {
    background-image: url('../assets/images/dynasty/tang.png');
}

.dynasty-choose button:nth-child(2) {
    background-image: url('../assets/images/dynasty/song.png');
}

.dynasty-choose button:nth-child(3) {
    background-image: url('../assets/images/dynasty/yuan.png');
}

.poet-summary-view {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;

    .main {
        width: 95%;
        height: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        gap: 10px;

        .left {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .right {
            flex: 1;
            height: 95%;
            position: relative;

            .legends {
                position: absolute;
                top: 8%;
                left: 5%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 10px;

                .legend {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 8px;

                    .circle {
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                    }

                    .name {
                        font-family: 'ContentFont';
                        font-size: 20px;
                        font-weight: bold;
                    }
                }
            }
        }
    }
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
    top: 4.5rem;
}
</style>