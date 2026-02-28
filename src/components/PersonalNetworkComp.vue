<template>
    <div id="personal-network"></div>
</template>

<script setup lang='ts'>
// @ts-nocheck
import vintage from '@/assets/theme/vintage.json'

import * as echarts from 'echarts/core';
import { TooltipComponent, LegendComponent, ToolboxComponent } from 'echarts/components';
import { PieChart } from 'echarts/charts';
import { GraphChart } from 'echarts/charts';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

import { onMounted, watch, shallowRef } from 'vue';

echarts.use([
    TooltipComponent,
    LegendComponent,
    PieChart,
    CanvasRenderer,
    LabelLayout,
    GraphChart,
    ToolboxComponent
]);

const props = defineProps({
    nodes: {
        type: Array,
        required: true,
        default: []
    },
    links: {
        type: Array,
        required: true,
        default: []
    }
})

const relationGraph = shallowRef();
const initRelationGraph = () => {
    if (relationGraph.value) {
        relationGraph.value.dispose();
    }
    var chartDom = document.getElementById('personal-network')!;  // 获取容器 DOM 实例
    if (!chartDom) return;
    chartDom.style.width = '98%';
    chartDom.style.height = '95%';

    const containerWidth = chartDom.clientWidth;
    const containerHeight = chartDom.clientHeight;

    const nodes = props.nodes.map(node => {
        if (node.isCenter) {
            return {
                ...node,
                symbolSize: 55,
                symbol: 'roundRect',
                itemStyle: {
                    color: '#e6c3c9',
                    borderWidth: 0
                },
                label: {
                    fontSize: 18,
                    fontWeight: 'bold'
                }
            };
        }
        else {
            return {
                ...node,
                symbol: 'circle',
                label: {
                    position: 'bottom',
                    fontWeight: 'bold'
                },
                symbolSize: 20,
                itemStyle: {
                    color: '#c5c9c1',
                    borderWidth: 0
                }
            }
        }
    });

    let themeObj = JSON.parse(JSON.stringify(vintage))  // 获取主题对象
    echarts.registerTheme('vintage', themeObj)   // 注册主题
    relationGraph.value = echarts.init(chartDom, 'vintage');    // 初始化图表，传入主题名称

    var option;

    option = {
        tooltip: {},
        label: {
            fontFamily: 'ContentFont',
            fontSize: 25,
        },
        animationDurationUpdate: 1500,
        animationEasingUpdate: 'quinticInOut',
        series: [
            {
                type: 'graph',
                layout: 'force',
                edgeSymbol: ['none', 'arrow'],
                edgeSymbolSize: 8,
                force: {
                    repulsion: 180,     // 增加节点间斥力
                    edgeLength: [100, 200],     // 调整边的理想长度范围
                    friction: 0.1,      // 摩擦系数（控制动画速度）
                    layoutAnimation: true,
                    // gravity: 0.1        // 添加重力参数，防止节点分散太开
                },
                autoCurveness: true,
                data: nodes,
                links: props.links.map(link => ({
                    ...link,
                    lineStyle: {
                        curveness: 0.4,
                        color: '#928e82'
                    }
                })),
                focusNodeAdjacency: true,
                itemStyle: {
                    color: '#D2B48C',
                    borderWidth: 0
                },
                label: {
                    show: true,
                    position: 'inside',
                    fontSize: 15,
                    fontFamily: 'ContentFont',
                    LabelLayout: {
                        hideOverlap: true
                    }
                },
                roam: true,
                draggable: true,
                tooltip: {
                    formatter: function (params) {
                        if (params.dataType === 'node') {
                            return `<strong>${params.data.name}</strong>`;
                        } else if (params.dataType === 'edge') {
                            if (params.data.name.length === 1)
                                return `${params.data.name[0]}`;
                            let labelList = [];
                            let re = ''
                            for (let i = 0; i <params.data.name.length; i++) {
                                re += '(' + (i + 1) + ')' + params.data.name[i] + '</br>';
                            }
                            return `<strong>${re}</strong>`;
                        }
                        return '';
                    },
                    textStyle: {
                        fontFamily: 'ContentFont',
                        fontSize: 18,
                        fontWeight: 'bold'
                    }
                }
            }
        ]
    };
    option && relationGraph.value.setOption(option);
}

watch(() => props.links, () => {
    initRelationGraph();
})

onMounted(() => {
    initRelationGraph();
})
</script>

<style scope lang="scss"></style>
