<template>
  <section class="building-section-screen">
    <div class="building-section-screen__wash"></div>
    <div class="building-section-screen__grain"></div>
    <div class="building-section-screen__motif"></div>

    <div class="catalog-shell">
      <div v-if="currentCategory" class="catalog-hud">
        <div class="catalog-breadcrumb">
          <span>四分首页</span>
          <span>{{ currentCategory.title }}</span>
          <span v-if="currentGroup">{{ currentGroup.title }}</span>
        </div>

        <div class="catalog-actions">
          <button
            type="button"
            class="catalog-action"
            @click="goBackOneLevel"
          >
            返回上一层
          </button>
          <button
            type="button"
            class="catalog-action catalog-action--ghost"
            @click="resetToHome"
          >
            回到首页
          </button>
        </div>
      </div>

      <transition name="stage-fade" mode="out-in">
        <div v-if="!currentCategory" key="home" class="stage stage--home">
          <div class="category-grid">
            <button
              v-for="category in buildingCatalog"
              :key="category.id"
              type="button"
              class="category-slab"
              :class="{ 'category-slab--poster': category.useCoverAsPoster }"
              :style="{
                '--accent-color': category.accent,
                '--outline-color': category.outline,
              }"
              @click="enterCategory(category.id)"
            >
              <div
                v-if="category.coverImage"
                class="category-slab__photo"
                :style="{
                  backgroundImage: `url(${category.coverImage})`,
                  backgroundPosition: category.coverPosition ?? 'center center',
                  backgroundSize: category.coverSize ?? 'cover',
                }"
              ></div>
              <div class="category-slab__overlay"></div>
              <div v-if="!category.useCoverAsPoster" class="category-slab__content">
                <div class="category-slab__seal">{{ category.seal }}</div>
                <div class="category-slab__title-wrap">
                  <div class="category-slab__title">{{ category.title }}</div>
                  <div class="category-slab__alias">{{ category.alias }}</div>
                  <div class="category-slab__english">{{ category.english }}</div>
                  <p>{{ category.summary }}</p>
                </div>
              </div>

              <div class="category-slab__art">
                <ArchitectureSketch
                  v-if="!category.useCoverAsPoster"
                  :variant="category.coverVariant"
                  :accent="category.accent"
                />
              </div>

              <div class="category-slab__enter">
                {{ category.useCoverAsPoster ? `进入${category.title}图册` : '点击进入分册' }}
              </div>
            </button>
          </div>
        </div>

        <div v-else-if="currentCategory && !currentGroup" key="groups" class="stage stage--groups">
          <div class="group-grid">
            <button
              v-for="group in currentCategory.groups"
              :key="group.id"
              type="button"
              class="group-card"
              :style="{ '--accent-color': currentCategory.accent }"
              @click="enterGroup(group.id)"
            >
              <div class="group-card__header">
                <div>
                  <div class="group-card__eyebrow">{{ currentCategory.title }} · {{ currentCategory.alias }}</div>
                  <h3>{{ group.title }}</h3>
                </div>
                <div class="group-card__subtitle">{{ group.subtitle }}</div>
              </div>

              <p class="group-card__copy">{{ group.description }}</p>

              <div class="group-card__art">
                <ArchitectureSketch :variant="group.previewVariant" :accent="currentCategory.accent" />
              </div>

              <div class="group-card__footer">
                <span>{{ group.items.length }} 个样本</span>
                <span>展开图册</span>
              </div>
            </button>
          </div>
        </div>

        <div v-else-if="currentCategory && currentGroup && selectedItem" key="gallery" class="stage stage--gallery">
          <div class="gallery-main" :style="{ '--accent-color': currentCategory.accent }">
            <article class="feature-card">
              <div class="feature-card__art">
                <ArchitectureSketch :variant="selectedItem.variant" :accent="currentCategory.accent" />
              </div>

              <div class="feature-card__content">
                <div class="feature-card__eyebrow">{{ currentCategory.title }} / {{ currentGroup.title }}</div>
                <h3>{{ selectedItem.name }}</h3>
                <div class="feature-card__meta">
                  <span>{{ currentGroup.subtitle }}</span>
                  <span>{{ selectedItem.eraLabel }}</span>
                  <span>{{ selectedItem.dynasty }}</span>
                  <span>{{ selectedItem.region }}</span>
                  <span>{{ selectedItem.year }}</span>
                </div>
                <p>{{ selectedItem.summary }}</p>

                <div class="feature-card__tags">
                  <span v-for="tag in selectedItem.tags" :key="tag">{{ tag }}</span>
                </div>
              </div>
            </article>

            <div class="gallery-grid">
              <button
                v-for="item in orderedItems"
                :key="item.id"
                type="button"
                class="gallery-card"
                :class="{ active: item.id === displayedItemId }"
                @mouseenter="setHoveredItem(item.id)"
                @mouseleave="setHoveredItem(null)"
                @focus="setHoveredItem(item.id)"
                @blur="setHoveredItem(null)"
                @click="selectItem(item.id)"
              >
                <div class="gallery-card__art">
                  <ArchitectureSketch :variant="item.variant" :accent="currentCategory.accent" />
                  <div class="gallery-card__wash"></div>
                </div>

                <div class="gallery-card__body">
                  <div class="gallery-card__era">{{ item.eraLabel }}</div>
                  <h3>{{ item.name }}</h3>
                  <p>{{ item.summary }}</p>
                  <div class="gallery-card__meta">
                    <span>{{ item.region }}</span>
                    <span>{{ item.year }}</span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div class="gallery-side">
            <BuildingEraTimeline
              :items="orderedItems"
              :active-id="displayedItemId"
              :accent="currentCategory.accent"
              @select="selectItem"
              @hover="setHoveredItem"
            />
          </div>
        </div>
      </transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import ArchitectureSketch from '@/demo/building-section-catalog/components/ArchitectureSketch.vue';
import BuildingEraTimeline from '@/demo/building-section-catalog/components/BuildingEraTimeline.vue';
import { buildingCatalog } from '@/demo/building-section-catalog/catalog';

const activeCategoryId = ref<string | null>(null);
const activeGroupId = ref<string | null>(null);
const activeItemId = ref<string | null>(null);
const hoveredItemId = ref<string | null>(null);

const currentCategory = computed(
  () => buildingCatalog.find((category) => category.id === activeCategoryId.value) ?? null,
);

const currentGroup = computed(
  () => currentCategory.value?.groups.find((group) => group.id === activeGroupId.value) ?? null,
);

const orderedItems = computed(() =>
  [...(currentGroup.value?.items ?? [])].sort((left, right) => left.year - right.year),
);

const displayedItemId = computed(() => hoveredItemId.value ?? activeItemId.value);

const selectedItem = computed(
  () => orderedItems.value.find((item) => item.id === displayedItemId.value) ?? orderedItems.value[0] ?? null,
);

const enterCategory = (categoryId: string) => {
  activeCategoryId.value = categoryId;
  activeGroupId.value = null;
  activeItemId.value = null;
  hoveredItemId.value = null;
};

const enterGroup = (groupId: string) => {
  activeGroupId.value = groupId;
  hoveredItemId.value = null;
};

const resetToHome = () => {
  activeCategoryId.value = null;
  activeGroupId.value = null;
  activeItemId.value = null;
  hoveredItemId.value = null;
};

const goBackOneLevel = () => {
  if (activeGroupId.value) {
    activeGroupId.value = null;
    activeItemId.value = null;
    hoveredItemId.value = null;
    return;
  }

  resetToHome();
};

const selectItem = (itemId: string) => {
  activeItemId.value = itemId;
};

const setHoveredItem = (itemId: string | null) => {
  hoveredItemId.value = itemId;
};

watch(
  orderedItems,
  (items) => {
    if (!items.length) {
      activeItemId.value = null;
      return;
    }

    if (!items.some((item) => item.id === activeItemId.value)) {
      activeItemId.value = items[0].id;
    }
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.building-section-screen {
  --paper: #ede5d6;
  --paper-soft: rgba(243, 235, 220, 0.84);
  --paper-strong: rgba(238, 230, 214, 0.94);
  --ink: #524033;
  --ink-soft: rgba(82, 64, 51, 0.76);
  --shadow: rgba(72, 54, 41, 0.12);
  position: fixed;
  inset: 0;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(244, 237, 223, 0.98), rgba(234, 225, 210, 0.98)),
    linear-gradient(90deg, rgba(255, 255, 255, 0.18), transparent 26%, transparent 74%, rgba(255, 255, 255, 0.1));
}

.building-section-screen__wash,
.building-section-screen__grain,
.building-section-screen__motif {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.building-section-screen__wash {
  background:
    radial-gradient(circle at 14% 12%, rgba(255, 255, 255, 0.34), transparent 18%),
    radial-gradient(circle at 86% 16%, rgba(255, 255, 255, 0.22), transparent 22%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
}

.building-section-screen__grain {
  background:
    repeating-linear-gradient(
      135deg,
      rgba(124, 96, 76, 0.028) 0,
      rgba(124, 96, 76, 0.028) 1px,
      transparent 1px,
      transparent 13px
    );
  mix-blend-mode: multiply;
}

.building-section-screen__motif {
  opacity: 0.16;
  background:
    radial-gradient(circle at 22% 68%, rgba(134, 100, 76, 0.12), transparent 24%),
    radial-gradient(circle at 76% 44%, rgba(134, 100, 76, 0.08), transparent 22%);
}

.catalog-shell {
  position: relative;
  z-index: 10;
  height: 100%;
  padding: 14px;
  box-sizing: border-box;
}

.catalog-hud {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  z-index: 30;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}

.catalog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  pointer-events: auto;
}

.catalog-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  pointer-events: auto;
}

.catalog-breadcrumb span,
.catalog-action {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px 7px;
  border: 1px solid rgba(147, 116, 93, 0.18);
  background: rgba(242, 234, 220, 0.74);
  box-shadow: 0 8px 18px rgba(71, 52, 40, 0.08);
  font-family: 'ContentFont', serif;
  font-size: 12px;
  color: #5d4334;
}

.catalog-action {
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.catalog-action:hover {
  transform: translateY(-1px);
  border-color: rgba(160, 74, 59, 0.28);
}

.catalog-action--ghost {
  background: rgba(247, 242, 235, 0.82);
}

.stage {
  height: 100%;
  min-height: 0;
}

.category-grid {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.category-slab {
  --accent-color: #4f7462;
  --outline-color: #3a6454;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  padding: 18px;
  border: 1px solid rgba(147, 116, 93, 0.16);
  background:
    linear-gradient(180deg, rgba(248, 243, 235, 0.74), rgba(236, 228, 214, 0.86)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent 44%);
  box-shadow: 0 14px 30px rgba(72, 54, 41, 0.08);
  text-align: left;
  cursor: pointer;
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease, filter 0.28s ease;
}

.category-slab--poster {
  background: #f3f1f6;
}

.category-slab__photo {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-repeat: no-repeat;
  background-color: #f3f1f6;
  filter: sepia(0.05) saturate(0.92) contrast(0.98) brightness(1.01);
  transition: filter 0.32s ease, transform 0.32s ease;
}

.category-slab__photo::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(242, 238, 230, 0.54), rgba(233, 226, 213, 0.42)),
    linear-gradient(90deg, rgba(96, 122, 108, 0.08) 0%, rgba(243, 241, 246, 0.02) 48%, rgba(173, 93, 76, 0.07) 100%),
    radial-gradient(circle at 82% 22%, rgba(82, 112, 98, 0.08), transparent 28%);
  mix-blend-mode: multiply;
  transition: opacity 0.32s ease;
}

.category-slab::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 35%),
    radial-gradient(circle at 78% 20%, color-mix(in srgb, var(--accent-color) 8%, transparent), transparent 30%);
  opacity: 0.88;
}

.category-slab--poster::before {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 35%),
    radial-gradient(circle at 78% 20%, color-mix(in srgb, var(--accent-color) 6%, transparent), transparent 30%);
}

.category-slab:hover {
  transform: translateY(-6px) scale(1.01);
  border-color: color-mix(in srgb, var(--outline-color) 28%, rgba(147, 116, 93, 0.2));
  box-shadow: 0 20px 38px rgba(72, 54, 41, 0.14);
  filter: saturate(1.06);
}

.category-slab:hover .category-slab__photo {
  filter: none;
  transform: scale(1.015);
}

.category-slab:hover .category-slab__photo::after,
.category-slab:hover::before {
  opacity: 0;
}

.category-slab__overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.08)),
    repeating-linear-gradient(
      0deg,
      transparent 0,
      transparent 23px,
      rgba(114, 86, 66, 0.04) 23px,
      rgba(114, 86, 66, 0.04) 24px
    );
  opacity: 0.95;
}

.category-slab--poster .category-slab__overlay {
  opacity: 0.3;
}

.category-slab--poster .category-slab__content,
.category-slab--poster .category-slab__art {
  background: transparent;
}

.category-slab--poster:hover .category-slab__overlay {
  opacity: 0.1;
}

.category-slab__content,
.category-slab__art,
.category-slab__enter {
  position: relative;
  z-index: 1;
}

.category-slab__content {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.category-slab__seal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid color-mix(in srgb, var(--outline-color) 44%, #ffffff 56%);
  background: color-mix(in srgb, var(--accent-color) 8%, rgba(255, 255, 255, 0.7));
  color: var(--outline-color);
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 24px;
}

.category-slab__title-wrap {
  min-width: 0;
}

.category-slab__title {
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: clamp(34px, 3.6vw, 48px);
  line-height: 1;
  color: #39261f;
}

.category-slab__alias {
  margin-top: 4px;
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 16px;
  color: var(--outline-color);
}

.category-slab__english {
  margin-top: 8px;
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: rgba(85, 64, 52, 0.6);
  text-transform: uppercase;
}

.category-slab__title-wrap p {
  margin: 10px 0 0;
  font-family: 'ContentFont', serif;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(79, 58, 47, 0.78);
}

.category-slab__art {
  flex: 1 1 auto;
  min-height: 0;
  margin-top: 14px;
  transform-origin: center bottom;
  transition: transform 0.28s ease;
}

.category-slab--poster .category-slab__art {
  margin-top: 0;
}

.category-slab:hover .category-slab__art {
  transform: scale(1.06) translateY(-6px);
}

.category-slab__enter {
  display: inline-flex;
  align-self: flex-start;
  margin-top: 10px;
  padding: 7px 12px 6px;
  border: 1px solid color-mix(in srgb, var(--outline-color) 28%, #ffffff 72%);
  background: rgba(250, 246, 239, 0.72);
  font-family: 'ContentFont', serif;
  font-size: 12px;
  color: var(--outline-color);
}

.category-slab--poster .category-slab__enter {
  align-self: flex-end;
  margin-top: 0;
  color: #6c4539;
  background: rgba(248, 243, 236, 0.62);
  backdrop-filter: blur(5px);
}

.group-grid {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.group-card {
  --accent-color: #4f7462;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 12px;
  padding: 18px;
  border: 1px solid rgba(147, 116, 93, 0.16);
  background:
    linear-gradient(180deg, rgba(248, 243, 236, 0.82), rgba(238, 230, 216, 0.88)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 40%);
  box-shadow: 0 12px 28px rgba(72, 54, 41, 0.08);
  text-align: left;
  cursor: pointer;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.group-card:hover {
  transform: translateY(-5px);
  border-color: color-mix(in srgb, var(--accent-color) 28%, rgba(147, 116, 93, 0.2));
  box-shadow: 0 18px 36px rgba(72, 54, 41, 0.12);
}

.group-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.group-card__eyebrow {
  margin-bottom: 5px;
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: rgba(93, 73, 59, 0.62);
}

.group-card h3 {
  margin: 0;
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: clamp(24px, 2.5vw, 32px);
  line-height: 1.05;
  color: #5b2a20;
}

.group-card__subtitle {
  padding-top: 8px;
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 15px;
  color: var(--accent-color);
}

.group-card__copy {
  margin: 0;
  font-family: 'ContentFont', serif;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(84, 62, 49, 0.78);
}

.group-card__art {
  min-height: 0;
}

.group-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px dashed rgba(147, 116, 93, 0.22);
  font-family: 'ContentFont', serif;
  font-size: 12px;
  color: rgba(81, 61, 49, 0.72);
}

.stage--gallery {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 18px;
}

.gallery-main {
  --accent-color: #4f7462;
  display: grid;
  grid-template-rows: minmax(280px, 38%) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
  overflow: hidden;
}

.feature-card__meta span,
.feature-card__tags span,
.gallery-card__meta span {
  display: inline-flex;
  align-items: center;
  padding: 5px 9px 4px;
  border: 1px solid rgba(147, 116, 93, 0.14);
  background: rgba(249, 244, 236, 0.8);
  font-family: 'ContentFont', serif;
  font-size: 12px;
  color: rgba(83, 61, 49, 0.8);
}

.feature-card {
  display: grid;
  grid-template-columns: minmax(280px, 40%) minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
  border: 1px solid rgba(147, 116, 93, 0.16);
  background: rgba(242, 234, 219, 0.88);
  box-shadow: 0 12px 28px rgba(72, 54, 41, 0.08);
}

.feature-card__art {
  min-height: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent 42%),
    rgba(246, 240, 229, 0.46);
}

.feature-card__content {
  align-self: center;
}

.feature-card__eyebrow {
  margin-bottom: 6px;
  font-family: 'ContentFont', serif;
  font-size: 11px;
  letter-spacing: 0.18em;
  color: rgba(94, 71, 57, 0.7);
}

.feature-card h3 {
  margin: 0;
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: clamp(28px, 3vw, 40px);
  line-height: 1.04;
  color: #5a281f;
}

.feature-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.feature-card p {
  margin: 12px 0 0;
  font-family: 'ContentFont', serif;
  font-size: 13px;
  line-height: 1.8;
  color: rgba(82, 61, 49, 0.8);
}

.feature-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.gallery-grid {
  min-height: 0;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(220px, 1fr);
  gap: 14px;
  padding-right: 6px;
}

.gallery-card {
  overflow: hidden;
  border: 1px solid rgba(147, 116, 93, 0.14);
  background:
    linear-gradient(180deg, rgba(249, 245, 238, 0.9), rgba(239, 231, 216, 0.92)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent 40%);
  box-shadow: 0 10px 24px rgba(72, 54, 41, 0.08);
  text-align: left;
  cursor: pointer;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.gallery-card:hover,
.gallery-card.active {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--accent-color) 30%, rgba(147, 116, 93, 0.2));
  box-shadow: 0 18px 36px rgba(72, 54, 41, 0.12);
}

.gallery-card__art {
  position: relative;
  height: 220px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 34%),
    rgba(246, 240, 228, 0.5);
}

.gallery-card__art :deep(.architecture-sketch) {
  transition: transform 0.28s ease, filter 0.28s ease;
}

.gallery-card:hover .gallery-card__art :deep(.architecture-sketch),
.gallery-card.active .gallery-card__art :deep(.architecture-sketch) {
  transform: scale(1.07);
  filter: saturate(1.05);
}

.gallery-card__wash {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 40%);
  pointer-events: none;
}

.gallery-card__body {
  padding: 14px;
}

.gallery-card__era {
  margin-bottom: 6px;
  font-family: 'ContentFont', serif;
  font-size: 11px;
  letter-spacing: 0.14em;
  color: rgba(96, 74, 61, 0.68);
}

.gallery-card h3 {
  margin: 0;
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 22px;
  line-height: 1.1;
  color: #5a291f;
}

.gallery-card p {
  margin: 8px 0 0;
  font-family: 'ContentFont', serif;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(84, 62, 49, 0.78);
}

.gallery-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.gallery-side {
  min-height: 0;
}

.stage-fade-enter-active,
.stage-fade-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.stage-fade-enter-from,
.stage-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 1180px) {
  .category-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .group-grid {
    grid-template-columns: 1fr;
  }

  .stage--gallery {
    grid-template-columns: 1fr;
  }

  .gallery-side {
    order: -1;
  }

  .gallery-main {
    grid-template-rows: minmax(320px, auto) minmax(0, 1fr);
  }
}

@media (max-width: 900px) {
  .building-section-screen {
    position: relative;
    overflow: auto;
  }

  .catalog-shell {
    min-height: 100vh;
    height: auto;
    padding: 10px;
  }

  .catalog-hud {
    top: 10px;
    left: 10px;
    right: 10px;
    flex-direction: column;
    align-items: flex-start;
  }

  .catalog-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .category-grid {
    grid-template-columns: 1fr;
    height: auto;
  }

  .category-slab__art {
    min-height: 260px;
  }

  .feature-card {
    grid-template-columns: 1fr;
  }

  .group-grid,
  .stage--gallery {
    height: auto;
  }

  .gallery-main {
    grid-template-rows: auto auto;
  }

  .gallery-grid {
    grid-template-columns: 1fr;
    overflow: visible;
  }
}
</style>
