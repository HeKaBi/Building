<template>
    <div id="place-pie"></div>
</template>

<script setup lang='ts'>
// @ts-nocheck
import * as echarts from 'echarts/core';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { PieChart } from 'echarts/charts';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    TooltipComponent,
    LegendComponent,
    PieChart,
    CanvasRenderer,
    LabelLayout
]);

import { onMounted, shallowRef } from 'vue';
import vintage from '@/assets/theme/vintage.json';

import tangPlace from '@/assets/data/tang/places.json';
import songPlace from '@/assets/data/song/places.json';
import yuanPlace from '@/assets/data/yuan/places.json';

const tranform = (placeJson: Object) => {
    let res = [];
    let idx = 0;
    for (const key in placeJson) {
        res.push({
            name: key,
            value: placeJson[key]
        });
        idx++;
        if (idx >= 15)
            break;
    }
    return res;
}

const graph = shallowRef();

const initPie = () => {
    if (graph.value) {
        graph.value.dispose();
    }
    var chartDom = document.getElementById('place-pie')!;
    if (!chartDom)
        return;
    chartDom.style.width = '100%';
    chartDom.style.height = '100%';
    let themeObj = JSON.parse(JSON.stringify(vintage))  // 获取主题对象
    echarts.registerTheme('vintage', themeObj)   // 注册主题
    graph.value = echarts.init(chartDom, 'vintage');    // 初始化图表，传入主题名称
    var option;

    option = {
        title: {
            text: '朝代-景点-诗词数量玫瑰图',
            left: 'center',
            top: '-2%',
            textStyle: {
                fontFamily: 'TitleFont',
                fontSize: 25
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        series: [
            {
                name: '元曲',
                type: 'pie',
                selectedMode: 'single',
                radius: ['5%', '25%'],
                roseType: 'radius',
                itemStyle: {
                    borderRadius: 5,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                },
                label: {
                    show: false
                },
                labelLine: {
                    show: false
                },
                data: tranform(yuanPlace),
                tooltip: {
                    textStyle: {
                        fontFamily: 'ContentFont',
                        fontSize: 18,
                        fontWeight: 'bold'
                    }
                }
            },
            {
                name: '宋词',
                type: 'pie',
                selectedMode: 'single',
                radius: ['30%', '50%'],
                roseType: 'radius',
                label: {
                    show: false
                },
                itemStyle: {
                    borderRadius: 5,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                },
                labelLine: {
                    show: false
                },
                data: tranform(songPlace),
                tooltip: {
                    textStyle: {
                        fontFamily: 'ContentFont',
                        fontSize: 18,
                        fontWeight: 'bold'
                    }
                }
            },
            {
                name: '唐诗',
                type: 'pie',
                selectedMode: 'single',
                radius: ['55%', '75%'],
                roseType: 'radius',
                itemStyle: {
                    borderRadius: 5,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                },
                labelLine: {
                    show: true,
                    smooth: 0.5,
                    length: 1,
                    lineStyle: {
                        width: 1,
                        opacity: 1
                    }
                },
                label: {
                    show: true,
                    position: 'outside',
                    fontSize: 15,
                    fontFamily: 'ContentFont',
                    fontWeight: 'bold',
                    textBorderWidth: -100,
                },
                data: tranform(tangPlace),
                tooltip: {
                    textStyle: {
                        fontFamily: 'ContentFont',
                        fontSize: 18,
                        fontWeight: 'bold'
                    }
                }
            }
        ]
    };

    option && graph.value.setOption(option, { notMerge: true });
}

onMounted(() => {
    initPie();
})
</script>

<style scope lang="scss"></style>