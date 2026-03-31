<template>
  <section id="building-map-total" class="building-map-screen">
    <button class="tour-button map-tour-button" @click="startTour">界面导引</button>
    <img class="building-map-screen__icon" :src="mapIconUrl" alt="" aria-hidden="true" />

    <BuildingMapChart
      id="building-map-chart"
      class="building-map-screen__chart"
      :buildings="filteredBuildings"
      :selected-id="selectedBuildingId"
      @select="handleSelect"
    />

    <div class="building-map-screen__wash"></div>
    <div class="building-map-screen__grain"></div>
    <div class="building-map-screen__motif"></div>

    <div class="screen-ui">
      <aside id="building-map-left-panel" class="side-panel side-panel--left">
        <section id="building-map-structure-legend" class="legend-block">
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
              <i class="legend-row__dot" :style="{ '--legend-color': getMapLegendColor(item.key) }"></i>
              <em>{{ structureCounts[item.key] }}</em>
            </span>
          </button>
        </section>

        <section id="building-map-level-legend" class="legend-block">
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

      <aside id="building-map-timeline-panel" class="side-panel side-panel--right">
        <BuildingTimeline
          :buildings="filteredBuildings"
          :selected-id="selectedBuildingId"
          @select="handleSelect"
        />
      </aside>
    </div>

    <teleport to="body">
      <div class="tour-comp" v-if="tourVisible" :style="{ bottom: `${tourSteps[currentIndex]?.tour_bottom ?? 0}%` }">
        <TourComp
          :content="currentIntro"
          :step-count="tourSteps.length"
          v-model="currentIndex"
          :left="tourSteps[currentIndex]?.left ?? 0"
          :bottom="tourSteps[currentIndex]?.bottom ?? 0"
        />
      </div>
    </teleport>

    <el-tour id="building-map-tour" v-model="tourVisible" :z-index="3000" v-model:current="currentIndex">
      <el-tour-step v-for="(step, index) in tourSteps" :key="index" :target="step.target" :placement="step.placement">
        <template #header style="display: none;"></template>
      </el-tour-step>
      <template #indicators>
        <span></span>
      </template>
    </el-tour>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import rawBuildings from '../../building-jittered.json';
import BuildingMapChart from '@/demo/building-home-map/components/BuildingMapChart.vue';
import BuildingTimeline from '@/demo/building-home-map/components/BuildingTimeline.vue';
import TourComp from '@/components/TourComp.vue';
import BuildingMapTourJson from '@/assets/tour/BuildingMapDemoView.json';
import {
  getStructureType,
  importanceLegend,
  structureLegend,
  type StructureType,
} from '@/demo/building-home-map/metadata';

import type { BuildingRecord } from '@/demo/building-home-map/types';

const buildings = rawBuildings as BuildingRecord[];
const mapIconUrl = new URL('../../json/icon.png', import.meta.url).href;

const uiText = {
  structureTitle: '\u5efa\u7b51\u5206\u7c7b',
  structureCopy: '\u6309\u6c11\u5c45\u3001\u5b98\u5e9c\u3001\u7687\u5bab\u3001\u6865\u6881\u7b5b\u9009\u5730\u56fe\u5efa\u7b51\u6837\u672c\u3002',
  planTitle: '\u6837\u672c\u7b49\u7ea7',
  planHint: '\u7b49\u7ea7\u8d8a\u9ad8\uff0c\u5730\u56fe\u6807\u8bb0\u8d8a\u9192\u76ee',
  noteTitle: '\u8bfb\u56fe\u8bf4\u660e',
  noteCopy: '\u989c\u8272\u770b\u5efa\u7b51\u7c7b\u578b\uff0c\u6807\u8bb0\u770b\u91cd\u8981\u7b49\u7ea7\u3002',
} as const;

const mapLegendColorByType: Record<StructureType, string> = {
  民居: '#3A6351',
  官府: '#2F5646',
  皇宫: '#A04A3C',
  桥梁: '#8F5647',
};

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

const getMapLegendColor = (type: StructureType) => mapLegendColorByType[type] ?? '#3A6351';

const handleSelect = (buildingId: string) => {
  selectedBuildingId.value = buildingId;
};

const tourVisible = ref(false);
const currentIndex = ref(0);
const currentIntro = ref('');
const tourSteps = ref(Array.from(BuildingMapTourJson));

watch(
  currentIndex,
  () => {
    if (currentIndex.value === tourSteps.value.length) {
      tourVisible.value = false;
      currentIndex.value = 0;
      return;
    }
    currentIntro.value = tourSteps.value[currentIndex.value]?.content ?? '';
  },
  { immediate: true },
);

const startTour = () => {
  tourVisible.value = true;
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

onBeforeUnmount(() => {
  tourVisible.value = false;
});
</script>

<style scoped lang="scss">
.building-map-screen {
  --paper: #e6e0d3;
  --paper-soft: rgba(230, 224, 211, 0.9);
  --paper-strong: rgba(230, 224, 211, 0.96);
  --line: rgba(120, 105, 85, 0.08);
  --ink: #8c3f30;
  --ink-soft: rgba(155, 109, 95, 0.82);
  --red: #9a4336;
  --green: #97aca0;
  --earth: #b89a82;
  --shadow: rgba(50, 44, 35, 0.05);
  box-sizing: border-box;
  position: fixed;
  inset: 0;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(230, 224, 211, 0.98), rgba(216, 209, 196, 0.98)),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06), transparent 28%, transparent 72%, rgba(255, 255, 255, 0.06));
}

.map-tour-button {
  top: 16px;
  left: 140px;
  z-index: 38;
}

.building-map-screen__chart,
.building-map-screen__icon,
.building-map-screen__wash,
.building-map-screen__grain,
.building-map-screen__motif {
  position: absolute;
  inset: 0;
}

.building-map-screen__icon {
  inset: auto;
  top: 20px;
  left: 0;
  z-index: 12;
  width: clamp(120px, 10vw, 168px);
  height: auto;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  opacity: 0.94;
}

.building-map-screen__chart {
  z-index: 0;
}

.building-map-screen__wash {
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(circle at 16% 12%, rgba(255, 255, 255, 0.26), transparent 26%),
    radial-gradient(circle at 82% 16%, rgba(255, 255, 255, 0.22), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
}

.building-map-screen__grain {
  display: none;
  z-index: 1;
  pointer-events: none;
  background:
    repeating-linear-gradient(
      135deg,
      rgba(123, 108, 89, 0.02) 0,
      rgba(123, 108, 89, 0.02) 1px,
      transparent 1px,
      transparent 16px
    );
  mix-blend-mode: multiply;
}

.building-map-screen__motif {
  z-index: 1;
  pointer-events: none;
  opacity: 0.1;
  background:
    radial-gradient(circle at 35% 44%, rgba(120, 105, 85, 0.08), transparent 26%),
    radial-gradient(circle at 70% 56%, rgba(120, 105, 85, 0.06), transparent 24%);
}

.screen-ui {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.tour-comp {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 380px;
  z-index: 4000;
  pointer-events: auto;
}

:global(.el-tour__content) {
  display: none;
}

.side-panel {
  position: absolute;
  pointer-events: auto;
}

.side-panel {
  background: rgba(235, 228, 213, 0.85);
  border: 1px solid rgba(156, 58, 53, 0.16);
  box-shadow: 0 4px 12px rgba(60, 52, 42, 0.06);
  backdrop-filter: blur(4px);
  border-radius: 4px;
}

.side-panel--left {
  top: 50%;
  left: 20px;
  transform: translateY(-50%);
  width: 190px;
  padding: 10px 12px 8px;
}

.side-panel--right {
  top: 78px;
  right: 24px;
  bottom: 16px;
  width: 224px;
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
  margin-top: 8px;
}

.legend-block__title {
  margin: 0;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(156, 58, 53, 0.44);
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 15px;
  line-height: 1.1;
  color: #9c3a35;
  letter-spacing: 0.03em;
}

.legend-block__copy,
.legend-block__hint {
  display: none;
}

.legend-row {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 0 4px;
  border: none;
  border-bottom: 1px solid rgba(156, 58, 53, 0.14);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: color 0.18s ease;
}

.legend-row:hover,
.legend-row.active {
  background: rgba(245, 240, 230, 0.35);
}

.legend-row__text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.legend-row__text strong {
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 13px;
  color: #4a433a;
  font-weight: 600;
}

.legend-row__text small {
  display: none;
}

.legend-row.active .legend-row__text strong {
  color: #9c3a35;
}

.legend-row__meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
}

.legend-row__dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--legend-color);
  box-shadow: 0 0 0 2px rgba(245, 240, 230, 0.52);
}

.legend-row__meta em {
  font-family: 'STSong', 'SimSun', serif;
  font-size: 9px;
  font-style: normal;
  color: rgba(74, 67, 58, 0.74);
}

.importance-legend {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  margin-top: 6px;
}

.importance-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 6px;
  align-items: start;
  padding: 4px 0;
  border-bottom: 1px solid rgba(156, 58, 53, 0.12);
  border-radius: 0;
  background: transparent;
}

.importance-row:last-child {
  border-bottom: 1px solid rgba(156, 58, 53, 0.12);
}

.importance-row__marker {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 18px;
}

.importance-row__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.importance-row__copy strong {
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 12px;
  font-weight: 600;
  color: #4a433a;
}

.importance-row__copy em {
  display: none;
}

.importance-row__copy small {
  display: none;
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
  border-bottom: var(--shape-size) solid #3a6351;
}

.plan-shape--rect {
  width: var(--shape-size);
  height: var(--shape-size);
  background: #3a6351;
}

.plan-shape--pentagon {
  width: var(--shape-size);
  height: var(--shape-size);
  background: #3a6351;
  clip-path: polygon(50% 0, 100% 38%, 81% 100%, 19% 100%, 0 38%);
}

.plan-shape--circle,
.plan-shape--circle-large {
  width: var(--shape-size);
  height: var(--shape-size);
  border-radius: 999px;
  background: #3a6351;
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

  .building-map-screen__icon {
    top: 18px;
    left: 0;
    width: clamp(92px, 24vw, 126px);
  }

  .side-panel {
    position: relative;
    inset: auto;
    transform: none;
    width: calc(100% - 24px);
    margin: 12px;
  }

  .side-panel--left,
  .side-panel--right {
    padding: 14px 12px;
  }
}
</style>
