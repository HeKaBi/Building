<template>
    <div id="relation-graph"></div>
</template>

<script setup lang='ts'>
// @ts-nocheck
import * as echarts from 'echarts/core';
import {
    ToolboxComponent,
    TooltipComponent,
    type TooltipComponentOption,
    LegendComponent,
    TitleComponent,
    type LegendComponentOption
} from 'echarts/components';
import { GraphChart, type GraphSeriesOption } from 'echarts/charts';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

import { avatars, colors } from '../utils/network.ts'

echarts.use([
    ToolboxComponent,
    TooltipComponent,
    LegendComponent,
    GraphChart,
    CanvasRenderer,
    LabelLayout,
    TitleComponent
]);

type EChartsOption = echarts.ComposeOption<
    TooltipComponentOption | LegendComponentOption | GraphSeriesOption
>;

import { onMounted, watch, shallowRef } from "vue";
import vintage from '@/assets/theme/vintage.json'

const props = defineProps({
    nodes: {
        type: Array,
        required: true,
        default: () => []
    },
    links: {
        type: Array,
        required: true,
        default: () => []
    },
    infos: {
        type: Object,
        required: true,
    },
    id: {
        type: Number,
        required: true,
    },
    group: {
        type: Array,
        required: true,
        default: () => []
    }
});
const graph = shallowRef();

const processData = (nodes: Array<any>, infos: Object) => {
    let newNodes = [];

    for (let idx = 0; idx < nodes.length; idx++) {
        let new_node = {
            id: nodes[idx].name,
            name: nodes[idx].name,
            category: nodes[idx].community,
            symbolSize: nodes[idx].symbolSize,
            gender: infos[nodes[idx].name].Gender,
            birth: infos[nodes[idx].name].YearBirth,
            death: infos[nodes[idx].name].YearDeath,
            address: infos[nodes[idx].name].Address,
            avatar: infos[nodes[idx].name].avatar,
            symbol: infos[nodes[idx].name].avatar,
            x: nodes[idx].x,
            y: nodes[idx].y,
        }
        newNodes.push(new_node);
    }
    return newNodes;
}

const getImgData = (name, cate) => {
    var fun = function (resolve) {
        const canvas = document.createElement('canvas');
        const contex = canvas.getContext('2d');
        const img = new Image();

        img.onload = function () {
            let center = {
                x: img.width / 2,
                y: img.height / 2
            }
            var diameter = img.width;
            canvas.width = diameter;
            canvas.height = diameter;
            contex.clearRect(0, 0, diameter, diameter);
            contex.save();
            contex.beginPath();
            var radius = img.width / 2;
            contex.arc(radius, radius, radius, 0, 2 * Math.PI); //画出圆
            contex.clip(); //裁剪上面的圆形
            contex.drawImage(img, center.x - radius, center.y - radius, diameter, diameter, 0, 0,
                diameter, diameter); // 在刚刚裁剪的园上画图
            contex.restore(); // 还原状态

            // 添加红色边框（在裁剪区域外绘制）
            contex.beginPath();
            contex.arc(radius, radius, radius - 10, 0, 2 * Math.PI); // 留出边框空间

            contex.strokeStyle = colors[cate];

            contex.lineWidth = 20;
            contex.stroke();


            resolve(canvas.toDataURL('image/png', 1))
        }
        img.src = avatars[props.id][name];
    }

    var promise = new Promise(fun);
    return promise
}

const pubdata = (nodes) => {
    var picList = [];
    let arr = nodes;

    for (var i = 0; i < arr.length; i++) {
        var object = arr[i];
        var p = getImgData(object.name, object.category);
        picList.push(p);
    }
    Promise.all(picList).then(function (images) {
        for (var i = 0; i < images.length; i++) {
            var img = "image://" + images[i];
            arr[i].symbol = img;
        }
        graph.value.setOption({
            series: [{
                data: arr
            }]
        })
    })
}

const initEcharts = () => {
    if (graph.value) {
        graph.value.dispose();
    }
    var chartDom = document.getElementById('relation-graph')!;
    chartDom.style.width = '100%';
    chartDom.style.height = '100%';
    let themeObj = JSON.parse(JSON.stringify(vintage))
    echarts.registerTheme('vintage', themeObj)
    graph.value = echarts.init(chartDom, 'vintage');

    let nodes = processData(props.nodes, props.infos);
    let categories = [];
    let categorySet = new Set<string>();
    for (let idx = 0; idx < nodes.length; idx++) {
        categorySet.add(nodes[idx].category);
    }
    for (const item of categorySet) {
        categories.push({
            name: item
        });
    }

    var option: EChartsOption;
    option = {
        tooltip: {
            textStyle: {
                fontFamily: 'ContentFont',
                fontSize: 18,
                fontWeight: 'bold'
            }
        },
        itemStyle: {
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            shadowOffsetX: 2,
            shadowOffsetY: 2
        },
        // toolbox: {
        //     show: true,
        //     feature: {
        //         saveAsImage: {
        //             show: true,
        //             title: '保存为png',
        //             type: 'png'
        //         },
        //         restore: {
        //             title: '重置'
        //         }
        //     },
        //     orient: 'horizontal',
        //     left: 'right',
        //     top: 'top',
        // },
        title: {
            text: '诗人关系网络图',
            left: 'center',
            textStyle: {
                fontFamily: 'TitleFont',
                fontSize: 25,
            }
        },
        series: [
            {
                name: 'Relation Graph',
                type: 'graph',
                top: '18%',
                bottom: '15%',
                layout: 'none',
                force: {
                    repulsion: 1,
                    edgeLength: 10,
                },
                data: props.nodes.map(node => ({
                    ...node,
                    symbol: `image://${node.avatar}`,
                    symbolKeepAspect: true,
                    edgeSymbol: "circle"
                })),
                links: props.links.map(link => ({
                    ...link,
                    lineStyle: {
                        color: link.color,
                        curveness: 0.02,
                    }
                })),
                categories: categories,
                roam: true,
                edgeSymbol: ['none', 'arrow'],
                edgeSymbolSize: 8,
                label: {
                    show: true,
                    position: 'bottom',
                    formatter: '{b}',
                    fontFamily: 'ContentFont',
                    fontSize: 16,
                    fontWeight: 'bold'
                },
                draggable: true,
                focusNodeAdjacency: true,
                labelLayout: {
                    hideOverlap: true
                },
                scaleLimit: {
                    min: 0.4,
                    max: 2
                },
                lineStyle: {
                    color: function (params) {
                        return params.data.lineStyle?.color || '#4f8fa7';
                    },
                    curveness: 0.15,
                    width: 2,
                    opacity: 0.8
                },
                tooltip: {
                    formatter: function (params) {
                        if (params.dataType === 'node') {
                            return `
                                        <strong>姓名：</strong>${params.data.name}<br/>
                                        <strong>性别：</strong>${params.data.gender}<br/>
                                        <strong>出生年份：</strong>${params.data.birth}<br/>
                                        <strong>死亡年份：</strong>${params.data.death}<br/>
                                        <strong>常驻地：</strong>${params.data.address}<br/>
                                        <strong>所属派系：</strong>${props.group[params.data.category - 1]}<br/>
                                    `;
                        } else if (params.dataType === 'edge') {
                            return `${params.data.name}`;
                        }
                        return '';
                    }
                }
            }
        ]
    };
    option && graph.value.setOption(option, { notMerge: true });
    pubdata(nodes);

    // 监听restore事件
    graph.value.on('restore', () => {
        pubdata(nodes);
    });
}

watch(() => [props.id, props.nodes, props.links, props.infos], () => {
    initEcharts();
})

onMounted(() => {
    initEcharts();
})
</script>

<style scope lang="scss"></style>
