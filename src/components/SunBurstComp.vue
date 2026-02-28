<template>
  <div id="sun-burst" ref="sunBurst" style="width: 100%; height: 380px;"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts/core';
import { TitleComponent } from 'echarts/components';
import { SunburstChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([TitleComponent, SunburstChart, CanvasRenderer]);

const sunBurst = ref(null);
let myChart = null;

const data = [
  {
    name: '唐',
    itemStyle: { color: '#d87c7c' }, // 主题红色
    children: [
      {
        name: '浪漫主义诗派',
        itemStyle: { color: '#e9967a' }, // 浅红
        children: [
          { name: '喜', value: 2493, itemStyle: { color: '#f4a460' } }, // 浅橙红
          { name: '怒', value: 596, itemStyle: { color: '#cd5c5c' } }, // 深红
          { name: '悲', value: 3521, itemStyle: { color: '#8b4513' } }, // 深棕红
          { name: '乐', value: 3344, itemStyle: { color: '#e9967a' } }, // 浅红
          { name: '思', value: 3727, itemStyle: { color: '#a0522d' } }, // 棕红
          { name: '惧', value: 125, itemStyle: { color: '#800000' } }, // 深红
          { name: '忧', value: 1209, itemStyle: { color: '#b22222' } } // 红褐
        ]
      },
      {
        name: '现实主义诗派',
        itemStyle: { color: '#cd5c5c' }, // 深红
        children: [
          { name: '喜', value: 1357, itemStyle: { color: '#f4a460' } }, // 浅橙红
          { name: '怒', value: 773, itemStyle: { color: '#cd5c5c' } }, // 深红
          { name: '悲', value: 5431, itemStyle: { color: '#8b4513' } }, // 深棕红
          { name: '乐', value: 1948, itemStyle: { color: '#e9967a' } }, // 浅红
          { name: '思', value: 3960, itemStyle: { color: '#a0522d' } }, // 棕红
          { name: '惧', value: 432, itemStyle: { color: '#800000' } }, // 深红
          { name: '忧', value: 1799, itemStyle: { color: '#b22222' } } // 红褐
        ]
      },
      {
        name: '山水田园诗派',
        itemStyle: { color: '#f4a460' }, // 浅橙红
        children: [
          { name: '喜', value: 2088, itemStyle: { color: '#f4a460' } }, // 浅橙红
          { name: '怒', value: 302, itemStyle: { color: '#cd5c5c' } }, // 深红
          { name: '悲', value: 1614, itemStyle: { color: '#8b4513' } }, // 深棕红
          { name: '乐', value: 3604, itemStyle: { color: '#e9967a' } }, // 浅红
          { name: '思', value: 2460, itemStyle: { color: '#a0522d' } }, // 棕红
          { name: '惧', value: 3, itemStyle: { color: '#800000' } }, // 深红
          { name: '忧', value: 344, itemStyle: { color: '#b22222' } } // 红褐
        ]
      },
      {
        name: '边塞诗派',
        itemStyle: { color: '#993333' }, // 珊瑚红
        children: [
          { name: '喜', value: 1656, itemStyle: { color: '#f4a460' } }, // 浅橙红
          { name: '怒', value: 1003, itemStyle: { color: '#cd5c5c' } }, // 深红
          { name: '悲', value: 5013, itemStyle: { color: '#8b4513' } }, // 深棕红
          { name: '乐', value: 2603, itemStyle: { color: '#e9967a' } }, // 浅红
          { name: '思', value: 4064, itemStyle: { color: '#a0522d' } }, // 棕红
          { name: '惧', value: 156, itemStyle: { color: '#800000' } }, // 深红
          { name: '忧', value: 1632, itemStyle: { color: '#b22222' } } // 红褐
        ]
      }
    ]
  },
  {
    name: '宋',
    itemStyle: { color: '#919e8b' }, // 主题绿色
    children: [
      {
        name: '豪放派',
        itemStyle: { color: '#a8c3a8' }, // 浅绿
        children: [
          { name: '喜', value: 1867, itemStyle: { color: '#b8d8b8' } }, // 浅绿
          { name: '怒', value: 492, itemStyle: { color: '#6b8e23' } }, // 深绿
          { name: '悲', value: 2680, itemStyle: { color: '#556b2f' } }, // 深绿
          { name: '乐', value: 1377, itemStyle: { color: '#a8c3a8' } }, // 浅绿
          { name: '思', value: 1613, itemStyle: { color: '#8fbc8f' } }, // 中绿
          { name: '惧', value: 84, itemStyle: { color: '#2e8b57' } }, // 深绿
          { name: '忧', value: 262, itemStyle: { color: '#3cb371' } } // 中绿
        ]
      },
      {
        name: '婉约派',
        itemStyle: { color: '#8fbc8f' }, // 中绿
        children: [
          { name: '喜', value: 2356, itemStyle: { color: '#b8d8b8' } }, // 浅绿
          { name: '怒', value: 108, itemStyle: { color: '#6b8e23' } }, // 深绿
          { name: '悲', value: 3403, itemStyle: { color: '#556b2f' } }, // 深绿
          { name: '乐', value: 931, itemStyle: { color: '#a8c3a8' } }, // 浅绿
          { name: '思', value: 3640, itemStyle: { color: '#8fbc8f' } }, // 中绿
          { name: '惧', value: 82, itemStyle: { color: '#2e8b57' } }, // 深绿
          { name: '忧', value: 589, itemStyle: { color: '#3cb371' } } // 中绿
        ]
      }
    ]
  },
  {
    name: '元',
    itemStyle: { color: '#d7ab82' }, // 主题黄色
    children: [
      {
        name: '豪放派',
        itemStyle: { color: '#e0b890' }, // 浅黄
        children: [
          { name: '喜', value: 894, itemStyle: { color: '#f0d8a8' } }, // 浅黄
          { name: '怒', value: 491, itemStyle: { color: '#b8860b' } }, // 深黄
          { name: '悲', value: 832, itemStyle: { color: '#8b7355' } }, // 深黄
          { name: '乐', value: 831, itemStyle: { color: '#e0b890' } }, // 浅黄
          { name: '思', value: 736, itemStyle: { color: '#d2b48c' } }, // 中黄
          { name: '惧', value: 218, itemStyle: { color: '#8b4513' } }, // 深黄
          { name: '忧', value: 380, itemStyle: { color: '#a0522d' } } // 棕黄
        ]
      },
      {
        name: '清丽派',
        itemStyle: { color: '#d2b48c' }, // 中黄
        children: [
          { name: '喜', value: 770, itemStyle: { color: '#f0d8a8' } }, // 浅黄
          { name: '怒', value: 107, itemStyle: { color: '#b8860b' } }, // 深黄
          { name: '悲', value: 820, itemStyle: { color: '#8b7355' } }, // 深黄
          { name: '乐', value: 902, itemStyle: { color: '#e0b890' } }, // 浅黄
          { name: '思', value: 924, itemStyle: { color: '#d2b48c' } }, // 中黄
          { name: '惧', value: 401, itemStyle: { color: '#8b4513' } }, // 深黄
          { name: '忧', value: 665, itemStyle: { color: '#a0522d' } } // 棕黄
        ]
      }
    ]
  }
];

const option = {
  title: {
    text: '朝代-派系-情感旭日图',
    left: 'center',
    top: '-2%',
    textStyle: {
      fontFamily: 'TitleFont',
      fontSize: 25,
    }
  },
  tooltip: {
    show:true,
    trigger: 'item',
    formatter: function (params) {
      if (!params || !params.treePathInfo) {
        return '';
      }
      const { treePathInfo, data } = params;
      const value = data?.value ?? 0;
      const dynasty = treePathInfo[1]?.name || '未知';
      const school = treePathInfo[2]?.name || '未知';
      const emotion = treePathInfo[3]?.name || '未知';
      const level = treePathInfo.length;
      
      if (level === 2) {
        return `
          <div>
            <b>朝代：${dynasty}</b><br/>
          </div>
        `;
      } else if (level === 3) {
        return `
          <div>
            <b>朝代：${dynasty}</b><br/>
            <b>派别：${school}</b><br/>
          </div>
        `;
      } else if (level === 4) {
        const parentValue = treePathInfo[2]?.value ?? 0;
        const percent = parentValue > 0 ? ((value / parentValue) * 100).toFixed(1) : '0.0';
        return `
          <div>
            <b>朝代：${dynasty}</b><br/>
            <b>派别：${school}</b><br/>
            <b>情感：${emotion}</b><br/>
            <b>占比：${value}(${percent}%)</b>
          </div>
        `;
      } else {
        return '';
      }
    },
    textStyle: {
      fontFamily: 'ContentFont',
      fontSize: 18
    }
  },
  series: {
    type: 'sunburst',
    data: data,
    label: {
      fontFamily: 'ContentFont',
      fontSize: 14,
      fontWeight: 'bold',
      //textBorderWidth: -100,
    },
    emphasis: {
      focus: 'ancestor',
      label: {
        show: true,
        rotate: 0,
        fontSize: 24,
        fontWeight: 'bold',
        color:'#333'
      }
    },
    radius: [30, '90%'],
    itemStyle: {
      borderRadius: 7,
      borderWidth: 2
    },
    levels: [
      {
        label: { show: true }
      },
      {
        label: { show: true, rotate: 0, fontSize: 20 }
      },
      {
        label: { show: true, rotate: 'tangential', fontSize: 12 }
      },
      {
        r0: '70%',
        r: '75%',
        label: {
          show: true,
          position: 'outside',
          distance: 4,
          minAngle: 3.55
        },
        labelLine: {
          show: true,
          showAbove: true,
          smooth: true,
          minTurnAngle: 45
        }
      }
    ]
  }
};

onMounted(() => {
  if (sunBurst.value) {
    myChart = echarts.init(sunBurst.value);
    myChart.setOption(option);

    // 添加窗口大小改变时的自适应
    window.addEventListener('resize', handleResize);
  }
});

onBeforeUnmount(() => {
  if (myChart) {
    myChart.dispose();
    window.removeEventListener('resize', handleResize);
  }
});

const handleResize = () => {
  if (myChart) {
    myChart.resize();
  }
};
</script>

<style scoped></style>
