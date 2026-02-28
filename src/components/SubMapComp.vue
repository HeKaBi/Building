<template>
    <div class="submap" :id="`submap_${props.mType}`"></div>
</template>

<script setup lang='ts'>
// AreaOne: 陕西、河南
// AreaTwo: 江南北部（浙江、江苏、安徽）
// AreaThree:  江南南部（江西、福建）
// AreaFour: 大都附近（河北、北京、天津）
import AreaOne from '@/assets/map/area_one.json'
import AreaTwo from '@/assets/map/area_two.json'
import AreaThree from '@/assets/map/area_three.json'
import AreaFour from '@/assets/map/area_four.json'

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

import { onMounted, onUnmounted, shallowRef, watch, nextTick } from "vue";
import vintage from '@/assets/theme/vintage.json'
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

const mapType = [AreaOne, AreaTwo, AreaTwo, AreaThree, AreaFour, AreaTwo]

const mapTitle = [
    '关中地区（现陕西、河南）',
    '江南北部（现江苏、浙江、安徽）',
    '江南北部（现江苏、浙江、安徽）',
    '江南南部（现福建、江西）',
    '大都地区（现北京、天津、河北）',
    '江南北部（现江苏、浙江、安徽）'
]

const props = defineProps({
    mType: {
        type: Number,
        default: 0,
        required: true
    },
    data: {
        type: Object,
        required: true,
        default: () => { }
    },
    ratio: {
        type: Number,
        required: true,
    }
})

const graph = shallowRef();
const initChart = async () => {
    if (graph.value) {
        graph.value.dispose();
    }
    await nextTick();
    var chartDom = document.getElementById(`submap_${props.mType}`)!;

    if (!chartDom) return;
    chartDom.style.width = '100%';
    chartDom.style.height = '30%';
    let themeObj = JSON.parse(JSON.stringify(vintage))
    echarts.registerTheme('vintage', themeObj)
    graph.value = echarts.init(chartDom, 'vintage');

    echarts.registerMap(`submap_${props.mType}`, mapType[props.mType]);

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
                fontSize: 16,
                fontWeight: 'bold'
            }
        },
        title: {
            text: mapTitle[props.mType],
            left: 'center',
            textStyle: {
                fontFamily: 'TitleFont',
                fontSize: 20,
            }
        },
        geo: {
            map: `submap_${props.mType}`,
            roam: false,
            zoom: 1,
            top: '20%',
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

watch(() => props.data, async () => {
    initChart();
})

onMounted(async () => {
    initChart();
})

onUnmounted(() => {
    if (graph.value) {
        graph.value.dispose();
    }
})
</script>

<style scope lang="scss"></style>
