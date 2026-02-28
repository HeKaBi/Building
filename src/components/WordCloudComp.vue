<template>
  <!-- 词云图容器 -->
  <div id="word-cloud"></div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import 'echarts-wordcloud'; // 引入词云图插件
import { TitleComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { onMounted, shallowRef, watch } from 'vue';
import vintage from '@/assets/theme/vintage.json'; // 引入主题 JSON

echarts.use([TitleComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps({
  words: {
    type: Array,
    required: true
  },
  title: {
    type: Boolean,
    default: true
  }
});

let myChart = shallowRef();
const initChart = () => {
  if (myChart.value) {
    myChart.value.dispose();
  }
  const chartDom = document.getElementById('word-cloud'); // 获取 DOM 容器
  if (!chartDom) return;
  chartDom.style.width = '100%';
  chartDom.style.height = '100%';
  echarts.registerTheme('vintage', vintage); // 注册主题
  myChart.value = echarts.init(chartDom, 'vintage'); // 初始化 ECharts 实例
  updateChart(props.words);
};

// 数据归一化函数
const normalizeData = (data: any[]) => {
  const values = data.map(item => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  return data.map(item => ({
    ...item,
    originalValue: item.value,
    normalizedValue: (item.value - minValue) / (maxValue - minValue)
  }));
};

const updateChart = (words: any[]) => {
  // 进行数据归一化
  const normalizedWords = normalizeData(words);
  const filteredWords = normalizedWords.sort((a, b) => b.normalizedValue - a.normalizedValue).slice(0, 100);

  const sizeRange = [15, 60];
  const mappedWords = filteredWords.map(word => ({
    ...word,
    // 使用归一化后的值映射到词云图的大小范围
    value: word.normalizedValue * (sizeRange[1] - sizeRange[0]) + sizeRange[0]
  }));

  var option;
  option = {
    tooltip: {
      show: true,
      formatter: (params: any) =>
        `<b>词语：${params.data.name}</b><br><b>频次：${params.data.originalValue} 次</b>`,
      textStyle: {
        fontFamily: 'ContentFont',
        fontSize: 18,
      }
    },
    title: {
      show: props.title,
      text: '双字词云图',
      left: 'center',
      top: '-2%',
      textStyle: {
        fontFamily: 'TitleFont',
        fontSize: 25,
      }
    },
    series: [
      {
        type: 'wordCloud',
        shape: 'circle',
        sizeRange: sizeRange,
        gridSize: 5,
        rotationRange: [0, 0],
        drawOutOfBound: false,
        textStyle: {
          fontFamily: 'ContentFont',
          fontWeight: 'bold',
          color: () => Colors[Math.floor(Math.random() * Colors.length)],
          shadowBlur: 10,
          shadowColor: '#333'
        },
        data: mappedWords,
        emphasis: {
          textStyle: {
            //fontSize: 60,
            fontWeight: 'bold',
            color: '#FF6B6B'
          }
        }
      }
    ],
    animationDurationUpdate: 5000,
    animationEasingUpdate: 'elasticOut'
  };

  myChart.value.setOption(option);
};

onMounted(initChart);

watch(() => props.words, updateChart, { deep: true });

// 主题颜色
const Colors = [
  "#d87c7c", "#919e8b",
  "#6e7074", "#61a0a8",
  "#787464", "#cc7e63",
  "#724e58", "#4b565b"
];

</script>

<style scoped></style>