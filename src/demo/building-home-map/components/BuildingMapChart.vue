<template>
  <div ref="chartRef" class="building-map-chart"></div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { GeoComponent, TooltipComponent } from 'echarts/components';
import { EffectScatterChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import chinaJson from '@/assets/map/china.json';
import {
  getBuildingSymbol,
  getBuildingSymbolSize,
  getStructureColor,
  getStructureType,
} from '@/demo/building-home-map/metadata';

import type { BuildingRecord } from '../types';

echarts.use([GeoComponent, TooltipComponent, ScatterChart, EffectScatterChart, CanvasRenderer]);

const props = defineProps<{
  buildings: BuildingRecord[];
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [buildingId: string];
}>();

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
const geoZoom = ref(1.08);
const geoCenter = ref<[number, number] | undefined>(undefined);

const selectedBuilding = computed(
  () => props.buildings.find((building) => building.id === props.selectedId) ?? null,
);

const createPoint = (building: BuildingRecord, focused = false) => {
  const color = getStructureColor(building);
  const baseSize = getBuildingSymbolSize(building);

  return {
    name: building.name,
    value: [...building.coordinates, building.importance],
    buildingId: building.id,
    building,
    symbol: getBuildingSymbol(building),
    symbolSize: focused ? baseSize + 5 : baseSize,
    itemStyle: {
      color,
      borderColor: focused ? 'rgba(248, 241, 229, 0.96)' : 'rgba(245, 236, 222, 0.88)',
      borderWidth: focused ? 1.8 : 1.05,
      shadowBlur: focused ? 18 : 10,
      shadowColor: focused ? `${color}66` : `${color}3d`,
      opacity: 0.98,
    },
  };
};

const renderChart = () => {
  if (!chartRef.value) {
    return;
  }

  if (!chart) {
    chart = echarts.init(chartRef.value);

    chart.on('click', (params) => {
      const buildingId = (params.data as { buildingId?: string } | undefined)?.buildingId;
      if (buildingId) {
        emit('select', buildingId);
      }
    });

    chart.on('georoam', () => {
      const option = chart?.getOption() as { geo?: Array<{ zoom?: number; center?: [number, number] }> } | undefined;
      const geoOption = option?.geo?.[0];

      if (geoOption?.zoom) {
        geoZoom.value = geoOption.zoom;
      }

      if (geoOption?.center) {
        geoCenter.value = geoOption.center;
      }
    });
  }

  echarts.registerMap('china-building-demo', chinaJson as never);

  const normalPoints = props.buildings
    .filter((building) => building.id !== props.selectedId)
    .map((building) => createPoint(building));

  const focusPoints = selectedBuilding.value ? [createPoint(selectedBuilding.value, true)] : [];

  chart.setOption({
    backgroundColor: 'transparent',
    animationDurationUpdate: 0,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(242, 233, 217, 0.98)',
      borderColor: 'rgba(148, 119, 96, 0.34)',
      borderWidth: 1,
      padding: 12,
      extraCssText: 'border-radius: 12px; box-shadow: 0 12px 24px rgba(72, 52, 40, 0.14);',
      textStyle: {
        color: '#4c382b',
        fontFamily: 'ContentFont',
      },
      formatter: (params: { data?: { building?: BuildingRecord } }) => {
        const building = params.data?.building;
        if (!building) {
          return '';
        }

        return [
          `<div style="font-family: ChartTitleFont, TitleFont, serif; font-size:18px; color:#5f2c22; margin-bottom:6px;">${building.name}</div>`,
          `<div style="margin-bottom:2px;">${getStructureType(building)} / ${building.category}</div>`,
          `<div style="margin-bottom:2px;">${building.eraLabel}</div>`,
          `<div>${building.province}${building.city}</div>`,
        ].join('');
      },
    },
    geo: {
      map: 'china-building-demo',
      roam: true,
      zoom: geoZoom.value,
      center: geoCenter.value,
      aspectScale: 0.94,
      scaleLimit: {
        min: 1,
        max: 6,
      },
      layoutCenter: ['50%', '54%'],
      layoutSize: '112%',
      selectedMode: false,
      label: {
        show: true,
        color: 'rgba(152, 91, 72, 0.56)',
        fontSize: 15,
        fontFamily: 'ContentFont',
      },
      emphasis: {
        label: {
          color: '#8d392c',
        },
        itemStyle: {
          areaColor: 'rgba(225, 213, 194, 0.54)',
          borderColor: 'rgba(167, 137, 112, 0.98)',
          borderWidth: 1.8,
        },
      },
      itemStyle: {
        areaColor: 'rgba(207, 194, 175, 0.38)',
        borderColor: 'rgba(147, 125, 106, 0.9)',
        borderWidth: 1.45,
      },
    },
    series: [
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        data: normalPoints,
        emphasis: {
          scale: 1.18,
        },
      },
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: focusPoints,
        showEffectOn: 'render',
        rippleEffect: {
          scale: 3.4,
          brushType: 'stroke',
        },
        label: {
          show: true,
          position: 'right',
          distance: 8,
          formatter: ({ data }: { data?: { building?: BuildingRecord } }) => data?.building?.name ?? '',
          color: '#5d2a21',
          fontSize: 13,
          fontFamily: 'ContentFont',
          backgroundColor: 'rgba(244, 236, 223, 0.94)',
          borderColor: 'rgba(149, 117, 94, 0.24)',
          borderWidth: 1,
          borderRadius: 999,
          padding: [4, 9, 3, 9],
        },
      },
    ],
  });

  chart.resize();
};

const handleResize = () => {
  chart?.resize();
};

watch(
  () => [props.buildings, props.selectedId],
  () => {
    renderChart();
  },
  { deep: true },
);

onMounted(() => {
  renderChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chart?.dispose();
  chart = null;
});
</script>

<style scoped>
.building-map-chart {
  width: 100%;
  height: 100%;
  min-height: 100vh;
}
</style>
