<template>
  <aside class="era-timeline" :style="{ '--timeline-accent': accent }">
    <header class="era-timeline__header">
      <div class="era-timeline__eyebrow">Time Sequence</div>
      <h3>时间轴</h3>
      <p>鼠标移入卡片或时间点都会同步高亮，点击后保持选中。</p>
    </header>

    <div class="era-timeline__track">
      <div class="era-timeline__line"></div>
      <div class="era-timeline__progress" :style="{ height: progressHeight }"></div>

      <button
        v-for="item in orderedItems"
        :key="item.id"
        type="button"
        class="era-timeline__item"
        :class="{ active: item.id === activeId }"
        @mouseenter="emit('hover', item.id)"
        @mouseleave="emit('hover', null)"
        @focus="emit('hover', item.id)"
        @blur="emit('hover', null)"
        @click="emit('select', item.id)"
      >
        <span class="era-timeline__dot"></span>
        <span class="era-timeline__year">{{ item.year }}</span>
        <span class="era-timeline__name">{{ item.name }}</span>
        <span class="era-timeline__era">{{ item.eraLabel }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { BuildingGalleryItem } from '../types';

const props = withDefaults(
  defineProps<{
    items: BuildingGalleryItem[];
    activeId: string | null;
    accent?: string;
  }>(),
  {
    accent: '#4f7462',
  },
);

const emit = defineEmits<{
  select: [id: string];
  hover: [id: string | null];
}>();

const orderedItems = computed(() => [...props.items].sort((left, right) => left.year - right.year));

const progressHeight = computed(() => {
  if (!orderedItems.value.length) {
    return '0%';
  }

  const activeIndex = orderedItems.value.findIndex((item) => item.id === props.activeId);

  if (activeIndex < 0) {
    return '0%';
  }

  if (orderedItems.value.length === 1) {
    return '100%';
  }

  return `${(activeIndex / (orderedItems.value.length - 1)) * 100}%`;
});
</script>

<style scoped lang="scss">
.era-timeline {
  --timeline-accent: #4f7462;
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
  min-height: 0;
  padding: 18px 16px;
  border: 1px solid rgba(142, 112, 88, 0.16);
  background: rgba(241, 233, 219, 0.82);
  box-shadow: 0 14px 30px rgba(73, 54, 42, 0.08);
}

.era-timeline__header h3 {
  margin: 0;
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 24px;
  line-height: 1.08;
  color: #603126;
}

.era-timeline__eyebrow {
  margin-bottom: 6px;
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: rgba(94, 71, 57, 0.66);
  text-transform: uppercase;
}

.era-timeline__header p {
  margin: 8px 0 0;
  font-family: 'ContentFont', serif;
  font-size: 12px;
  line-height: 1.65;
  color: rgba(88, 67, 54, 0.78);
}

.era-timeline__track {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 18px;
  padding-left: 28px;
}

.era-timeline__line,
.era-timeline__progress {
  position: absolute;
  left: 8px;
  top: 8px;
  width: 2px;
  border-radius: 999px;
}

.era-timeline__line {
  bottom: 8px;
  background: rgba(97, 74, 59, 0.18);
}

.era-timeline__progress {
  background: linear-gradient(180deg, var(--timeline-accent), color-mix(in srgb, var(--timeline-accent) 72%, #ffffff 28%));
  transition: height 0.28s ease;
}

.era-timeline__item {
  position: relative;
  display: grid;
  gap: 2px;
  padding: 0 0 0 8px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: rgba(78, 58, 45, 0.76);
  transition: transform 0.2s ease, color 0.2s ease;
}

.era-timeline__item:hover,
.era-timeline__item.active {
  transform: translateX(4px);
  color: #592b22;
}

.era-timeline__dot {
  position: absolute;
  left: -25px;
  top: 6px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid rgba(240, 233, 220, 0.95);
  background: rgba(162, 128, 100, 0.42);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.18);
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.era-timeline__item.active .era-timeline__dot,
.era-timeline__item:hover .era-timeline__dot {
  transform: scale(1.16);
  background: var(--timeline-accent);
}

.era-timeline__year {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 17px;
  line-height: 1;
}

.era-timeline__name {
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 15px;
  line-height: 1.2;
}

.era-timeline__era {
  font-family: 'ContentFont', serif;
  font-size: 11px;
  color: rgba(94, 71, 57, 0.7);
}

@media (max-width: 900px) {
  .era-timeline {
    height: auto;
  }

  .era-timeline__track {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(160px, 1fr);
    overflow-x: auto;
    padding: 20px 0 8px;
  }

  .era-timeline__line,
  .era-timeline__progress {
    display: none;
  }

  .era-timeline__item {
    padding: 14px 10px 0 0;
  }

  .era-timeline__dot {
    left: 0;
    top: 0;
  }
}
</style>
