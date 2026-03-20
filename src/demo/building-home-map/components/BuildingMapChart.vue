<template>
  <div class="building-map-chart">
    <div ref="chartRef" class="building-map-chart__canvas"></div>

    <div
      v-if="hoverPreview"
      class="building-map-chart__preview"
      :class="`is-${hoverPreview.placement}`"
      :style="previewStyle"
    >
      <div class="building-map-chart__preview-art">
        <ArchitectureSketch
          :variant="getBuildingSketchVariant(hoverPreview.building)"
          :accent="getMapMarkerColor(hoverPreview.building)"
          ink="#5b4435"
        />
        <div class="building-map-chart__preview-era">{{ hoverPreview.building.eraLabel }}</div>
      </div>

      <div class="building-map-chart__preview-body">
        <div class="building-map-chart__preview-title">{{ hoverPreview.building.name }}</div>

        <div class="building-map-chart__preview-meta">
          <span>{{ getStructureType(hoverPreview.building) }}</span>
          <span>{{ hoverPreview.building.level }}</span>
          <span>{{ hoverPreview.building.dynasty }}</span>
          <span>{{ hoverPreview.building.province }} {{ hoverPreview.building.city }}</span>
        </div>

        <p>{{ hoverPreview.building.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { GeoComponent } from 'echarts/components';
import { EffectScatterChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import chinaJson from '@/assets/map/china.json';
import ArchitectureSketch from '@/demo/building-section-catalog/components/ArchitectureSketch.vue';
import {
  getBuildingSketchVariant,
  getBuildingSymbol,
  getBuildingSymbolSize,
  getStructureColor,
  getStructureType,
} from '@/demo/building-home-map/metadata';

import type { CSSProperties } from 'vue';
import type { BuildingRecord } from '../types';

echarts.use([GeoComponent, ScatterChart, EffectScatterChart, CanvasRenderer]);

interface HoverPreviewState {
  building: BuildingRecord;
  left: number;
  top: number;
  width: number;
  arrowLeft: number;
  placement: 'top' | 'bottom';
}

const props = defineProps<{
  buildings: BuildingRecord[];
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [buildingId: string];
}>();

const PREVIEW_CARD_BASE_WIDTH = 320;
const PREVIEW_CARD_HEIGHT = 258;
const PREVIEW_EDGE_GAP = 16;
const PREVIEW_POINT_OFFSET = 18;
const MIN_GEO_ZOOM = 1;
const MAX_GEO_ZOOM = 8;
const INITIAL_GEO_ZOOM = 7.2;
const INITIAL_GEO_CENTER: [number, number] = [113.7, 37.9];
const INITIAL_LAYOUT_CENTER: [string, string] = ['48%', '56%'];
const INITIAL_LAYOUT_SIZE = '118%';
const HIT_SYMBOL_SIZE = 24;
const MAP_TEXT_PRIMARY = '#8C3F30';
const MAP_TEXT_SECONDARY = '#9B6D5F';
const MAP_BOUNDARY = 'rgba(242, 238, 230, 0.76)';
const MAP_BOUNDARY_SOFT = 'rgba(242, 238, 230, 0.52)';
const MAP_AREA = 'rgba(216, 209, 196, 0.74)';
const MAP_AREA_HOVER = 'rgba(224, 216, 202, 0.84)';
const MARKER_RED = '#9A4336';
const MARKER_RED_MUTED = '#B05A4A';
const MARKER_GREEN = '#97ACA0';
const MARKER_GREEN_SOFT = '#B4C1B8';
const MARKER_EARTH = '#B89A82';
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const chartRef = ref<HTMLDivElement | null>(null);
const hoverPreview = ref<HoverPreviewState | null>(null);

let chart: echarts.ECharts | null = null;
let zrGlobalOutHandler: (() => void) | null = null;
let syncingGeoRoam = false;

const geoZoom = ref(INITIAL_GEO_ZOOM);
const geoCenter = ref<[number, number] | undefined>(INITIAL_GEO_CENTER);

const selectedBuilding = computed(
  () => props.buildings.find((building) => building.id === props.selectedId) ?? null,
);

const previewStyle = computed<CSSProperties | undefined>(() => {
  if (!hoverPreview.value) {
    return undefined;
  }

  return {
    left: `${hoverPreview.value.left}px`,
    top: `${hoverPreview.value.top}px`,
    width: `${hoverPreview.value.width}px`,
    '--preview-arrow-left': `${hoverPreview.value.arrowLeft}px`,
    '--preview-accent': getMapMarkerColor(hoverPreview.value.building),
  } as CSSProperties;
});

const getMapMarkerColor = (building: BuildingRecord) => {
  const baseColor = getStructureColor(building).toLowerCase();
  if (baseColor === '#a3473a') return MARKER_RED;
  if (baseColor === '#6f7f8f') return MARKER_RED_MUTED;
  if (baseColor === '#b67a4a') return MARKER_GREEN_SOFT;
  if (baseColor === '#4b765f') return MARKER_GREEN;
  if ((building.importance ?? 0) <= 1) return MARKER_EARTH;
  return getStructureColor(building);
};

const createPoint = (building: BuildingRecord, options?: { focused?: boolean; hitArea?: boolean }) => {
  const color = getMapMarkerColor(building);
  const baseSize = getBuildingSymbolSize(building);
  const markerSize = clamp(baseSize - 3, 6, 12);
  const focused = options?.focused ?? false;
  const hitArea = options?.hitArea ?? false;

  return {
    name: building.name,
    value: [...building.coordinates, building.importance],
    buildingId: building.id,
    building,
    symbol: getBuildingSymbol(building),
    symbolSize: hitArea ? Math.max(HIT_SYMBOL_SIZE, markerSize + 14) : focused ? markerSize + 2 : markerSize,
    itemStyle: {
      color: hitArea ? 'rgba(0, 0, 0, 0.001)' : color,
      borderColor: hitArea
        ? 'rgba(0, 0, 0, 0)'
        : focused
          ? 'rgba(242, 238, 230, 0.72)'
          : 'rgba(0, 0, 0, 0)',
      borderWidth: hitArea ? 0 : focused ? 1.2 : 0.2,
      shadowBlur: hitArea ? 0 : focused ? 7 : 0,
      shadowColor: hitArea ? 'transparent' : focused ? `${color}40` : 'transparent',
      opacity: hitArea ? 1 : focused ? 0.95 : 0.9,
    },
  };
};

const clearHoverPreview = () => {
  hoverPreview.value = null;
};

const updateHoverPreview = (building: BuildingRecord, event: { offsetX?: number; offsetY?: number }) => {
  if (!chartRef.value || typeof event.offsetX !== 'number' || typeof event.offsetY !== 'number') {
    return;
  }

  const cardWidth = Math.min(
    PREVIEW_CARD_BASE_WIDTH,
    Math.max(208, chartRef.value.clientWidth - PREVIEW_EDGE_GAP * 2),
  );
  const maxLeft = Math.max(PREVIEW_EDGE_GAP, chartRef.value.clientWidth - cardWidth - PREVIEW_EDGE_GAP);
  const preferredLeft = event.offsetX - cardWidth / 2;
  const left = clamp(preferredLeft, PREVIEW_EDGE_GAP, maxLeft);
  const placement: HoverPreviewState['placement'] =
    event.offsetY > PREVIEW_CARD_HEIGHT + PREVIEW_EDGE_GAP * 2 ? 'top' : 'bottom';

  const top = placement === 'top'
    ? Math.max(PREVIEW_EDGE_GAP, event.offsetY - PREVIEW_CARD_HEIGHT - PREVIEW_POINT_OFFSET)
    : Math.min(
        Math.max(PREVIEW_EDGE_GAP, chartRef.value.clientHeight - PREVIEW_CARD_HEIGHT - PREVIEW_EDGE_GAP),
        event.offsetY + PREVIEW_POINT_OFFSET,
      );

  hoverPreview.value = {
    building,
    left,
    top,
    width: cardWidth,
    arrowLeft: clamp(event.offsetX - left, 34, cardWidth - 34),
    placement,
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

    chart.on('mouseover', (params) => {
      const building = (params.data as { building?: BuildingRecord } | undefined)?.building;
      if (building && params.event) {
        updateHoverPreview(building, params.event as { offsetX?: number; offsetY?: number });
      }
    });

    chart.on('mousemove', (params) => {
      const building = (params.data as { building?: BuildingRecord } | undefined)?.building;
      if (building && params.event) {
        updateHoverPreview(building, params.event as { offsetX?: number; offsetY?: number });
      }
    });

    chart.on('mouseout', () => {
      clearHoverPreview();
    });

    chart.on('georoam', () => {
      if (syncingGeoRoam) {
        return;
      }

      clearHoverPreview();

      const option = chart?.getOption() as { geo?: Array<{ zoom?: number; center?: [number, number] }> } | undefined;
      const geos = option?.geo ?? [];
      const mainGeo = geos[1] ?? geos[0];

      if (mainGeo?.zoom) {
        geoZoom.value = mainGeo.zoom;
      }

      if (mainGeo?.center) {
        geoCenter.value = mainGeo.center;
      }

      if (chart && geos.length > 1 && mainGeo?.zoom && mainGeo?.center) {
        syncingGeoRoam = true;
        chart.setOption(
          {
            geo: [
              {
                zoom: mainGeo.zoom,
                center: mainGeo.center,
              },
              {
                zoom: mainGeo.zoom,
                center: mainGeo.center,
              },
            ],
          },
          { lazyUpdate: true },
        );
        syncingGeoRoam = false;
      }
    });

    zrGlobalOutHandler = () => {
      clearHoverPreview();
    };
    chart.getZr().on('globalout', zrGlobalOutHandler);
  }

  echarts.registerMap('china-building-demo', chinaJson as never);

  const outerOutlineGeoOption = {
    map: 'china-building-demo',
    roam: false,
    zoom: geoZoom.value,
    center: geoCenter.value,
    aspectScale: 0.88,
    scaleLimit: {
      min: MIN_GEO_ZOOM,
      max: MAX_GEO_ZOOM,
    },
    layoutCenter: INITIAL_LAYOUT_CENTER,
    layoutSize: INITIAL_LAYOUT_SIZE,
    selectedMode: false,
    silent: true,
    label: {
      show: false,
    },
    emphasis: {
      disabled: true,
    },
    itemStyle: {
      areaColor: 'rgba(0, 0, 0, 0)',
      borderColor: MAP_BOUNDARY,
      borderWidth: 2,
    },
  };

  const geoOption = {
    map: 'china-building-demo',
    roam: true,
    zoom: geoZoom.value,
    center: geoCenter.value,
    aspectScale: 0.88,
    scaleLimit: {
      min: MIN_GEO_ZOOM,
      max: MAX_GEO_ZOOM,
    },
    layoutCenter: INITIAL_LAYOUT_CENTER,
    layoutSize: INITIAL_LAYOUT_SIZE,
    selectedMode: false,
    label: {
      show: true,
      color: MAP_TEXT_PRIMARY,
      opacity: 0.9,
      fontSize: 17,
      fontWeight: 500,
      fontFamily: "'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', serif",
    },
    emphasis: {
      label: {
        color: MAP_TEXT_PRIMARY,
      },
      itemStyle: {
        areaColor: MAP_AREA_HOVER,
        borderColor: MAP_BOUNDARY,
        borderWidth: 1.2,
      },
    },
    itemStyle: {
      areaColor: MAP_AREA,
      borderColor: MAP_BOUNDARY_SOFT,
      borderWidth: 1,
    },
  };

  const interactivePoints = props.buildings.map((building) => createPoint(building, { hitArea: true }));

  const normalPoints = props.buildings
    .filter((building) => building.id !== props.selectedId)
    .map((building) => createPoint(building));

  const focusPoints = selectedBuilding.value ? [createPoint(selectedBuilding.value, { focused: true })] : [];

  chart.setOption({
    backgroundColor: 'transparent',
    animationDurationUpdate: 0,
    geo: [outerOutlineGeoOption, geoOption],
    series: [
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 1,
        data: interactivePoints,
        z: 6,
        emphasis: {
          disabled: true,
        },
      },
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 1,
        data: normalPoints,
        silent: true,
        z: 4,
        emphasis: {
          scale: 1.18,
        },
      },
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        geoIndex: 1,
        data: focusPoints,
        silent: true,
        z: 5,
        showEffectOn: 'render',
        rippleEffect: {
          scale: 2.6,
          brushType: 'stroke',
        },
        label: {
          show: true,
          position: 'right',
          distance: 8,
          formatter: ({ data }: { data?: { building?: BuildingRecord } }) => data?.building?.name ?? '',
          color: MAP_TEXT_SECONDARY,
          fontSize: 11,
          fontFamily: "'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', serif",
          backgroundColor: 'rgba(230, 224, 211, 0.72)',
          borderColor: 'rgba(0, 0, 0, 0)',
          borderWidth: 0,
          borderRadius: 999,
          padding: [4, 9, 3, 9],
        },
      },
    ],
  });

  chart.resize();
};

const handleResize = () => {
  clearHoverPreview();
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
  if (chart && zrGlobalOutHandler) {
    chart.getZr().off('globalout', zrGlobalOutHandler);
  }
  chart?.dispose();
  chart = null;
  zrGlobalOutHandler = null;
});
</script>

<style scoped lang="scss">
.building-map-chart {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100vh;
}

.building-map-chart__canvas {
  width: 100%;
  height: 100%;
  min-height: 100vh;
}

.building-map-chart__preview {
  position: absolute;
  z-index: 6;
  overflow: hidden;
  pointer-events: none;
  border: 1px solid rgba(151, 116, 91, 0.24);
  border-radius: 24px 10px 24px 10px;
  background:
    linear-gradient(180deg, rgba(248, 241, 228, 0.96), rgba(238, 227, 210, 0.94)),
    radial-gradient(circle at 16% 16%, rgba(255, 255, 255, 0.26), transparent 28%);
  box-shadow: 0 18px 36px rgba(72, 52, 40, 0.16);
}

.building-map-chart__preview::after {
  content: '';
  position: absolute;
  left: var(--preview-arrow-left);
  width: 18px;
  height: 18px;
  background: inherit;
  border: inherit;
  border-top: none;
  border-left: none;
  transform: translateX(-50%) rotate(45deg);
}

.building-map-chart__preview.is-top::after {
  bottom: -10px;
}

.building-map-chart__preview.is-bottom::after {
  top: -10px;
  transform: translateX(-50%) rotate(225deg);
}

.building-map-chart__preview-art {
  position: relative;
  height: 128px;
  padding: 12px 14px 0;
  background:
    radial-gradient(circle at 18% 28%, rgba(255, 255, 255, 0.24), transparent 24%),
    linear-gradient(180deg, rgba(255, 250, 242, 0.8), rgba(240, 232, 219, 0.54));
  border-bottom: 1px solid rgba(151, 116, 91, 0.14);
}

.building-map-chart__preview-era {
  position: absolute;
  top: 12px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  background: rgba(244, 236, 222, 0.92);
  border: 1px solid rgba(153, 116, 91, 0.2);
  font-family: 'ContentFont', serif;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: rgba(92, 66, 52, 0.82);
}

.building-map-chart__preview-body {
  padding: 12px 14px 14px;
}

.building-map-chart__preview-title {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 22px;
  line-height: 1.15;
  color: #5b261d;
}

.building-map-chart__preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 9px;
}

.building-map-chart__preview-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--preview-accent) 18%, #c89e74 82%);
  background: rgba(249, 244, 236, 0.84);
  font-family: 'ContentFont', serif;
  font-size: 11px;
  color: rgba(82, 58, 46, 0.82);
}

.building-map-chart__preview-body p {
  margin: 0;
  font-family: 'ContentFont', serif;
  font-size: 12px;
  line-height: 1.72;
  color: rgba(78, 56, 43, 0.84);
}

@media (max-width: 980px) {
  .building-map-chart,
  .building-map-chart__canvas {
    min-height: 72vh;
  }

  .building-map-chart__preview {
    max-width: calc(100vw - 32px);
  }
}
</style>
