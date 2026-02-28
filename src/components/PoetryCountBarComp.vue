<template>
  <div id="bar_chart" ref="barChart" style="width: 100%; height: 45%;"></div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { TooltipComponent, GridComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([TooltipComponent, GridComponent, LegendComponent, BarChart, CanvasRenderer, TitleComponent]);

const barChart = ref(null);
const categories = ['唐代', '宋代', '元代'];
const totalPoems = [57347, 19484, 8771];

const defaultColor = '#919e8b'; // 默认颜色
const highlightColor = '#d87c7c'; // 高亮颜色

const props = defineProps({
  selectedDynasty: {
    type: Number,
    default: null,
  }
});
let chart = null;
const poets = {
  "唐代": "李白、杜甫等人",
  "宋代": "苏轼、李清照、陆游等人",
  "元代": "关汉卿、马致远等人"
}

onMounted(() => {
  if (!barChart.value) return;
  chart = echarts.init(barChart.value);
  renderChart();
});

watch(
  () => props.selectedDynasty,
  () => {
    renderChart();
  }
);

const renderChart = () => {
  const series = [
    {
      name: '诗词总量',
      type: 'bar',
      barWidth: 48,
      data: totalPoems.map((value, index) => ({
        value,
        itemStyle: {
          color: props.selectedDynasty === index ? highlightColor : defaultColor,
        },
      })),
    },
  ];

  chart.setOption({
    grid: {
      left: '8%',   
      right: '10%',
      bottom: '18.5%',
      containLabel: true
    },
    title: {
      text: '朝代诗词总量图',
      textStyle: {
        fontFamily: 'TitleFont',
        fontSize: 20,
      },
      left: 'center',
    },
    textStyle: {
      fontFamily: 'ContentFont',
      fontWeight: 'bold',
      fontSize: 18,
    },
    tooltip: {
      trigger: 'axis',
      position: (point) => [point[0] + 20, point[1]],
      axisPointer: { type: 'shadow' },
      textStyle: {
        fontFamily: 'ContentFont',
        fontSize: 18,
        fontWeight: 'bold',
      },
      formatter: (params) => {
        return `${params[0].axisValue}共有诗词${params[0].value}首</br>代表诗人有${poets[params[0].axisValue]}`;
      },
      // confine: true  // 将 tooltip 限制在图表区域内
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        fontFamily: 'ContentFont',
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333'
      },
      axisPointer: {
        type: 'shadow',
        label: {
          show: true,
          backgroundColor: '#a6917e',
          color: '#FFFFFF',
          borderRadius: 3,
        },
      },
    },
    yAxis: {
      type: 'value',
      name: '数量/万首',
      nameLocation: 'end',
      nameGap: 10,
      nameTextStyle: {
        fontFamily: 'ContentFont',
        fontSize: 16,
        color: '#333333'
      },
      axisLabel: {
        formatter: (value) => `${(value / 10000).toFixed(1)}`, // 转换为万单位
        fontFamily: 'ContentFont',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333333'
      }
    },
    series,
  });
};
</script>

<style scoped></style>