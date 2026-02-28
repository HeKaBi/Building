<template>
    <div id="region-bar"></div>
</template>

<script setup lang='ts'>
// @ts-nocheck
import * as echarts from 'echarts/core';
import { GridComponent, TooltipComponent, DataZoomComponent, TitleComponent } from 'echarts/components';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([GridComponent, BarChart, CanvasRenderer, TooltipComponent, DataZoomComponent, TitleComponent]);

import { onMounted, watch, shallowRef, nextTick } from "vue";
import vintage from '@/assets/theme/vintage.json'

const props = defineProps({
    id: {
        type: Number,
        required: true,
    },
    regionName: {
        type: Array,
        required: true,
    },
    regionValue: {
        type: Array,
        required: true,
    }
})
const graph = shallowRef();

const initEcharts = () => {
    if (graph.value) {
        graph.value.dispose();
    }
    var chartDom = document.getElementById('region-bar')!;  // 获取容器 DOM 实例
    chartDom.style.width = '100%';
    chartDom.style.height = '40vh';
    let themeObj = JSON.parse(JSON.stringify(vintage))  // 获取主题对象
    echarts.registerTheme('vintage', themeObj)   // 注册主题
    graph.value = echarts.init(chartDom, 'vintage');    // 初始化图表，传入主题名称

    var option;

    option = {
        title: {
            text: '诗词-自然科学内容关联图',
            left: 'center',
            textStyle: {
                fontFamily: 'TitleFont',
                fontSize: 25,
            }
        },
        tooltip: {
            trigger: 'item',
            axisPointer: {
                type: 'shadow'
            },
            textStyle: {
                fontFamily: 'ContentFont',
                fontSize: 16,
                fontWeight: 'bold'
            },
            formatter: (params) => {
                let sum = 0;
                for (let i = 0; i < props.regionValue.length; ++i) {
                    sum += props.regionValue[i];
                }
                return `<strong>${params.name}</strong></br>频次：${params.data}（${(params.data / sum * 100).toFixed(2)}%）`;
            },
        },
        xAxis: {
            type: 'category',
            data: props.regionName,
            axisLabel: {
                show: true,
                fontFamily: 'ContentFont',
                fontSize: 16,
                interval: 0,
                fontWeight: 'bold',
                color: '#333333',
                formatter: function (value: string) {
                    if (value.length > 3) {
                        // 每两个字插入换行符
                        return value.match(/.{1,2}/g)?.join('\n') || value;
                    }
                    return value;
                },
            }
        },
        yAxis: {
            type: 'value',
            name: '数量/首',
            nameLocation: 'end',
            nameGap: 10,
            nameTextStyle: {
                fontFamily: 'ContentFont',
                fontSize: 16,
                color: '#333333',
                fontWeight: 'bold'
            },
            axisLabel: {
                show: true,
                fontFamily: 'ContentFont',
                fontSize: 14,
                fontWeight: 'bold',
                color: '#333333'
            }
        },
        dataZoom: [{ type: 'inside', disabled: true }],
        series: [
            {
                data: props.regionValue,
                type: 'bar',
                showBackground: true,
                backgroundStyle: {
                    color: 'rgba(180, 180, 180, 0.2)'
                }
            }
        ]
    };

    option && graph.value.setOption(option, { notMerge: true });
}

watch(() => [props.id, props.regionName, props.regionValue], initEcharts, { deep: true });

onMounted(async () => {
    await nextTick();
    initEcharts();
})
</script>

<style scope lang="scss"></style>