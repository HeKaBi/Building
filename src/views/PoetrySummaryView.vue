<template>
  <div class="analysis-container">
    <button class="tour-button" v-show="selectedDynasty === 0" @click="startTour">界面导引</button>
    <div class="top-row">
      <div class="button-container">
        <button v-for="(dynasty, index) in dynasties" :key="index"
          :class="['dynasty-button', { active: selectedDynasty === index }]" @click="selectDynasty(index)">
          {{ dynasty }}
        </button>
      </div>
      <div class="charts">
        <div class="left">
          <PlacePieComp />
        </div>
        <div class="middle">
          <WordCloudComp style="width: 100%;" :words="selectedWordCloudWords" />
        </div>
        <div class="right">
          <SunBurstComp />
        </div>
      </div>
    </div>
    <div class="bottom-row" id="bottom-row">
      <!-- <p>创作数量分布时间轴</p> -->
      <TimelineScatterComp />
    </div>

    <div class="tour-comp" v-if="tourVisible" :style="{ bottom: `${tourSteps[currentIndex]['tour_bottom']}%` }">
      <TourComp :content="currentIntro" :stepCount="tourSteps.length" v-model="currentIndex"
        :left="tourSteps[currentIndex].left" :bottom="tourSteps[currentIndex].bottom" />
    </div>

    <el-tour id="el-tour" v-model="tourVisible" :z-index="3000" v-model:current="currentIndex">
      <el-tour-step v-for="(step, index) in tourSteps" :key="index" :target="step.target" :placement="step.placement">
        <template #header style="display: none;"></template>
      </el-tour-step>
      <template #indicators="{ }">
        <span></span>
      </template>
    </el-tour>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch, onBeforeUnmount } from 'vue';
import WordCloudComp from '@/components/WordCloudComp.vue';
import SunBurstComp from '@/components/SunBurstComp.vue';
import TimelineScatterComp from '@/components/TimelineScatterComp.vue';

import tangWordCloudWords from '@/assets/data/tang/word_shuang.json';
import songWordCloudWords from '@/assets/data/song/word_shuang.json';
import yuanWordCloudWords from '@/assets/data/yuan/word_shuang.json';

const selectedDynasty = ref(0);
const dynasties = ['唐', '宋', '元'];
const wordCloudWordsData = [tangWordCloudWords, songWordCloudWords, yuanWordCloudWords];
const selectedWordCloudWords = ref(wordCloudWordsData[selectedDynasty.value]);

const selectDynasty = (index: number) => {
  selectedDynasty.value = index;
  selectedWordCloudWords.value = wordCloudWordsData[index];
};

// 引导相关
const tourVisible = ref(false);
const currentIndex = ref(0);
const currentIntro = ref('');

import PoetrySummaryViewJson from "@/assets/tour/PoetrySummaryView.json"
// 引导步骤
const tourSteps = ref(Array.from(PoetrySummaryViewJson));

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

<style lang="scss">
/* 不使用 scoped */
.el-tour__content {
  display: none !important;
}
</style>

<style scoped lang="scss">
.analysis-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  .top-row {
    width: 99%;
    height: 55%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .button-container {
      width: 100%;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 10px;

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

    .charts {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      margin-top: 1.5%;


      .left {
        width: 28%;
        height: 100%;
      }

      .middle {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 40%;
        height: 100%;
        justify-content: center;
        align-items: center;
      }

      .right {
        width: 28%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }

  .bottom-row {
    width: 100%;
    height: 30%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-top: 3%;

    p {
      font-family: 'TitleFont';
      margin: 0;
      margin-bottom: 0.1em;
      font-size: 25px;
      font-weight: bolder;
    }
  }

  .tour-comp {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 380px;
    z-index: 4000;
  }

  .tour-button {
    position: absolute;
    left: 1rem;
    top: 4.5rem;
  }
}

.button-container button:nth-child(1) {
  background-image: url('../assets/images/dynasty/tang.png');
}

.button-container button:nth-child(2) {
  background-image: url('../assets/images/dynasty/song.png');
}

.button-container button:nth-child(3) {
  background-image: url('../assets/images/dynasty/yuan.png');
}
</style>