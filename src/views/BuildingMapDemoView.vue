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

          <div class="importance-legend">
            <div v-for="item in importanceLegend" :key="item.label" class="importance-row">
              <span class="importance-row__marker">
                <i
                  class="plan-shape"
                  :class="`plan-shape--${item.className}`"
                  :style="{ '--shape-size': `${item.size}px` }"
                ></i>
              </span>

              <span class="importance-row__copy">
                <strong>{{ item.label }}</strong>
                <em>{{ item.title }}</em>
                <small>{{ item.description }}</small>
              </span>
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
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import rawBuildings from '../../building-jittered.json';
import BuildingMapChart from '@/demo/building-home-map/components/BuildingMapChart.vue';
import BuildingTimeline from '@/demo/building-home-map/components/BuildingTimeline.vue';
import {
  getStructureType,
  importanceLegend,
  structureLegend,
  type StructureType,
} from '@/demo/building-home-map/metadata';

import type { BuildingRecord } from '@/demo/building-home-map/types';

const buildings = rawBuildings as BuildingRecord[];

const uiText = {
  structureTitle: '\u5efa\u7b51\u5206\u7c7b',
  structureCopy: '\u6309\u6c11\u5c45\u3001\u5b98\u5e9c\u3001\u7687\u5bab\u3001\u6865\u6881\u7b5b\u9009\u5730\u56fe\u5efa\u7b51\u6837\u672c\u3002',
  planTitle: '\u6837\u672c\u7b49\u7ea7',
  planHint: '\u7b49\u7ea7\u8d8a\u9ad8\uff0c\u5730\u56fe\u6807\u8bb0\u8d8a\u9192\u76ee',
  noteTitle: '\u8bfb\u56fe\u8bf4\u660e',
  noteCopy: '\u989c\u8272\u770b\u5efa\u7b51\u7c7b\u578b\uff0c\u6807\u8bb0\u770b\u91cd\u8981\u7b49\u7ea7\u3002',
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

.map-legend,
.side-panel {
  position: absolute;
  pointer-events: auto;
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
  background: rgba(239, 231, 215, 0.78);
  border: 1px solid rgba(154, 121, 98, 0.12);
  box-shadow: 0 12px 28px rgba(72, 52, 40, 0.08);
  backdrop-filter: blur(6px);
}

.side-panel--left {
  top: 94px;
  left: 26px;
  width: 220px;
  padding: 12px 14px;
}

.side-panel--right {
  top: 122px;
  right: 26px;
  bottom: 26px;
  width: 244px;
  padding: 0;
  display: flex;
  background: transparent;
  border: none;
  box-shadow: none;
  backdrop-filter: none;
}

.side-panel--right :deep(.line-timeline) {
  flex: 1 1 auto;
  min-height: 0;
}

.legend-block + .legend-block {
  margin-top: 12px;
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
  margin: 6px 0 0;
  font-family: 'STSong', 'SimSun', 'Songti SC', serif;
  font-size: 10px;
  line-height: 1.45;
  color: rgba(92, 67, 55, 0.76);
}

.legend-row {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0 5px;
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
  font-size: 8px;
  line-height: 1.35;
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

.importance-legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 8px;
}

.importance-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  padding: 7px 8px;
  border: 1px dashed rgba(149, 117, 94, 0.18);
  border-radius: 12px;
  background: rgba(246, 240, 230, 0.54);
}

.importance-row:last-child {
  grid-column: 1 / -1;
}

.importance-row__marker {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
}

.importance-row__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.importance-row__copy strong {
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', 'Songti SC', serif;
  font-size: 13px;
  font-weight: 600;
  color: #5f4032;
}

.importance-row__copy em {
  font-family: 'STSong', 'SimSun', 'Songti SC', serif;
  font-style: normal;
  font-size: 9px;
  letter-spacing: 0.08em;
  color: rgba(147, 63, 51, 0.82);
}

.importance-row__copy small {
  font-family: 'STSong', 'SimSun', 'Songti SC', serif;
  font-size: 9px;
  line-height: 1.35;
  color: rgba(96, 74, 61, 0.72);
}

.plan-shape {
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
.plan-shape--circle-large {
  width: var(--shape-size);
  height: var(--shape-size);
  border-radius: 999px;
  background: var(--green);
}

.legend-block--note {
  padding-top: 0;
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

  .map-legend,
  .side-panel {
    position: relative;
    inset: auto;
    transform: none;
    width: calc(100% - 24px);
    margin: 12px;
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
