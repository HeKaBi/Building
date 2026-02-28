<template>
  <div id="map"></div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import {
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
  GeoComponent
} from 'echarts/components';
import { MapChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

import { onMounted, onUnmounted, shallowRef, watch } from "vue";
import vintage from '@/assets/theme/vintage.json'
import chinaJson from '@/assets/map/china.json'
import siteJson from '@/assets/map/site.json'

echarts.use([
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
  GeoComponent,
  MapChart,
  CanvasRenderer
]);

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  ratio: {
    type: Number,
    required: true,
  },
})

const graph = shallowRef();
const initChart = () => {
  if (graph.value) {
    graph.value.dispose();
  }

  var chartDom = document.getElementById('map')!;
  if (!chartDom) return;
  chartDom.style.width = '100%';
  chartDom.style.height = '90%';
  let themeObj = JSON.parse(JSON.stringify(vintage))
  echarts.registerTheme('vintage', themeObj)
  graph.value = echarts.init(chartDom, 'vintage');

  echarts.registerMap('china', chinaJson);

  const d = [];
  for (const key in props.data) {
    d.push({
      name: key,
      value: siteJson[key].concat([props.data[key]])
    })
  }

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `<strong>${params.name}</strong></br>诗人数量：${params.value[2]}`;
      },
      textStyle: {
        fontFamily: 'ContentFont',
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    title: {
      text: '诗人籍贯分布图',
      left: 'center',
      textStyle: {
        fontFamily: 'TitleFont',
        fontSize: 28,
      }
    },
    geo: {
      map: 'china',
      roam: false,
      zoom: 1.2,
      itemStyle: {
        areaColor: '#9ba99555',
        borderColor: '#19595655',
        borderWidth: 1,
      },
      tooltip: {
        show: false
      },
      // 设置高亮状态下的多边形和标签样式
      emphasis: {
        // 设置区域样式
        itemStyle: {
          areaColor: "#9ba995",
          borderColor: "#195956",
        },
        // 设置字体
        label: {
          fontSize: 14,
          color: "#000000",
          fontFamily: 'ContentFont'
        },
      }
    },
    series: [
      {
        type: 'effectScatter',
        data: d,
        avoidLabelOverlap: true,
        coordinateSystem: 'geo',
        symbolSize: (data: any) => {
          return Math.sqrt(data[2]) * props.ratio;
        },
        showEffectOn: 'render',
        rippleEffect: {
          brushType: 'fill',
          color: '#d5cf6d',
          scale: 2,
        },
        label: {
          show: false,
          formatter: '{b}',
          position: 'top',
          fontSize: 13,
          color: '#000000',
          fontWeight: 300,
          fontFamily: 'ContentFont'
        },
        labelLayout: {
          hideOverlap: true
        },
        itemStyle: {
          color: '#e8738e',
        },
        emphasis: {
          label: {
            show: true
          }
        },
        tooltip: {
          show: true
        },
        zlevel: 1,
      }
    ]
  }
  graph.value.setOption(option);
}

watch(() => props.data, () => {
  initChart();
})

onMounted(() => {
  initChart();
})

onUnmounted(() => {
  if (graph.value) {
    graph.value.dispose();
  }
})
</script>

<style scoped lang="scss"></style>
