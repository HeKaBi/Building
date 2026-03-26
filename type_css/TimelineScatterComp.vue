<template>
    <div id="timeline-scatter" style="width: 85%;height: 200px;"></div>
</template>

<script setup lang='ts'>
// @ts-nocheck
import * as echarts from 'echarts/core';
import {
    TitleComponent,
    SingleAxisComponent,
    TooltipComponent
} from 'echarts/components';
import { ScatterChart } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    TitleComponent,
    SingleAxisComponent,
    TooltipComponent,
    ScatterChart,
    CanvasRenderer,
    UniversalTransition
]);

import { onMounted } from 'vue';
import vintage from '@/assets/theme/vintage.json'
import timeline from '@/assets/data/timeline.json'
import keypoint from '@/assets/data/keypoint.json'

onMounted(() => {
    var chartDom = document.getElementById('timeline-scatter');
    let themeObj = JSON.parse(JSON.stringify(vintage))  // 获取主题对象
    echarts.registerTheme('vintage', themeObj)   // 注册主题
    var myChart = echarts.init(chartDom, 'vintage');    // 初始化图表，传入主题名称
    var option;

    const tangAxisData = Array.from({ length: timeline["唐"].end - timeline["唐"].begin + 1 }, (_, i) => i + timeline["唐"].begin);
    const songAxisData = Array.from({ length: timeline["宋"].end - timeline["宋"].begin + 1 }, (_, i) => i + timeline["宋"].begin);
    const yuanAxisData = Array.from({ length: timeline["元"].end - timeline["元"].begin + 1 }, (_, i) => i + timeline["元"].begin);

    const axisData = [tangAxisData, songAxisData, yuanAxisData];
    const dynasties = ["唐诗", "宋词", "元曲"]

    const data = []
    for (let i = 0; i < dynasties.length; i++) {
        const dynasty = dynasties[i].substring(0, 1);
        const times = timeline[dynasty]['timeline'];
        for (let j = 0; j < times.length; j++) {
            data.push([i, times[j]['year'], times[j]['count']]);
        }
    }
    const maxCount = data.reduce((acc, cur) => {
        if (acc[cur[0]]) {
            acc[cur[0]] = Math.max(acc[cur[0]], cur[2]);
        } else {
            acc[cur[0]] = cur[2];
        }
        return acc;
    }, []);

    // 关键时间节点
    const keyPoints = Array.from([
        Array.from([650, 718, 756, 793, 836]),
        Array.from([1126, 1185]),
        Array.from([1296, 1321])
    ]);
    const keyPointsSize = [1000, 200, 50]
    keyPoints.forEach((points, index) => {
        points.forEach((point) => {
            data.push([index, point, keyPointsSize[index]]);
        })
    })

    const title = [];
    const singleAxis = [];
    const series = [];

    // 添加主标题
    title.push({
        text: '创作数量分布时间轴',
        left: 'center',
        top: '0%',
        textStyle: {
            fontFamily: 'TitleFont',
            fontSize: 25,
        }
    });

    dynasties.forEach((dynasty, index) => {
        title.push({
            textBaseline: 'middle',
            top: ((index + 0.5) * 100) / 4 + 15 + '%',
            text: dynasty,
            textStyle: {
                fontFamily: 'TitleFont',
                fontSize: 25,
            }
        });
        singleAxis.push({
            left: 70,
            type: 'value',
            boundaryGap: false,
            min: axisData[index][0],
            max: axisData[index][axisData[index].length - 1],
            top: (index * 100) / 4 + 20 + '%',
            height: 100 / 3 - 20 + '%',
            axisTick: {
                interval: 20,
            },
            axisLabel: {
                fontFamily: 'ContentFont',
                fontWeight: 'bold',
                interval: 20,
                showMaxLabel: true,
                formatter: function (value) {
                    if (value === 907 || value === 1279 || value === 1368) {
                        return value + '(年)';
                    }
                    return value;
                }
            },
            // name: '年',
            // nameLocation: 'end',
            // nameGap: 8,
            // nameTextStyle: {
            //     fontFamily: 'ContentFont',
            //     fontSize: 16
            // },
        });

        series.push({
            singleAxisIndex: index,
            coordinateSystem: 'singleAxis',
            type: 'scatter',
            data: [],
            symbol: (value, params) => {
                if (keyPoints[index].includes(value[0])) {
                    return 'arrow';
                }
                else {
                    return 'circle';
                }
            },
            symbolSize: function (val) {
                return 6 + val[1] / maxCount[index] * 25;
            },
            tooltip: {
                formatter: function (params) {
                    if (keyPoints[index].includes(params.data[0])) {
                        const dynasty = dynasties[index].substring(0, 1);
                        const keypointInfo = keypoint[dynasty].find(item => item.keypoint === params.data[0]);
                        return `
                            <div style="max-width: 300px">
                                <h3 style="margin: 0; font-size: 18px">${keypointInfo.title}</h3>
                                <p style="margin: 5px 0">【${params.data[0]}年】</p>
                                <img src="${keypointInfo.image}" style="width: 100%; margin: 5px 0"/>
                                <p style="margin: 5px 0; line-height: 1.3;text-indent: 2em;">${keypointInfo.text}</p>
                            </div>
                        `;
                    }
                    return `年份：${params.data[0]}<br/>创作数量：${params.data[1]}`
                },
            }
        });
    })
    data.forEach((item) => {
        series[item[0]].data.push([item[1], item[2]]);
    })
    option = {
        tooltip: {
            position: 'top',
            textStyle: {
                fontFamily: 'ContentFont',
                fontSize: 16,
                fontWeight: 'bold'
            },
            extraCssText: 'max-width: 400px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.2); white-space: normal;'
        },
        title: title,
        singleAxis: singleAxis,
        series: series
    };
    option && myChart.setOption(option);
})
</script>

<style scope lang="scss"></style>