<template>
  <section class="building-map-screen">
    <BuildingMapChart
      class="building-map-screen__chart"
      :buildings="filteredBuildings"
      :selected-id="selectedBuildingId"
      @select="handleSelect"
    />

    <div class="building-map-screen__wash"></div>
    <div class="building-map-screen__grain"></div>
    <div class="building-map-screen__motif"></div>

    <div class="screen-ui">
      <header class="map-brand">
        <div class="map-brand__seal">{{ uiText.brandSealTop }}<br />{{ uiText.brandSealBottom }}</div>
        <div class="map-brand__content">
          <div class="map-brand__eyebrow">Chinese Traditional Architecture Atlas</div>
          <h1>{{ uiText.pageTitle }}</h1>
          <p>{{ uiText.pageCopy }}</p>
        </div>
      </header>

      <div class="map-legend">
        <div v-for="item in structureLegend" :key="item.key" class="map-legend__item">
          <span class="map-legend__dot" :style="{ '--legend-color': item.color }"></span>
          <span>{{ item.label }}</span>
        </div>
      </div>

      <aside class="side-panel side-panel--left">
        <section class="legend-block">
          <h2 class="legend-block__title">{{ uiText.structureTitle }}</h2>
          <p class="legend-block__copy">{{ uiText.structureCopy }}</p>

          <button
            v-for="item in structureLegend"
            :key="item.key"
            type="button"
            class="legend-row legend-row--structure"
            :class="{ active: activeStructure === item.key }"
            @click="toggleStructure(item.key)"
          >
            <span class="legend-row__text">
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </span>
            <span class="legend-row__meta">
              <i class="legend-row__dot" :style="{ '--legend-color': item.color }"></i>
              <em>{{ structureCounts[item.key] }}</em>
            </span>
          </button>
        </section>

        <section class="legend-block">
          <h2 class="legend-block__title">{{ uiText.planTitle }}</h2>
          <div class="legend-block__hint">{{ uiText.planHint }}</div>

          <div class="plan-legend">
            <div class="plan-legend__column">
              <div v-for="item in pointShapeLegend" :key="item.label" class="plan-row">
                <span>{{ item.label }}</span>
                <i
                  class="plan-shape"
                  :class="`plan-shape--${item.className}`"
                  :style="{ '--shape-size': `${item.size}px` }"
                ></i>
              </div>
            </div>

            <div class="plan-legend__divider"></div>

            <div class="plan-legend__column">
              <div v-for="item in depthSizeLegend" :key="item.label" class="plan-row plan-row--depth">
                <span>{{ item.label }}</span>
                <i class="plan-size" :style="{ '--shape-size': `${item.size}px` }"></i>
              </div>
            </div>
          </div>
        </section>

        <section class="legend-block legend-block--note">
          <h2 class="legend-block__title">{{ uiText.noteTitle }}</h2>
          <p class="legend-block__copy">{{ uiText.noteCopy }}</p>
        </section>
      </aside>

      <aside class="side-panel side-panel--right">
        <BuildingTimeline
          :buildings="filteredBuildings"
          :selected-id="selectedBuildingId"
          @select="handleSelect"
        />
      </aside>

      <div v-if="selectedBuilding" class="selection-card">
        <div class="selection-card__eyebrow">{{ selectedBuilding.eraLabel }}</div>
        <div class="selection-card__title">{{ selectedBuilding.name }}</div>
        <div class="selection-card__meta">
          <span>{{ getStructureType(selectedBuilding) }}</span>
          <span>{{ selectedBuilding.category }}</span>
          <span>{{ selectedBuilding.dynasty }}</span>
          <span>{{ selectedBuilding.province }} {{ selectedBuilding.city }}</span>
        </div>
        <p>{{ selectedBuilding.description }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import BuildingMapChart from '@/demo/building-home-map/components/BuildingMapChart.vue';
import BuildingTimeline from '@/demo/building-home-map/components/BuildingTimeline.vue';
import rawBuildings from '@/demo/building-home-map/data/buildings.json';
import {
  depthSizeLegend,
  getStructureType,
  pointShapeLegend,
  structureLegend,
  type StructureType,
} from '@/demo/building-home-map/metadata';

import type { BuildingRecord } from '@/demo/building-home-map/types';

const buildings = rawBuildings as BuildingRecord[];

const uiText = {
  brandSealTop: '\u8425',
  brandSealBottom: '\u9020',
  pageTitle: '\u4e2d\u56fd\u53e4\u5efa\u7b51\u5206\u5e03\u56fe',
  pageCopy: '\u4ee5\u8425\u9020\u5f62\u5236\u3001\u5e73\u9762\u5c3a\u5ea6\u4e0e\u65f6\u4ee3\u5206\u5e03\u89c2\u5bdf\u4e2d\u56fd\u53e4\u5efa\u7b51\u7684\u7a7a\u95f4\u8109\u7edc\u3002',
  structureTitle: '\u8425\u9020\u5f62\u5236',
  structureCopy: '\u6309\u4e3b\u4f53\u7a7a\u95f4\u7c7b\u578b\u7b5b\u9009\u5730\u56fe\u6837\u672c\uff0c\u89c2\u5bdf\u6728\u6784\u8425\u9020\u7684\u533a\u57df\u5206\u5e03\u3002',
  planTitle: '\u5e73\u9762\u5c3a\u5ea6',
  planHint: '\u9762\u9614\u4e0e\u8fdb\u6df1\u4ee5\u56fe\u5f62\u6837\u5f0f\u7f16\u7801',
  noteTitle: '\u8bfb\u56fe\u8bf4\u660e',
  noteCopy: '\u989c\u8272\u5bf9\u5e94\u8425\u9020\u5f62\u5236\uff0c\u70b9\u5f62\u4e0e\u70b9\u5f84\u5206\u522b\u5bf9\u5e94\u5efa\u7b51\u5e73\u9762\u5c3a\u5ea6\u4e0e\u91cd\u8981\u7a0b\u5ea6\u3002',
} as const;

const activeStructure = ref<StructureType | null>(null);
const selectedBuildingId = ref<string | null>(buildings[0]?.id ?? null);

const structureCounts = computed(() =>
  Object.fromEntries(
    structureLegend.map((item) => [
      item.key,
      buildings.filter((building) => getStructureType(building) === item.key).length,
    ]),
  ) as Record<StructureType, number>,
);

const filteredBuildings = computed(() =>
  buildings.filter((building) => !activeStructure.value || getStructureType(building) === activeStructure.value),
);

const selectedBuilding = computed(
  () => filteredBuildings.value.find((building) => building.id === selectedBuildingId.value) ?? filteredBuildings.value[0] ?? null,
);

const toggleStructure = (structure: StructureType) => {
  activeStructure.value = activeStructure.value === structure ? null : structure;
};

const handleSelect = (buildingId: string) => {
  selectedBuildingId.value = buildingId;
};

watch(
  filteredBuildings,
  (items) => {
    if (!items.some((item) => item.id === selectedBuildingId.value)) {
      selectedBuildingId.value = items[0]?.id ?? null;
    }
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.building-map-screen {
  --paper: #ece3d2;
  --paper-soft: rgba(242, 234, 219, 0.92);
  --paper-strong: rgba(235, 226, 210, 0.96);
  --line: rgba(147, 116, 93, 0.3);
  --ink: #514033;
  --ink-soft: rgba(81, 64, 51, 0.74);
  --red: #a3473a;
  --green: #4c755e;
  --earth: #b97747;
  --shadow: rgba(72, 52, 40, 0.1);
  box-sizing: border-box;
  position: fixed;
  inset: 0;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(242, 234, 219, 0.98), rgba(232, 223, 208, 0.98)),
    linear-gradient(90deg, rgba(255, 255, 255, 0.14), transparent 28%, transparent 72%, rgba(255, 255, 255, 0.12));
}

.building-map-screen__chart,
.building-map-screen__wash,
.building-map-screen__grain,
.building-map-screen__motif {
  position: absolute;
  inset: 0;
}

.building-map-screen__chart {
  z-index: 0;
}

.building-map-screen__wash {
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.34), transparent 18%),
    radial-gradient(circle at 82% 18%, rgba(255, 255, 255, 0.24), transparent 20%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
}

.building-map-screen__grain {
  z-index: 1;
  pointer-events: none;
  background:
    repeating-linear-gradient(
      135deg,
      rgba(124, 96, 76, 0.03) 0,
      rgba(124, 96, 76, 0.03) 1px,
      transparent 1px,
      transparent 14px
    );
  mix-blend-mode: multiply;
}

.building-map-screen__motif {
  z-index: 1;
  pointer-events: none;
  opacity: 0.18;
  background:
    radial-gradient(circle at 38% 46%, rgba(128, 96, 77, 0.11), transparent 24%),
    radial-gradient(circle at 70% 58%, rgba(128, 96, 77, 0.08), transparent 22%);
}

.screen-ui {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.map-brand,
.map-legend,
.side-panel,
.selection-card {
  position: absolute;
  pointer-events: auto;
}

.map-brand {
  top: 22px;
  left: 26px;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 12px;
  width: min(338px, calc(100vw - 52px));
  padding: 14px 14px 12px;
  border: 1px solid rgba(154, 121, 98, 0.18);
  background: rgba(241, 233, 218, 0.8);
  box-shadow: 0 10px 24px var(--shadow);
}

.map-brand__seal {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(163, 72, 58, 0.38);
  background: rgba(163, 72, 58, 0.06);
  color: var(--red);
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 22px;
  line-height: 1.08;
  text-align: center;
}

.map-brand__eyebrow {
  margin-bottom: 6px;
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.22em;
  color: rgba(96, 74, 61, 0.68);
}

.map-brand h1 {
  margin: 0;
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: clamp(26px, 2.4vw, 34px);
  line-height: 1.05;
  color: #612a20;
  letter-spacing: 0.05em;
}

.map-brand p {
  margin: 6px 0 0;
  font-family: 'ContentFont', serif;
  font-size: 12px;
  line-height: 1.65;
  color: var(--ink-soft);
}

.map-legend {
  top: 28px;
  right: 26px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 8px 10px;
  background: rgba(241, 233, 218, 0.74);
  border: 1px solid rgba(154, 121, 98, 0.14);
}

.map-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'ContentFont', serif;
  font-size: 13px;
  color: var(--ink);
}

.map-legend__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--legend-color);
}

.side-panel {
  background: rgba(239, 231, 215, 0.8);
  border: 1px solid rgba(154, 121, 98, 0.12);
  box-shadow: 0 12px 28px rgba(72, 52, 40, 0.08);
}

.side-panel--left {
  top: 184px;
  left: 26px;
  width: 178px;
  padding: 14px 14px 12px;
}

.side-panel--right {
  top: 122px;
  right: 26px;
  bottom: 26px;
  width: 206px;
  padding: 12px 12px 10px;
  display: flex;
}

.side-panel--right :deep(.line-timeline) {
  flex: 1 1 auto;
  min-height: 0;
}

.legend-block + .legend-block {
  margin-top: 16px;
}

.legend-block__title {
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(163, 72, 58, 0.38);
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', 'Songti SC', serif;
  font-size: 17px;
  line-height: 1.1;
  color: #a13f33;
  letter-spacing: 0.04em;
}

.legend-block__copy,
.legend-block__hint {
  margin: 8px 0 0;
  font-family: 'STSong', 'SimSun', 'Songti SC', serif;
  font-size: 11px;
  line-height: 1.55;
  color: rgba(92, 67, 55, 0.76);
}

.legend-row {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0 7px;
  border: none;
  border-bottom: 1px dashed rgba(149, 117, 94, 0.18);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, color 0.18s ease;
}

.legend-row:hover,
.legend-row.active {
  transform: translateX(2px);
}

.legend-row__text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.legend-row__text strong {
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', 'Songti SC', serif;
  font-size: 14px;
  color: #5f4032;
  font-weight: 600;
}

.legend-row__text small {
  font-family: 'STSong', 'SimSun', 'Songti SC', serif;
  font-size: 9px;
  line-height: 1.45;
  color: rgba(96, 74, 61, 0.72);
}

.legend-row.active .legend-row__text strong {
  color: #953f32;
}

.legend-row__meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.legend-row__dot {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: var(--legend-color);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.24);
}

.legend-row__meta em {
  font-family: 'STSong', 'SimSun', 'Songti SC', serif;
  font-size: 10px;
  font-style: normal;
  color: rgba(88, 64, 52, 0.72);
}

.plan-legend {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  gap: 8px;
  margin-top: 10px;
}

.plan-legend__column {
  display: grid;
  gap: 6px;
}

.plan-legend__divider {
  background: linear-gradient(180deg, rgba(163, 72, 58, 0.18), rgba(163, 72, 58, 0.42), rgba(163, 72, 58, 0.18));
}

.plan-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-family: 'STSong', 'SimSun', 'Songti SC', serif;
  font-size: 11px;
  color: rgba(83, 63, 52, 0.82);
}

.plan-row--depth {
  justify-content: flex-start;
}

.plan-shape,
.plan-size {
  position: relative;
  flex: 0 0 auto;
}

.plan-shape--triangle {
  width: 0;
  height: 0;
  border-left: calc(var(--shape-size) * 0.5) solid transparent;
  border-right: calc(var(--shape-size) * 0.5) solid transparent;
  border-bottom: var(--shape-size) solid var(--green);
}

.plan-shape--rect {
  width: var(--shape-size);
  height: var(--shape-size);
  background: var(--green);
}

.plan-shape--pentagon {
  width: var(--shape-size);
  height: var(--shape-size);
  background: var(--green);
  clip-path: polygon(50% 0, 100% 38%, 81% 100%, 19% 100%, 0 38%);
}

.plan-shape--circle,
.plan-shape--circle-large,
.plan-size {
  width: var(--shape-size);
  height: var(--shape-size);
  border-radius: 999px;
  background: var(--green);
}

.legend-block--note {
  padding-top: 2px;
}

.selection-card {
  left: 50%;
  bottom: 20px;
  width: min(420px, calc(100vw - 468px));
  transform: translateX(-50%);
  padding: 14px 16px;
  background: rgba(242, 234, 219, 0.92);
  border: 1px solid rgba(154, 121, 98, 0.16);
  box-shadow: 0 12px 26px rgba(72, 52, 40, 0.1);
}

.selection-card__eyebrow {
  margin-bottom: 4px;
  font-family: 'ContentFont', serif;
  font-size: 11px;
  letter-spacing: 0.2em;
  color: rgba(102, 75, 61, 0.72);
}

.selection-card__title {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 25px;
  line-height: 1.12;
  color: #5a281f;
}

.selection-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}

.selection-card__meta span {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px 3px;
  background: rgba(249, 244, 236, 0.86);
  border: 1px solid rgba(150, 118, 95, 0.14);
  font-family: 'ContentFont', serif;
  font-size: 12px;
  color: rgba(80, 56, 44, 0.84);
}

.selection-card p {
  margin: 0;
  font-family: 'ContentFont', serif;
  font-size: 13px;
  line-height: 1.65;
  color: rgba(79, 57, 44, 0.8);
}

@media (max-width: 1180px) {
  .selection-card {
    width: min(360px, calc(100vw - 430px));
  }
}

@media (max-width: 980px) {
  .building-map-screen {
    position: relative;
    min-height: auto;
    overflow: auto;
  }

  .screen-ui {
    position: relative;
  }

  .map-brand,
  .map-legend,
  .side-panel,
  .selection-card {
    position: relative;
    inset: auto;
    transform: none;
    width: calc(100% - 24px);
    margin: 12px;
  }

  .map-brand {
    grid-template-columns: 42px minmax(0, 1fr);
  }

  .map-legend {
    flex-wrap: wrap;
    gap: 10px 16px;
  }

  .side-panel--left,
  .side-panel--right {
    padding: 14px 12px;
  }
}
</style>
