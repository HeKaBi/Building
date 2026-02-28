<template>
    <div id="radar"></div>
</template>

<script setup lang='ts'>
import * as echarts from 'echarts/core';
import { TitleComponent, LegendComponent } from 'echarts/components';
import { RadarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([TitleComponent, LegendComponent, RadarChart, CanvasRenderer]);

import { onMounted, watch, shallowRef } from 'vue';
import vintage from '@/assets/theme/vintage.json';

const graph = shallowRef();

const props = defineProps({
    indicator: {
        type: Array,
        default: () => {
            return []
        }
    },
    value: {
        type: Array,
        default: () => {
            return []
        }
    }
})

const initRadar = () => {
    if (!props.value.length) {
        return;
    }

    if (graph.value) {
        graph.value.dispose();
    }
    var chartDom = document.getElementById('radar')!;
    chartDom.style.width = '100%';
    chartDom.style.height = '100%';
    let themeObj = JSON.parse(JSON.stringify(vintage))  // 获取主题对象
    echarts.registerTheme('vintage', themeObj)   // 注册主题
    graph.value = echarts.init(chartDom, 'vintage');    // 初始化图表，传入主题名称

    var option;

    option = {
        tooltip: {
            trigger: 'axis'
        },
        radar: {
            shape: 'circle',
            indicator: props.indicator,
            axisName: {
                color: '#000000',
                fontFamily: 'ContentFont',
                fontSize: 20,
                fontWeight: 'bold',
            },
            nameGap: 5,
            splitArea: {
                areaStyle: {
                    color: ['transparent', '#e6a23c55']
                }
            }
        },

        series: [
            {
                name: '',
                type: 'radar',
                tooltip: {
                    trigger: 'item',
                    textStyle: {
                        fontFamily: 'ContentFont',
                        fontSize: 18,
                        fontWeight: 'bold'
                    },
                    formatter: function (params) {
                        return params.data.value.map((val, index) => {
                            const dimensionName = props.indicator[index]['name'] || `维度${index + 1}`;

                            return `<div style="display: flex; align-items: center; gap: 6px;">
                                    <div style="width:8px; height:8px; border-radius:50%; background-color: #d7ab82;padding: 0;"></div>
                                    <span>${dimensionName}: ${val}</span>
                                    </div>`;
                        }).join('');
                    }
                },
                emphasis: {
                    lineStyle: {
                        width: 3
                    }
                },
                areaStyle: {},
                data: [
                    {
                        value: props.value,
                    }
                ]
            }
        ]
    };

    option && graph.value.setOption(option, { notMerge: true });
}

onMounted(() => {
    initRadar();
})

watch(() => props.value, async () => {
    initRadar();
})
</script>

<style scope lang="scss"></style>