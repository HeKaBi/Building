<template>
  <section class="building-section-screen">
    <img
      v-if="!shouldHideSectionIcon"
      class="building-section-screen__icon"
      :src="sectionIconUrl"
      alt=""
      aria-hidden="true"
    />
    <div class="building-section-screen__scene" :style="{ backgroundImage: `url(${sectionBackgroundUrl})` }"></div>
    <div class="building-section-screen__wash"></div>
    <div class="building-section-screen__grain"></div>
    <div class="building-section-screen__motif"></div>

    <div class="catalog-shell" :class="{ 'catalog-shell--with-hud': !!currentCategory }">
      <div v-if="currentCategory && currentGroup" class="catalog-hud">
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
              <div v-else class="category-slab__poster-copy">
                <div class="category-slab__poster-head">
                  <div class="category-slab__seal">{{ category.seal }}</div>
                  <div class="category-slab__poster-title-wrap">
                    <div class="category-slab__title">{{ category.title }}</div>
                    <div class="category-slab__alias">{{ category.alias }}</div>
                    <div class="category-slab__english">{{ category.english }}</div>
                  </div>
                </div>
                <p>{{ category.summary }}</p>
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
          <div class="stage-actions stage-actions--floating">
            <button type="button" class="catalog-action" @click="goBackOneLevel">
              {{ '\u8fd4\u56de\u4e0a\u4e00\u5c42' }}
            </button>
            <button type="button" class="catalog-action catalog-action--ghost" @click="resetToHome">
              {{ '\u56de\u5230\u9996\u9875' }}
            </button>
          </div>

          <div class="group-grid">
            <button
              v-for="group in currentCategory.groups"
              :key="group.id"
              type="button"
              class="category-slab group-slab"
              :class="{ 'category-slab--poster': group.useCoverAsPoster }"
              :style="{
                '--accent-color': currentCategory.accent,
                '--outline-color': currentCategory.outline,
              }"
              @click="enterGroup(group.id)"
            >
              <div
                v-if="group.coverImage"
                class="category-slab__photo"
                :style="{
                  backgroundImage: `url(${group.coverImage})`,
                  backgroundPosition: group.coverPosition ?? 'center center',
                  backgroundSize: group.coverSize ?? 'cover',
                }"
              ></div>
              <div class="category-slab__overlay"></div>

              <div v-if="!group.useCoverAsPoster" class="category-slab__content group-slab__content">
                <div class="category-slab__seal">{{ getGroupSeal(group.title) }}</div>
                <div
                  :class="[
                    'category-slab__title-wrap',
                    'group-slab__title-wrap',
                    { 'group-slab__title-wrap--right': group.title === '土楼碉堡' },
                  ]"
                >
                  <div class="group-slab__eyebrow">{{ currentCategory.title }} · 二级图册</div>
                  <div
                    :class="[
                      'category-slab__title',
                      'group-slab__title',
                      { 'group-slab__title--right': group.title === '土楼碉堡' },
                    ]"
                  >
                    {{ group.title }}
                  </div>
                  <div class="category-slab__alias">{{ group.subtitle }}</div>
                  <div class="category-slab__english">{{ currentCategory.english }} Section</div>
                  <p>{{ group.description }}</p>
                </div>
              </div>
              <div v-else class="category-slab__poster-copy group-slab__poster-copy">
                <div class="group-slab__eyebrow">{{ currentCategory.title }} · 二级图册</div>
                <div class="category-slab__poster-head">
                  <div class="category-slab__seal">{{ getGroupSeal(group.title) }}</div>
                  <div
                    :class="[
                      'category-slab__poster-title-wrap',
                      { 'group-slab__title-wrap--right': group.title === '土楼碉堡' },
                    ]"
                  >
                    <div
                      :class="[
                        'category-slab__title',
                        'group-slab__title',
                        { 'group-slab__title--right': group.title === '土楼碉堡' },
                      ]"
                    >
                      {{ group.title }}
                    </div>
                    <div class="category-slab__alias">{{ group.subtitle }}</div>
                    <div class="category-slab__english">{{ currentCategory.english }} Section</div>
                  </div>
                </div>
                <p>{{ group.description }}</p>
              </div>

              <div class="category-slab__art group-slab__art">
                <ArchitectureSketch
                  v-if="!group.useCoverAsPoster"
                  :variant="group.previewVariant"
                  :accent="currentCategory.accent"
                />
              </div>

              <div class="group-slab__footer">
                <div class="group-slab__count">{{ group.items.length }} 个样本</div>
                <div class="category-slab__enter">进入{{ group.title }}</div>
              </div>
            </button>
          </div>
        </div>

        <div
          v-else-if="currentCategory && currentGroup && selectedItem"
          key="gallery"
          class="stage stage--gallery"
          :class="{
            'stage--atlas': isAtlasView,
            'stage--atlas-detail': isAtlasDetailView,
          }"
        >
          <template v-if="isAtlasView">
            <aside
              class="side-panel"
              :class="isAtlasDetailView ? 'side-panel--atlas-detail-left' : 'side-panel--atlas-left'"
            >
              <template v-if="isAtlasDetailView && detailItem">
                <section class="detail-side">
                  <div class="detail-side__brand">
                    <h2>{{ detailItem.name }}</h2>
                    <button type="button" class="atlas-reset" @click="closeAtlasDetail">
                      返回图册
                    </button>
                  </div>

                  <section class="detail-side__block">
                    <h3>建筑介绍</h3>
                    <p>{{ detailSummary }}</p>
                  </section>

                  <section
                    v-for="section in detailSections"
                    :key="section.title"
                    class="detail-side__block"
                  >
                    <h3>{{ section.title }}</h3>
                    <p>{{ section.body }}</p>
                  </section>

                  <div v-if="detailMetaChips.length" class="detail-side__meta">
                    <span v-for="chip in detailMetaChips" :key="chip">{{ chip }}</span>
                  </div>
                </section>
              </template>

              <template v-else>
                <section v-if="hasDynastyFilterOptions" class="legend-block">
                  <h2 class="legend-block__title">时代筛选</h2>

                  <button
                    v-for="item in dynastyFilterRows"
                    :key="item.label"
                    type="button"
                    class="legend-row legend-row--structure"
                    :class="{ active: activeDynastyFilter === item.label }"
                    @click="selectDynastyFilter(item.label)"
                  >
                    <span class="legend-row__text">
                      <strong>{{ item.label }}</strong>
                    </span>
                    <span class="legend-row__meta">
                      <i class="legend-row__dot" :style="{ '--legend-color': item.color }"></i>
                      <em>{{ item.count }}</em>
                    </span>
                  </button>
                </section>
              </template>
            </aside>

            <div
              class="atlas-main"
              :class="{ 'atlas-main--detail': isAtlasDetailView }"
              :style="{ '--accent-color': currentCategory.accent }"
            >
              <template v-if="isAtlasDetailView && detailItem">
                <article
                  class="atlas-hero"
                  :class="{ 'atlas-hero--paper-only': isQingchengDetail }"
                  :style="getAtlasCardStyle(detailItem)"
                  @wheel.capture.stop.prevent="handleImageWheel($event, detailItem.id)"
                >
                  <template v-if="isQingchengDetail">
                    <img
                      class="atlas-hero__paper-clean"
                      :src="qingchengPaperSketchFallback"
                      :alt="`${detailItem.name}线稿`"
                    />
                  </template>
                  <template v-else>
                    <Transition name="hero-visual-fade">
                      <div
                        v-if="detailItem.image"
                        :key="`${detailItem.id}-photo`"
                        class="atlas-hero__photo"
                        :style="{
                          backgroundImage: `url(${detailItem.image})`,
                          backgroundPosition: detailItem.imagePosition ?? 'center center',
                        }"
                      ></div>
                      <div v-else :key="`${detailItem.id}-ghost`" class="atlas-hero__photo atlas-hero__photo--ghost">
                        <ArchitectureSketch :variant="detailItem.variant" :accent="currentCategory.accent" muted />
                      </div>
                    </Transition>

                    <div class="atlas-hero__sheet"></div>
                    <Transition name="hero-visual-fade">
                      <div :key="`${detailItem.id}-ink`" class="atlas-hero__ink">
                        <img
                          v-if="detailPaperSketchImage"
                          class="atlas-hero__ink-image"
                          :src="detailPaperSketchImage"
                          :alt="`${detailItem.name}线稿`"
                          @error="handleDetailPaperSketchError"
                        />
                        <ArchitectureSketch
                          v-else
                          :variant="detailItem.variant"
                          :accent="currentCategory.accent"
                        />
                      </div>
                    </Transition>
                  </template>

                  <div v-if="!isQingchengDetail" class="atlas-hero__caption">
                    <span>线稿</span>
                    <span>滚轮切换前后样本</span>
                    <span>{{ detailItem.tags.join(' · ') }}</span>
                  </div>
                </article>
              </template>

              <template v-else>
                <div class="atlas-strip">
                  <div class="atlas-strip__title">
                    <h3>{{ currentGroup.title }}</h3>
                  </div>
                </div>

                <div
                  class="atlas-grid"
                  :class="{ 'atlas-grid--has-hover': hoveredItemId !== null }"
                  :style="atlasGridStyle"
                >
                  <button
                    v-for="(item, index) in atlasItems"
                    :key="item.id"
                    type="button"
                    class="atlas-card"
                    :class="[
                      getAtlasCardPositionClasses(index),
                      {
                        active: item.id === displayedItemId,
                        'atlas-card--hovered': item.id === hoveredItemId,
                        'atlas-card--dimmed': hoveredItemId !== null && item.id !== hoveredItemId,
                      },
                    ]"
                    @mouseenter="setHoveredItem(item.id)"
                    @mouseleave="setHoveredItem(null)"
                    @focus="setHoveredItem(item.id)"
                    @blur="setHoveredItem(null)"
                    @wheel.capture.stop.prevent="handleImageWheel($event, item.id)"
                    @click="openAtlasDetail(item.id)"
                  >
                    <div class="atlas-card__photo" :style="getAtlasCardStyle(item)">
                      <div
                        v-if="item.image"
                        class="atlas-card__image"
                        :style="{
                          backgroundImage: `url(${item.image})`,
                          backgroundPosition: item.imagePosition ?? 'center center',
                        }"
                      ></div>
                      <div v-else class="atlas-card__plate">
                        <ArchitectureSketch :variant="item.variant" :accent="currentCategory.accent" muted />
                      </div>

                      <div class="atlas-card__badge">{{ item.dynasty }}</div>
                      <div class="atlas-card__veil"></div>
                    </div>

                    <div class="atlas-card__body">
                      <div class="atlas-card__eyebrow">{{ item.eraLabel }}</div>

                      <div class="atlas-card__title-row">
                        <h3>{{ item.name }}</h3>
                        <span>{{ item.year }}</span>
                      </div>

                      <p>{{ item.region }}</p>
                    </div>
                  </button>
                </div>
              </template>
            </div>

            <aside class="side-panel side-panel--atlas-right">
              <BuildingEraTimeline
                :items="galleryItems"
                :active-id="displayedItemId"
                :accent="currentCategory.accent"
                @select="selectItem"
                @hover="setHoveredItem"
              />
            </aside>
          </template>

          <template v-else>
            <div class="gallery-main" :style="{ '--accent-color': currentCategory.accent }">
              <article
                class="feature-card"
                @wheel.capture.stop.prevent="handleImageWheel($event, selectedItem.id)"
              >
                <div
                  class="feature-card__art"
                  @wheel.capture.stop.prevent="handleImageWheel($event, selectedItem.id)"
                >
                  <Transition name="feature-visual-fade" mode="out-in">
                    <div :key="selectedItem.id" class="feature-card__visual">
                      <ArchitectureSketch :variant="selectedItem.variant" :accent="currentCategory.accent" />
                    </div>
                  </Transition>
                </div>

                <div class="feature-card__content">
                  <Transition name="feature-copy-fade" mode="out-in">
                    <div :key="selectedItem.id" class="feature-card__copy">
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
                  </Transition>
                </div>
              </article>
 
              <div class="gallery-grid">
                <button
                  v-for="item in galleryItems"
                  :key="item.id"
                  type="button"
                  class="gallery-card"
                  :class="{ active: item.id === displayedItemId }"
                  @mouseenter="setHoveredItem(item.id)"
                  @mouseleave="setHoveredItem(null)"
                  @focus="setHoveredItem(item.id)"
                  @blur="setHoveredItem(null)"
                  @wheel.capture.stop.prevent="handleImageWheel($event, item.id)"
                  @click="selectItem(item.id)"
                >
                  <div
                    class="gallery-card__art"
                    @wheel.capture.stop.prevent="handleImageWheel($event, item.id)"
                  >
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
                :items="galleryItems"
                :active-id="displayedItemId"
                :accent="currentCategory.accent"
                @select="selectItem"
                @hover="setHoveredItem"
              />
            </div>
          </template>
        </div>
      </transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ArchitectureSketch from '@/demo/building-section-catalog/components/ArchitectureSketch.vue';
import BuildingEraTimeline from '@/demo/building-section-catalog/components/BuildingEraTimeline.vue';
import { buildingCatalog } from '@/demo/building-section-catalog/realCatalog';
import type { BuildingGalleryItem, BuildingPhotoMood, SketchVariant } from '@/demo/building-section-catalog/types';
import qingchengPaperSketch from '@/assets/images/building-paper/building-1852-b868caf8.png';

const route = useRoute();
const router = useRouter();
const activeCategoryId = ref<string | null>(null);
const activeGroupId = ref<string | null>(null);
const activeItemId = ref<string | null>(null);
const hoveredItemId = ref<string | null>(null);
const atlasDetailItemId = ref<string | null>(typeof route.query.detail === 'string' ? route.query.detail : null);
const atlasWindowStart = ref(0);
const ALL_FILTER = '全部';
const activeDynastyFilter = ref(ALL_FILTER);
const activeRegionFilter = ref(ALL_FILTER);
const sectionIconUrl = new URL('../../json/icon.png', import.meta.url).href;
const sectionBackgroundUrl = new URL('../../json/bg.png', import.meta.url).href;
const ATLAS_WINDOW_SIZE = 9;
const WHEEL_SWITCH_COOLDOWN = 180;
let lastWheelSwitchAt = 0;

const currentCategory = computed(
  () => buildingCatalog.find((category) => category.id === activeCategoryId.value) ?? null,
);

const currentGroup = computed(
  () => currentCategory.value?.groups.find((group) => group.id === activeGroupId.value) ?? null,
);

const orderedItems = computed(() =>
  [...(currentGroup.value?.items ?? [])].sort((left, right) => left.year - right.year),
);

const defaultStructureFeatureByVariant: Record<SketchVariant, string> = {
  'residence-courtyard': '合院礼序',
  'residence-tulou': '防御围屋',
  'residence-diaolou': '侨乡碉楼',
  'residence-stilted': '吊脚干栏',
  'office-hall': '厅堂轴线',
  'office-gate': '门廊礼制',
  'office-yamen': '门堂廊院',
  'palace-hall': '高台大殿',
  'palace-gate': '门阙城台',
  'palace-tower': '角楼望亭',
  'bridge-arch': '券拱跨水',
  'bridge-beam': '梁桥连跨',
  'bridge-corridor': '廊桥风雨',
};

const defaultPhotoMoodByVariant: Record<SketchVariant, BuildingPhotoMood> = {
  'residence-courtyard': 'sepia',
  'residence-tulou': 'earth',
  'residence-diaolou': 'sepia',
  'residence-stilted': 'timber',
  'office-hall': 'sepia',
  'office-gate': 'stone',
  'office-yamen': 'mist',
  'palace-hall': 'mist',
  'palace-gate': 'stone',
  'palace-tower': 'ink',
  'bridge-arch': 'stone',
  'bridge-beam': 'mist',
  'bridge-corridor': 'timber',
};

const getItemStructureFeature = (item: BuildingGalleryItem) =>
  item.structureFeature ?? defaultStructureFeatureByVariant[item.variant];

const getItemRegionFamily = (item: BuildingGalleryItem) =>
  item.regionFamily ?? item.region.trim().split(/\s+/).find(Boolean) ?? currentCategory.value?.title ?? ALL_FILTER;

const getItemPhotoMood = (item: BuildingGalleryItem) =>
  item.photoMood ?? defaultPhotoMoodByVariant[item.variant];

const isAtlasView = computed(() => !!currentGroup.value);

const getFilteredItems = (dynastyFilter: string, regionFilter: string) =>
  orderedItems.value.filter((item) => {
    const matchesDynasty = dynastyFilter === ALL_FILTER || item.dynasty === dynastyFilter;
    const matchesRegion = regionFilter === ALL_FILTER || getItemRegionFamily(item) === regionFilter;
    return matchesDynasty && matchesRegion;
  });

const dynastyFilters = computed(() => [
  ALL_FILTER,
  ...new Set(orderedItems.value.map((item) => item.dynasty).filter(Boolean)),
]);

const regionFilters = computed(() => [
  ALL_FILTER,
  ...new Set(orderedItems.value.map((item) => getItemRegionFamily(item)).filter(Boolean)),
]);

const hasDynastyFilterOptions = computed(() => dynastyFilters.value.length > 1);
const hasRegionFilterOptions = computed(() => regionFilters.value.length > 1);
const hasAtlasFilters = computed(() => hasDynastyFilterOptions.value || hasRegionFilterOptions.value);

const galleryItems = computed(() => getFilteredItems(activeDynastyFilter.value, activeRegionFilter.value));

const getMaxAtlasWindowStart = (length: number) => Math.max(0, length - ATLAS_WINDOW_SIZE);

const syncAtlasWindow = (focusItemId?: string | null) => {
  if (!isAtlasView.value) {
    atlasWindowStart.value = 0;
    return;
  }

  const items = galleryItems.value;

  if (items.length <= ATLAS_WINDOW_SIZE) {
    atlasWindowStart.value = 0;
    return;
  }

  const maxStart = getMaxAtlasWindowStart(items.length);
  let nextStart = Math.min(atlasWindowStart.value, maxStart);
  const focusIndex = focusItemId ? items.findIndex((item) => item.id === focusItemId) : -1;

  if (focusIndex >= 0) {
    if (focusIndex < nextStart) {
      nextStart = focusIndex;
    } else if (focusIndex >= nextStart + ATLAS_WINDOW_SIZE) {
      nextStart = focusIndex - ATLAS_WINDOW_SIZE + 1;
    }
  }

  atlasWindowStart.value = Math.max(0, Math.min(nextStart, maxStart));
};

const atlasItems = computed(() => {
  const items = galleryItems.value;

  if (items.length <= ATLAS_WINDOW_SIZE) {
    return items;
  }

  const start = Math.min(atlasWindowStart.value, getMaxAtlasWindowStart(items.length));
  return items.slice(start, start + ATLAS_WINDOW_SIZE);
});

const isAtlasDetailView = computed(
  () => isAtlasView.value && !!atlasDetailItemId.value && galleryItems.value.some((item) => item.id === atlasDetailItemId.value),
);

const displayedItemId = computed(() => {
  const preferredId = isAtlasDetailView.value
    ? atlasDetailItemId.value ?? activeItemId.value
    : hoveredItemId.value ?? activeItemId.value;
  const activeCollection = galleryItems.value;

  return activeCollection.some((item) => item.id === preferredId)
    ? preferredId
    : activeCollection[0]?.id ?? null;
});

const selectedItem = computed(
  () => {
    const activeCollection = galleryItems.value;
    return activeCollection.find((item) => item.id === displayedItemId.value) ?? activeCollection[0] ?? null;
  },
);

const detailItem = computed(
  () => galleryItems.value.find((item) => item.id === atlasDetailItemId.value) ?? selectedItem.value,
);

const qingchengDetailId = 'building-1852-b868caf8';
const isQingchengItem = (item: BuildingGalleryItem | null | undefined) =>
  !!item && (item.id === qingchengDetailId || item.name.includes('青城古民居'));

const isQingchengDetail = computed(() => isQingchengItem(detailItem.value));

const qingchengPaperSketchFallback = `${import.meta.env.BASE_URL}building_paper/building-1852-b868caf8.png`;
const paperSketchLoadStep = ref(0);

const detailPaperSketchCandidates = computed(() => {
  const item = detailItem.value;
  if (!item) {
    return [] as string[];
  }

  if (isQingchengItem(item)) {
    return [qingchengPaperSketch, qingchengPaperSketchFallback];
  }

  return item.paperSketchImage ? [item.paperSketchImage] : [];
});

const detailPaperSketchImage = computed(() => {
  const candidates = detailPaperSketchCandidates.value;
  if (!candidates.length) {
    return undefined;
  }
  return candidates[Math.min(paperSketchLoadStep.value, candidates.length - 1)];
});

const handleDetailPaperSketchError = () => {
  const maxStep = detailPaperSketchCandidates.value.length - 1;
  if (paperSketchLoadStep.value < maxStep) {
    paperSketchLoadStep.value += 1;
  }
};

const shouldHideSectionIcon = computed(() => isAtlasDetailView.value);

const detailSummaryOverrideById: Record<string, string> = {
  [qingchengDetailId]:
    '青城古民居位于甘肃榆中青城古镇，现存格局以明清建筑为主，常见硬山顶、前出廊与砖木混合围护，体现西北传统民居的营造特征。',
};

const detailSummary = computed(() => {
  const item = detailItem.value;
  if (!item) {
    return '';
  }
  if (isQingchengItem(item)) {
    return detailSummaryOverrideById[qingchengDetailId];
  }
  return detailSummaryOverrideById[item.id] ?? item.summary;
});

const detailMetaChips = computed(() => {
  const item = detailItem.value;
  if (!item) {
    return [];
  }
  if (isQingchengItem(item)) {
    return [];
  }
  return [item.eraLabel, item.region, getItemStructureFeature(item)];
});

const visibleCountLabel = computed(() => {
  if (!isAtlasView.value) {
    return `${galleryItems.value.length}/${orderedItems.value.length}`;
  }

  const total = galleryItems.value.length;

  if (!total || total <= ATLAS_WINDOW_SIZE) {
    return `${atlasItems.value.length}/${total}`;
  }

  const start = Math.min(atlasWindowStart.value, getMaxAtlasWindowStart(total)) + 1;
  const end = start + atlasItems.value.length - 1;
  return `${start}-${end}/${total}`;
});


const dynastyFilterDescriptions: Record<string, string> = {
  全部: '查看全部时代样本',
};

const regionFilterDescriptions: Record<string, string> = {
  全部: '查看全部地域谱系',
  华北: '北方高台、城防与厚重院落并见',
  华东: '江南与东南沿海样本最集中，营造谱系最丰富',
  华中: '中原与湖湘样本交叠，院落和聚落并重',
  华南: '岭南围护住居与近代侨乡建筑集中出现',
  西南: '山地住居、风雨桥和边地官式建筑更具辨识度',
  西北: '夯土、防御和边疆节点建筑特征更突出',
  东北: '近代边地与清代宫苑样本为主',
  跨区域: '用于收纳暂未归入单一区域的样本',
};

const filterPalette = [
  '#b67a4a',
  '#4b765f',
  '#a3473a',
  '#6f7f8f',
  '#8a6c58',
  '#7b8b58',
] as const;

const getFilterColor = (index: number) => filterPalette[index % filterPalette.length];

const groupSealByTitle: Record<string, string> = {
  宅院府第: '宅',
  聚落村寨: '聚',
  园居草堂: '园',
  土楼碉堡: '土',
  吊脚干栏: '吊',
  城墙城防: '城',
  衙署公堂: '衙',
  楼阁钟鼓: '楼',
  府第会馆: '府',
  仓驿设施: '仓',
  考院学署: '考',
  书院礼制: '学',
  监狱设施: '狱',
  拱桥: '拱',
  廊桥风雨桥: '廊',
  梁桥栈道: '梁',
  堤闸纤道: '堤',
  桥群复合: '群',
  综合桥梁: '桥',
  王府宫苑: '王',
  宫殿宫城: '宫',
  园林山庄: '山',
  楼台影壁: '壁',
};

const getGroupSeal = (title: string) => groupSealByTitle[title] ?? title.slice(0, 1);

const dynastyFilterRows = computed(() =>
  dynastyFilters.value.map((label, index) => ({
    label,
    description: dynastyFilterDescriptions[label] ?? `${label}时期样本`,
    count:
      label === ALL_FILTER
        ? orderedItems.value.filter((item) => activeRegionFilter.value === ALL_FILTER || getItemRegionFamily(item) === activeRegionFilter.value).length
        : orderedItems.value.filter(
            (item) =>
              item.dynasty === label
              && (activeRegionFilter.value === ALL_FILTER || getItemRegionFamily(item) === activeRegionFilter.value),
          ).length,
    color: getFilterColor(index),
  })),
);

const regionFilterRows = computed(() =>
  regionFilters.value.map((label, index) => ({
    label,
    description: regionFilterDescriptions[label] ?? '按该地域谱系筛选',
    count:
      label === ALL_FILTER
        ? orderedItems.value.filter((item) => activeDynastyFilter.value === ALL_FILTER || item.dynasty === activeDynastyFilter.value).length
        : orderedItems.value.filter(
            (item) =>
              getItemRegionFamily(item) === label
              && (activeDynastyFilter.value === ALL_FILTER || item.dynasty === activeDynastyFilter.value),
          ).length,
    color: getFilterColor(index + 2),
  })),
);

const photoMoodStyles: Record<BuildingPhotoMood, { tone: string; glow: string; line: string }> = {
  sepia: {
    tone: 'linear-gradient(180deg, rgba(229, 219, 201, 0.88), rgba(193, 174, 151, 0.76))',
    glow: 'rgba(255, 255, 255, 0.18)',
    line: 'rgba(135, 102, 80, 0.22)',
  },
  mist: {
    tone: 'linear-gradient(180deg, rgba(222, 221, 216, 0.9), rgba(186, 186, 179, 0.72))',
    glow: 'rgba(244, 243, 239, 0.2)',
    line: 'rgba(102, 104, 102, 0.18)',
  },
  earth: {
    tone: 'linear-gradient(180deg, rgba(223, 202, 177, 0.9), rgba(184, 149, 109, 0.78))',
    glow: 'rgba(253, 247, 236, 0.16)',
    line: 'rgba(126, 92, 53, 0.22)',
  },
  timber: {
    tone: 'linear-gradient(180deg, rgba(215, 202, 187, 0.92), rgba(156, 126, 96, 0.78))',
    glow: 'rgba(248, 240, 229, 0.16)',
    line: 'rgba(103, 78, 52, 0.22)',
  },
  stone: {
    tone: 'linear-gradient(180deg, rgba(214, 212, 210, 0.9), rgba(154, 150, 145, 0.78))',
    glow: 'rgba(248, 247, 245, 0.18)',
    line: 'rgba(89, 83, 76, 0.22)',
  },
  ink: {
    tone: 'linear-gradient(180deg, rgba(229, 225, 215, 0.92), rgba(165, 157, 145, 0.8))',
    glow: 'rgba(251, 248, 240, 0.18)',
    line: 'rgba(76, 68, 61, 0.24)',
  },
};

const getAtlasCardStyle = (item: BuildingGalleryItem) => {
  const mood = photoMoodStyles[getItemPhotoMood(item)];
  return {
    '--photo-tone': mood.tone,
    '--photo-glow': mood.glow,
    '--photo-line': mood.line,
  };
};

const atlasGridColumnCount = computed(() =>
  Math.min(3, Math.max(1, atlasItems.value.length)),
);

const atlasGridStyle = computed(() => ({
  '--atlas-grid-columns': String(atlasGridColumnCount.value),
}));

const getAtlasCardPositionClasses = (index: number) => {
  const columnCount = atlasGridColumnCount.value;
  const rowCount = Math.max(1, Math.ceil(atlasItems.value.length / columnCount));
  const column = index % columnCount;
  const row = Math.floor(index / columnCount);

  return [
    column === 0 ? 'atlas-card--col-left' : column === columnCount - 1 ? 'atlas-card--col-right' : 'atlas-card--col-center',
    row === 0 ? 'atlas-card--row-top' : row === rowCount - 1 ? 'atlas-card--row-bottom' : 'atlas-card--row-middle',
  ];
};

const featureDetailCopy: Record<string, { spatial: string; craft: string }> = {
  宅院府第: {
    spatial: '这一组通常沿院门、前厅、正房和套院层层展开，重点在礼序如何被压缩进一套连续的居住路径里。',
    craft: '先看门楼、檐廊、梁架和院墙边界，再看细部装饰如何随着空间等级逐步增强。',
  },
  聚落村寨: {
    spatial: '重点不是单体房屋，而是巷道、院落与公共场地如何共同构成一张连续的聚居网络。',
    craft: '阅读时应多看道路、水系、转角和入口控制，这些群体组织线索比单一立面更关键。',
  },
  园居草堂: {
    spatial: '院落、园景、书斋和居室常被交错布置，空间节奏比普通宅院更自由，也更强调停驻与游观。',
    craft: '可重点观察亭、廊、堂、窗与景框关系，理解日常起居和观赏性空间如何彼此嵌套。',
  },
  土楼碉堡: {
    spatial: '厚墙、角楼或塔楼与向心院落共同构成强边界，内部交通和生活空间则围绕核心院心组织。',
    craft: '先抓外围防护体量，再看开窗节制、楼层关系和内部单元重复，防御逻辑通常比立面装饰更重要。',
  },
  吊脚干栏: {
    spatial: '架空层、上层起居层与外侧廊道共同适应山地地形和湿热气候，空间往往随着坡地高差展开，而不是严格平铺在单一平面上。',
    craft: '线稿里最值得看的是柱脚处理、挑梁和栏板系统，它们直接决定了建筑如何把木构轻巧地落在复杂地形上。',
  },
  城墙城防: {
    spatial: '重点看门、墙、楼、关如何围合出连续防线，官式控制通常通过外向边界和节点层级体现。',
    craft: '阅读时应留意台基、洞门、箭窗、登城路径和转折节点，这些地方最能说明防御体系的真实组织方式。',
  },
  衙署公堂: {
    spatial: '门、堂、院串起接见、办公与审理流程，中轴推进和前后场转换是最核心的空间特征。',
    craft: '可从仪门、月台、正堂和廊庑关系切入，观察行政秩序如何被建筑界面固定下来。',
  },
  楼阁钟鼓: {
    spatial: '垂直体量通常占据城市制高点，通过登楼路径与开敞眺望面形成明显的地标性和公共性。',
    craft: '重点看基座、层檐、望层和开窗节奏，越是高耸的楼阁越依赖这些部位来建立比例与识别度。',
  },
  府第会馆: {
    spatial: '这一类常把迎宾、会客、居住和仪式空间压缩在同一组院落中，前后分区比单一中轴更重要。',
    craft: '注意照壁、前厅、过厅和内宅之间的递进关系，它们决定了“府第”与“会馆”的双重属性如何共存。',
  },
  仓驿设施: {
    spatial: '功能组织优先于装饰，重点是交通节点、仓储空间和人员流线如何高效衔接。',
    craft: '阅读时更应关注场地边界、出入口、廊道与附属房舍配置，而不是孤立地看单体立面。',
  },
  考院学署: {
    spatial: '这类建筑强调规整分隔和制度化线路，空间最重要的不是气势，而是秩序和可管理性。',
    craft: '可重点看分区、编号式单元、廊道和前后场关系，理解考试制度如何变成建筑平面的组织规则。',
  },
  书院礼制: {
    spatial: '院落、中轴和礼制节点共同构成教学与祭祀并行的空间秩序，整体更偏文治而非行政。',
    craft: '建议多看礼门、讲堂、祭祀空间和院落层级，线稿能把礼制关系看得比照片更直接。',
  },
  监狱设施: {
    spatial: '围护、隔离与监管线路是首要特征，空间逻辑明显区别于传统官署的礼序型推进。',
    craft: '重点观察围墙、监区分隔、出入口控制和巡视路径，它们比装饰更能定义这类建筑。',
  },
  拱桥: {
    spatial: '桥体围绕券洞、桥墩与桥面跨越关系展开，重点在跨径、净空和泄水组织。',
    craft: '先看拱券与桥墩，再看栏板、望柱和附拱，石作桥梁的关键识别点几乎都集中在这些部位。',
  },
  廊桥风雨桥: {
    spatial: '桥与廊屋叠合后，通行、停驻、避雨和社交被放进同一个截面里，空间层次明显更复杂。',
    craft: '阅读时建议把桥面、屋架和栏杆一起看，判断廊屋如何为桥梁增加使用时长和公共性。',
  },
  梁桥栈道: {
    spatial: '线性跨越是核心，桥梁往往依赖连续梁架或附壁栈道顺势延伸，而不是集中在单一大跨上。',
    craft: '先看支撑节点和跨距节奏，再看桥面与地形、水面高差如何被连续构件消化。',
  },
  堤闸纤道: {
    spatial: '桥梁与闸、坝、堤、纤道并置时，阅读重点应从单桥转向整套水工系统与通行系统的叠合。',
    craft: '可观察桥位、闸位、纤道与岸线关系，理解交通设施如何服从水利控制逻辑。',
  },
  桥群复合: {
    spatial: '重点不在单桥，而在多桥如何分担不同方向、尺度和水位条件下的交通需求。',
    craft: '桥群更适合整体比对，建议结合节点位置、桥型差异和与聚落的接口关系来阅读。',
  },
  综合桥梁: {
    spatial: '这类样本可先从桥位、桥面和水系关系入手，再逐步判断其更接近哪一种典型桥型。',
    craft: '如果类型不够典型，就优先看承重方式、跨度节奏和桥体与岸线的连接处理。',
  },
  王府宫苑: {
    spatial: '王府与宫苑通常强调入口控制、前朝后居和苑囿层次，观看时要把礼制与生活空间一起理解。',
    craft: '可重点看府门、主要殿堂、附属院落和苑墙边界，理解高等级居住如何被制度化布局固定。',
  },
  宫殿宫城: {
    spatial: '高台、殿身和广场式前场是这类建筑最典型的空间骨架，强调中心性和等级感。',
    craft: '阅读时先抓台基与殿身比例，再看屋顶体量、台阶和轴线对称，这些是宫殿辨识的第一信号。',
  },
  园林山庄: {
    spatial: '建筑、园路、水体和地形共同组织观看路径，比单体更重要的是整体游观节奏。',
    craft: '建议从主要停驻点、观景框架和路径转折切入，理解山庄类样本如何把建筑嵌入自然地形。',
  },
  楼台影壁: {
    spatial: '这类构筑更偏向门面、标识或节点性构件，体量虽小，却承担了强烈的象征与视觉引导功能。',
    craft: '重点看立面比例、图像化装饰和视线遮挡关系，它们决定了这类样本的纪念性强弱。',
  },
};

const regionDetailCopy: Record<string, string> = {
  华北: '华北样本整体更强调轴线、台基、厚墙与控制边界，不论民居还是官式建筑都更重整体秩序感。',
  华东: '华东样本通常在院落细部、园居关系和水网环境适应上更丰富，结构差异也最适合做横向对比。',
  华中: '华中兼具中原厚重与湖湘聚落特征，院落、城防、桥梁与山地住居都能在这里看到过渡形态。',
  华南: '华南样本常见围护住居、侨乡建筑和沿海商业空间，防御性与开放性往往并存。',
  西南: '西南样本更强调山地顺应、木构架空和风雨通行系统，空间组织与地形联系尤其紧密。',
  西北: '西北地区的建筑更容易体现边防、夯土和厚重围护特征，建筑与地理环境的对抗性更强。',
  东北: '东北样本更常和边地治理、近代转型或清代高等级建筑联系在一起，时代信息非常明确。',
  跨区域: '这一标签用于容纳不易直接归入单一区域的样本，可优先回到结构和年代线索继续阅读。',
};

const variantDetailCopy: Record<string, string> = {
  'residence-courtyard': '线稿阅读建议：先看院门和主厅的轴线，再看厢房、过厅与边界墙体如何围出日常生活的秩序。',
  'residence-tulou': '线稿阅读建议：先看外围厚墙和内院的向心关系，再看居住单元如何沿环形或多边边界重复展开。',
  'residence-stilted': '线稿阅读建议：重点观察架空层、柱网和外廊，它们是山地木构最能说明地域适应性的部分。',
  'residence-diaolou': '线稿阅读建议：先抓塔楼体量和窗洞密度，再看附属院落和地面生活空间如何围绕它布置。',
  'office-hall': '线稿阅读建议：优先识别台基、厅堂和廊庑关系，判断空间是如何围绕核心公堂组织的。',
  'office-gate': '线稿阅读建议：先看门楼、城台、洞门和防御折线，再看人流如何穿过这些控制节点。',
  'office-yamen': '线稿阅读建议：门、堂、院的前后推进关系最关键，先抓总序列，再细看附属院落。',
  'palace-hall': '线稿阅读建议：先抓高台、殿身和屋顶体量，再看台阶、前场和轴线如何强化等级感。',
  'palace-gate': '线稿阅读建议：重点观察门阙、入口控制和外朝前场的关系，它们决定了高等级空间的进入节奏。',
  'palace-tower': '线稿阅读建议：先看垂直体量、层檐和观望面，再判断其在整体场地中承担的标识作用。',
  'bridge-arch': '线稿阅读建议：优先识别拱券、桥墩和桥面标高，再看附拱、栏板与泄水细节。',
  'bridge-beam': '线稿阅读建议：先看梁架跨越方式和支撑节奏，再判断桥体如何顺应水面与岸线高差。',
  'bridge-corridor': '线稿阅读建议：把桥面与屋架一起看，重点理解“通行”和“停驻”如何共享同一结构。 ',
};

const detailSections = computed(() => {
  const item = detailItem.value;

  if (!item) {
    return [];
  }

  if (isQingchengItem(item)) {
    return [
      {
        title: '空间格局',
        body: '以“街巷-门厅-院落-正房”的纵深序列组织空间，兼具临街交流与内院起居。',
      },
      {
        title: '地域与营造',
        body: '受黄河上游气候与材料条件影响，常见厚墙围护、木梁架承重与廊檐缓冲。',
      },
      {
        title: '线稿阅读',
        body: '先看屋顶轮廓与院落边界，再看门厅、正房、厢房关系与梁架节点。',
      },
    ];
  }

  const structureLabel = getItemStructureFeature(item);
  const regionLabel = getItemRegionFamily(item);
  const tagLabel = item.tags.slice(0, 3).join('、') || '体量、构架与界面';
  const groupLabel = currentGroup.value?.subtitle ?? currentCategory.value?.title ?? '当前专题';

  return [
    {
      title: '空间格局',
      body: featureDetailCopy[structureLabel]?.spatial ?? `${item.summary} 这组样本可重点观察 ${structureLabel} 如何组织 ${groupLabel} 的空间层次。`,
    },
    {
      title: '地域与营造',
      body: regionDetailCopy[regionLabel] ?? `${regionLabel} 线索对应 ${item.region} 一带的建造传统，可结合 ${groupLabel} 继续观察材料、气候适应与使用方式。`,
    },
    {
      title: '线稿阅读',
      body: `${featureDetailCopy[structureLabel]?.craft ?? `建议从 ${tagLabel} 等线索切入，结合 ${item.year} 年代判断当前样本的主要识别点。`} ${variantDetailCopy[item.variant] ?? '可继续比对屋顶轮廓、主要承重节点与界面层次。'}`.trim(),
    },
  ];
});

const enterCategory = (categoryId: string) => {
  activeCategoryId.value = categoryId;
  activeGroupId.value = null;
  activeItemId.value = null;
  hoveredItemId.value = null;
};

const enterGroup = (groupId: string) => {
  activeGroupId.value = groupId;
  hoveredItemId.value = null;
  atlasWindowStart.value = 0;
};

const resetToHome = () => {
  activeCategoryId.value = null;
  activeGroupId.value = null;
  activeItemId.value = null;
  hoveredItemId.value = null;
  atlasDetailItemId.value = null;
  atlasWindowStart.value = 0;
  syncDetailQuery(null);
};

const goBackOneLevel = () => {
  if (isAtlasDetailView.value) {
    closeAtlasDetail();
    return;
  }

  if (activeGroupId.value) {
    activeGroupId.value = null;
    activeItemId.value = null;
    hoveredItemId.value = null;
    atlasDetailItemId.value = null;
    atlasWindowStart.value = 0;
    return;
  }

  resetToHome();
};

const syncDetailQuery = (detailId: string | null) => {
  const nextQuery = { ...route.query };

  if (detailId) {
    nextQuery.detail = detailId;
  } else {
    delete nextQuery.detail;
  }

  router.replace({ query: nextQuery }).catch(() => {});
};

const openAtlasDetail = (itemId: string) => {
  activeItemId.value = itemId;
  atlasDetailItemId.value = itemId;
  hoveredItemId.value = null;
  syncAtlasWindow(itemId);
  syncDetailQuery(itemId);
};

const closeAtlasDetail = () => {
  atlasDetailItemId.value = null;
  hoveredItemId.value = null;
  syncDetailQuery(null);
};

const getCurrentWheelItems = () => {
  return galleryItems.value;
};

const getWheelDirection = (event: WheelEvent) => {
  const dominantDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

  if (dominantDelta > 0) {
    return 1;
  }

  if (dominantDelta < 0) {
    return -1;
  }

  return 0;
};

const handleImageWheel = (event: WheelEvent, baseItemId?: string | null) => {
  const now = Date.now();

  if (now - lastWheelSwitchAt < WHEEL_SWITCH_COOLDOWN) {
    return;
  }

  const direction = getWheelDirection(event);

  if (!direction) {
    return;
  }

  const items = getCurrentWheelItems();

  if (items.length < 2) {
    return;
  }

  const currentId = displayedItemId.value ?? baseItemId ?? activeItemId.value;
  const currentIndex = items.findIndex((item) => item.id === currentId);
  const safeIndex = currentIndex < 0 ? 0 : currentIndex;
  const nextIndex = (safeIndex + direction + items.length) % items.length;

  const nextItem = items[nextIndex];

  if (!nextItem) {
    return;
  }

  lastWheelSwitchAt = now;
  activeItemId.value = nextItem.id;
  hoveredItemId.value = isAtlasDetailView.value ? null : nextItem.id;
  syncAtlasWindow(nextItem.id);

  if (isAtlasDetailView.value) {
    atlasDetailItemId.value = nextItem.id;
    syncDetailQuery(nextItem.id);
  }
};

const selectItem = (itemId: string) => {
  activeItemId.value = itemId;
  syncAtlasWindow(itemId);

  if (isAtlasDetailView.value) {
    atlasDetailItemId.value = itemId;
    syncDetailQuery(itemId);
  }
};

const setHoveredItem = (itemId: string | null) => {
  hoveredItemId.value = itemId;
};

const selectDynastyFilter = (filter: string) => {
  const nextItems = getFilteredItems(filter, activeRegionFilter.value);
  activeDynastyFilter.value = filter;

  if (!nextItems.length) {
    activeRegionFilter.value = ALL_FILTER;
  }

  hoveredItemId.value = null;
};

const selectRegionFilter = (filter: string) => {
  const nextItems = getFilteredItems(activeDynastyFilter.value, filter);
  activeRegionFilter.value = filter;

  if (!nextItems.length) {
    activeDynastyFilter.value = ALL_FILTER;
  }

  hoveredItemId.value = null;
};

const clearAtlasFilters = () => {
  activeDynastyFilter.value = ALL_FILTER;
  activeRegionFilter.value = ALL_FILTER;
  hoveredItemId.value = null;
  atlasDetailItemId.value = null;
  atlasWindowStart.value = 0;
  syncDetailQuery(null);
};

watch(
  () => activeGroupId.value,
  () => {
    clearAtlasFilters();
  },
  { immediate: true },
);

watch(
  () => route.query.detail,
  (detail) => {
    atlasDetailItemId.value = typeof detail === 'string' ? detail : null;

    if (typeof detail === 'string') {
      activeItemId.value = detail;
    }

    syncAtlasWindow(typeof detail === 'string' ? detail : activeItemId.value);
  },
  { immediate: true },
);

watch(
  isAtlasView,
  (enabled) => {
    if (!enabled && atlasDetailItemId.value !== null) {
      atlasDetailItemId.value = null;
      syncDetailQuery(null);
    }

    if (!enabled) {
      atlasWindowStart.value = 0;
      return;
    }

    syncAtlasWindow(atlasDetailItemId.value ?? activeItemId.value);
  },
);

watch(
  () => galleryItems.value,
  (items) => {
    if (!items.length) {
      activeItemId.value = null;
      atlasDetailItemId.value = null;
      atlasWindowStart.value = 0;
      syncDetailQuery(null);
      return;
    }

    if (!items.some((item) => item.id === activeItemId.value)) {
      activeItemId.value = items[0].id;
    }

    if (atlasDetailItemId.value && !items.some((item) => item.id === atlasDetailItemId.value)) {
      atlasDetailItemId.value = null;
      syncDetailQuery(null);
    }

    syncAtlasWindow(atlasDetailItemId.value ?? activeItemId.value);
  },
  { immediate: true },
);

watch(
  () => [isAtlasView.value, activeItemId.value, atlasDetailItemId.value] as const,
  ([enabled, activeItem, detailItemId]) => {
    if (!enabled) {
      atlasWindowStart.value = 0;
      return;
    }

    syncAtlasWindow(detailItemId ?? activeItem);
  },
);

watch(
  () => detailItem.value?.id ?? null,
  () => {
    paperSketchLoadStep.value = 0;
  },
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
  background: #f3ecde;
}

.building-section-screen__icon {
  position: absolute;
  top: 20px;
  left: 0;
  z-index: 28;
  width: clamp(120px, 10vw, 168px);
  height: auto;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  opacity: 0.94;
}

.building-section-screen__scene,
.building-section-screen__wash,
.building-section-screen__grain,
.building-section-screen__motif {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.building-section-screen__scene {
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
  opacity: 0.86;
}

.building-section-screen__wash {
  background:
    linear-gradient(180deg, rgba(252, 248, 241, 0.12), rgba(246, 239, 228, 0.04)),
    radial-gradient(circle at 18% 92%, rgba(248, 243, 234, 0.72), transparent 24%),
    radial-gradient(circle at 86% 92%, rgba(248, 243, 234, 0.72), transparent 24%),
    radial-gradient(circle at 20% 16%, rgba(255, 255, 255, 0.12), transparent 24%),
    radial-gradient(circle at 74% 24%, rgba(214, 186, 164, 0.05), transparent 24%);
}

.building-section-screen__grain {
  background: repeating-linear-gradient(135deg, rgba(129, 99, 77, 0.018) 0, rgba(129, 99, 77, 0.018) 1px, transparent 1px, transparent 18px);
  mix-blend-mode: multiply;
}

.building-section-screen__motif {
  display: none;
}

.catalog-shell {
  position: relative;
  z-index: 10;
  height: 100%;
  padding: 14px;
  box-sizing: border-box;
}

.catalog-shell--with-hud {
  --catalog-hud-offset: 74px;
}

.catalog-hud {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  z-index: 30;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
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

.catalog-shell--with-hud .stage--gallery {
  box-sizing: border-box;
}

.catalog-shell--with-hud .stage--gallery {
  padding-top: var(--catalog-hud-offset);
}

.stage--home,
.stage--groups {
  margin: -14px;
  height: calc(100% + 28px);
}

.stage--groups {
  position: relative;
}

.stage-actions--floating {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-grid {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  background:
    linear-gradient(180deg, rgba(244, 238, 227, 0.18), rgba(233, 225, 210, 0.1)),
    rgba(241, 235, 224, 0.16);
}

.category-slab {
  --accent-color: #4f7462;
  --outline-color: #3a6454;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  padding: 26px 20px 22px;
  border: none;
  background: transparent;
  box-shadow: none;
  text-align: left;
  cursor: pointer;
  isolation: isolate;
  transition: transform 0.28s ease, filter 0.28s ease, background-color 0.28s ease;
}

.category-slab::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background:
    linear-gradient(180deg, transparent, rgba(126, 98, 78, 0.22) 14%, rgba(126, 98, 78, 0.26) 80%, transparent);
  opacity: 0.95;
}

.category-slab:last-child::after {
  display: none;
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
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(218, 208, 192, 0.12), transparent 55%),
    radial-gradient(circle at 78% 20%, color-mix(in srgb, var(--accent-color) 6%, transparent), transparent 32%);
  opacity: 0.72;
}

.category-slab--poster::before {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 35%),
    radial-gradient(circle at 78% 20%, color-mix(in srgb, var(--accent-color) 6%, transparent), transparent 30%);
}

.category-slab:hover {
  transform: translateY(-2px);
  filter: saturate(1.05);
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
  opacity: 0.58;
}

.category-slab--poster .category-slab__overlay {
  opacity: 0.22;
}

.category-slab--poster .category-slab__content,
.category-slab--poster .category-slab__art {
  background: transparent;
}

.category-slab--poster:hover .category-slab__poster-copy {
  background: rgba(248, 245, 242, 0.68);
}

.category-slab--poster:hover .category-slab__overlay {
  opacity: 0.1;
}

.category-slab__content,
.category-slab__poster-copy,
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
  max-width: 260px;
}

.category-slab__poster-copy {
  display: grid;
  gap: 10px;
  align-self: flex-start;
  width: min(252px, calc(100% - 28px));
  padding: 12px 14px;
  border: 1px solid rgba(146, 118, 97, 0.14);
  background: rgba(244, 239, 235, 0.46);
  box-shadow: 0 8px 20px rgba(70, 52, 41, 0.05);
  backdrop-filter: blur(4px);
}

.category-slab__poster-head {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.category-slab__poster-title-wrap {
  min-width: 0;
}

.category-slab__poster-copy p {
  margin: 0;
  font-family: 'ContentFont', serif;
  font-size: 12px;
  line-height: 1.76;
  color: rgba(78, 58, 47, 0.82);
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
  margin-top: 18px;
  transform-origin: center bottom;
  transition: transform 0.28s ease;
}

.category-slab--poster .category-slab__art {
  margin-top: 0;
}

.category-slab:hover .category-slab__art {
  transform: scale(1.03) translateY(-2px);
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
  background: rgba(248, 243, 236, 0.42);
  backdrop-filter: blur(5px);
}

.stage--home .category-slab__seal,
.stage--groups .category-slab__seal,
.stage--home .category-slab__alias,
.stage--groups .category-slab__alias,
.stage--home .category-slab__english,
.stage--groups .category-slab__english,
.stage--home .category-slab__title-wrap p,
.stage--groups .category-slab__title-wrap p,
.stage--home .category-slab__poster-copy p,
.stage--groups .category-slab__poster-copy p,
.stage--groups .group-slab__eyebrow,
.stage--home .category-slab__enter,
.stage--groups .category-slab__enter,
.stage--groups .group-slab__footer,
.stage--groups .group-slab__count {
  display: none;
}

.stage--home .category-slab,
.stage--groups .category-slab {
  justify-content: flex-end;
}

.stage--home .category-slab__content,
.stage--groups .category-slab__content {
  grid-template-columns: 1fr;
  gap: 0;
  max-width: none;
  align-self: flex-end;
}

.stage--home .category-slab__poster-copy,
.stage--groups .category-slab__poster-copy {
  gap: 0;
  align-self: flex-end;
  width: auto;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.stage--home .category-slab__poster-head,
.stage--groups .category-slab__poster-head {
  grid-template-columns: 1fr;
  gap: 0;
}

.stage--home .category-slab__title-wrap,
.stage--groups .category-slab__title-wrap,
.stage--home .category-slab__poster-title-wrap,
.stage--groups .category-slab__poster-title-wrap,
.stage--groups .group-slab__title-wrap {
  max-width: none;
}

.stage--home .category-slab__title,
.stage--groups .category-slab__title {
  font-size: clamp(42px, 4.8vw, 68px);
  line-height: 0.96;
  color: #2e1f19;
  text-shadow: 0 3px 16px rgba(255, 247, 236, 0.22);
}

.stage--groups .group-slab__title {
  font-size: clamp(40px, 4.4vw, 62px);
}

.stage--home .category-slab__art,
.stage--groups .category-slab__art {
  margin-top: 0;
}

.group-grid {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  background:
    linear-gradient(180deg, rgba(244, 238, 227, 0.18), rgba(233, 225, 210, 0.1)),
    rgba(241, 235, 224, 0.16);
}

.group-slab {
  min-height: 0;
}

.group-slab__content {
  max-width: none;
  grid-template-columns: 48px minmax(0, 1fr);
}

.group-slab__poster-copy {
  width: min(324px, calc(100% - 28px));
}

.group-slab__title-wrap {
  max-width: 280px;
}

.group-slab__eyebrow {
  margin-bottom: 6px;
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: rgba(93, 73, 59, 0.62);
  text-transform: uppercase;
}

.group-slab__title {
  font-size: clamp(28px, 3vw, 40px);
}

.group-slab__title-wrap--right {
  margin-left: auto;
  text-align: right;
}

.group-slab__title--right {
  margin-left: auto;
  text-align: right;
}

.group-slab__art {
  margin-top: 14px;
}

.group-slab__footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.group-slab__count {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px 6px;
  border: 1px solid rgba(147, 116, 93, 0.16);
  background: rgba(250, 246, 239, 0.72);
  font-family: 'ContentFont', serif;
  font-size: 12px;
  color: rgba(81, 61, 49, 0.76);
}

.group-slab .category-slab__enter {
  margin-top: 0;
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
  position: relative;
  min-height: 0;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent 42%),
    rgba(246, 240, 229, 0.46);
}

.feature-card__visual {
  position: absolute;
  inset: 0;
  will-change: opacity, transform, filter;
  pointer-events: none;
}

.feature-card__visual :deep(.architecture-sketch) {
  width: 100%;
  height: 100%;
}

.feature-card__content {
  align-self: center;
}

.feature-card__copy {
  display: block;
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

.side-panel {
  background: rgba(239, 231, 215, 0.78);
  border: 1px solid rgba(154, 121, 98, 0.12);
  box-shadow: 0 12px 28px rgba(72, 52, 40, 0.08);
  backdrop-filter: blur(6px);
}

.legend-block + .legend-block {
  margin-top: 12px;
}

.legend-block__title {
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(163, 72, 58, 0.38);
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', 'Songti SC', serif;
  font-size: 19px;
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

.legend-block__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.legend-block__chips span,
.atlas-strip__meta span,
.atlas-card__title-row span {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px 3px;
  border: 1px solid rgba(147, 116, 93, 0.16);
  background: rgba(249, 244, 236, 0.82);
  font-family: 'ContentFont', serif;
  font-size: 11px;
  color: rgba(83, 61, 49, 0.78);
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
  gap: 3px;
  min-width: 0;
}

.legend-row__text strong {
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', 'Songti SC', serif;
  font-size: 16px;
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
  margin-top: 3px;
}

.legend-row__dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--legend-color);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.24);
}

.legend-row__meta em {
  font-family: 'STSong', 'SimSun', 'Songti SC', serif;
  font-size: 11px;
  font-style: normal;
  color: rgba(88, 64, 52, 0.72);
}

.legend-block--note {
  display: grid;
  gap: 8px;
}

.stage--gallery.stage--atlas {
  grid-template-columns: 220px minmax(0, 1fr) 244px;
  gap: 14px;
  align-items: stretch;
}

.stage--gallery.stage--atlas-detail {
  grid-template-columns: 280px minmax(0, 1fr) 244px;
}

.side-panel--atlas-left {
  min-height: 0;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  align-self: center;
}

.side-panel--atlas-left .legend-block {
  width: 100%;
}

.side-panel--atlas-detail-left {
  min-height: 0;
  padding: 16px 18px;
  overflow: hidden;
}

.detail-side {
  display: grid;
  align-content: start;
  gap: 14px;
  min-height: 0;
}

.detail-side__brand {
  display: grid;
  gap: 8px;
}

.detail-side__eyebrow {
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.24em;
  color: rgba(104, 77, 63, 0.62);
  text-transform: uppercase;
}

.detail-side__brand h2 {
  margin: 0;
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 28px;
  line-height: 1.08;
  color: #5a281f;
}

.detail-side__block {
  display: grid;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(163, 72, 58, 0.2);
}

.detail-side__block h3 {
  margin: 0;
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 18px;
  color: #8f3a2f;
}

.detail-side__block p {
  margin: 0;
  font-family: 'ContentFont', serif;
  font-size: 12px;
  line-height: 1.78;
  color: rgba(82, 61, 49, 0.82);
}

.detail-side__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-side__meta span {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px 3px;
  border: 1px solid rgba(147, 116, 93, 0.16);
  background: rgba(249, 244, 236, 0.82);
  font-family: 'ContentFont', serif;
  font-size: 11px;
  color: rgba(83, 61, 49, 0.78);
}

.atlas-reset {
  border: 1px solid rgba(151, 117, 93, 0.18);
  background: rgba(248, 242, 234, 0.84);
  font-family: 'ContentFont', serif;
  font-size: 12px;
  color: rgba(84, 62, 49, 0.82);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
}

.atlas-reset:hover {
  transform: translateY(-1px);
  border-color: rgba(160, 74, 59, 0.28);
}

.atlas-reset {
  padding: 7px 11px 6px;
  border-radius: 999px;
  justify-self: start;
}

.atlas-main {
  --accent-color: #b45b47;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}

.atlas-main--detail {
  grid-template-rows: minmax(0, 1fr);
}

.atlas-strip__eyebrow {
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.24em;
  color: rgba(104, 77, 63, 0.62);
  text-transform: uppercase;
}

.atlas-strip {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 2px 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.atlas-strip__title h3 {
  margin: 6px 0 0;
  font-family: 'ChartTitleFont', 'TitleFont', serif;
  font-size: 34px;
  line-height: 1.02;
  color: #5b2a20;
}

.atlas-strip__title p {
  margin: 8px 0 0;
  font-family: 'ContentFont', serif;
  font-size: 12px;
  line-height: 1.72;
  color: rgba(84, 62, 49, 0.78);
}

.atlas-strip__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.atlas-hero {
  position: relative;
  min-height: 0;
  height: 100%;
  min-height: 420px;
  overflow: hidden;
  border: 1px solid rgba(147, 116, 93, 0.16);
  border-radius: 28px 10px 28px 10px;
  background:
    linear-gradient(180deg, rgba(243, 238, 228, 0.96), rgba(233, 225, 210, 0.94)),
    radial-gradient(circle at 16% 12%, rgba(255, 255, 255, 0.16), transparent 24%);
  box-shadow: 0 14px 30px rgba(72, 54, 41, 0.09);
}

.atlas-hero__photo,
.atlas-hero__sheet,
.atlas-hero__ink {
  position: absolute;
  inset: 0;
}

.atlas-hero__photo {
  z-index: 0;
  background-repeat: no-repeat;
  background-size: cover;
  filter: grayscale(1) sepia(0.16) contrast(0.9);
  opacity: 0.1;
}

.atlas-hero__photo--ghost {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 44px;
}

.atlas-hero__photo--ghost :deep(.architecture-sketch) {
  width: 100%;
  height: 100%;
  opacity: 0.2;
}

.atlas-hero__sheet {
  z-index: 1;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent 28%),
    repeating-linear-gradient(
      0deg,
      transparent 0,
      transparent 26px,
      rgba(118, 95, 77, 0.03) 26px,
      rgba(118, 95, 77, 0.03) 27px
    );
}

.atlas-hero__ink {
  inset: 2% 4% 2% 4%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.atlas-hero__ink :deep(.architecture-sketch) {
  width: 100%;
  height: 100%;
}

.atlas-hero__ink-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  filter: sepia(0.18) saturate(0.92) contrast(0.96);
}

.atlas-hero--paper-only {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
}

.atlas-hero__paper-clean {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  filter: none;
  transform: scale(1.01);
  transform-origin: center center;
}

.atlas-hero__caption {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 18px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.atlas-hero__caption span {
  display: inline-flex;
  align-items: center;
  padding: 5px 9px 4px;
  border: 1px solid rgba(147, 116, 93, 0.16);
  background: rgba(249, 244, 236, 0.82);
  font-family: 'ContentFont', serif;
  font-size: 11px;
  color: rgba(83, 61, 49, 0.78);
}

.hero-visual-fade-enter-active,
.hero-visual-fade-leave-active {
  transition:
    opacity 0.36s ease,
    transform 0.42s ease,
    filter 0.42s ease;
}

.hero-visual-fade-enter-from,
.hero-visual-fade-leave-to {
  opacity: 0;
  transform: scale(1.03);
  filter: blur(2px);
}

.feature-visual-fade-enter-active,
.feature-visual-fade-leave-active {
  transition:
    opacity 0.42s ease,
    transform 0.48s ease,
    filter 0.48s ease;
}

.feature-visual-fade-enter-from,
.feature-visual-fade-leave-to {
  opacity: 0;
  transform: scale(1.035);
  filter: blur(4px);
}

.feature-copy-fade-enter-active,
.feature-copy-fade-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.24s ease;
}

.feature-copy-fade-enter-from,
.feature-copy-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.atlas-grid {
  --atlas-grid-columns: 3;
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-columns: repeat(var(--atlas-grid-columns), minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: 12px;
  padding: 16px;
}

.atlas-card {
  --atlas-origin-x: center;
  --atlas-origin-y: center;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(147, 116, 93, 0.14);
  border-radius: 18px 6px 18px 6px;
  background:
    linear-gradient(180deg, rgba(247, 243, 236, 0.92), rgba(236, 227, 212, 0.94)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent 40%);
  box-shadow: 0 10px 24px rgba(72, 54, 41, 0.08);
  text-align: left;
  cursor: pointer;
  transform-origin: var(--atlas-origin-x) var(--atlas-origin-y);
  transition:
    transform 0.26s ease,
    box-shadow 0.26s ease,
    border-color 0.26s ease,
    filter 0.26s ease,
    opacity 0.26s ease;
}

.atlas-card--col-left {
  --atlas-origin-x: left;
}

.atlas-card--col-center {
  --atlas-origin-x: center;
}

.atlas-card--col-right {
  --atlas-origin-x: right;
}

.atlas-card--row-top {
  --atlas-origin-y: top;
}

.atlas-card--row-middle {
  --atlas-origin-y: center;
}

.atlas-card--row-bottom {
  --atlas-origin-y: bottom;
}

.atlas-card:hover,
.atlas-card.active {
  transform: translateY(-4px) scale(1.03);
  border-color: color-mix(in srgb, var(--accent-color) 28%, rgba(147, 116, 93, 0.2));
  box-shadow: 0 22px 40px rgba(72, 54, 41, 0.14);
}

.atlas-grid--has-hover .atlas-card {
  transform: scale(0.88);
  opacity: 0.58;
  filter: saturate(0.72) brightness(0.94);
  box-shadow: 0 6px 14px rgba(72, 54, 41, 0.05);
}

.atlas-grid--has-hover .atlas-card--hovered {
  z-index: 3;
  transform: scale(1.18);
  opacity: 1;
  filter: none;
  border-color: color-mix(in srgb, var(--accent-color) 42%, rgba(147, 116, 93, 0.22));
  box-shadow: 0 30px 54px rgba(72, 54, 41, 0.2);
}

.atlas-grid--has-hover .atlas-card--dimmed {
  pointer-events: auto;
}

.atlas-card__photo {
  position: relative;
  min-height: 0;
  overflow: hidden;
  background: var(--photo-tone);
}

.atlas-card__photo::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, var(--photo-glow), transparent 28%),
    repeating-linear-gradient(
      0deg,
      transparent 0,
      transparent 23px,
      var(--photo-line) 23px,
      var(--photo-line) 24px
    );
  mix-blend-mode: screen;
}

.atlas-card__image,
.atlas-card__plate {
  position: absolute;
  inset: 0;
}

.atlas-card__image {
  background-repeat: no-repeat;
  background-size: cover;
  filter: grayscale(1) sepia(0.18) contrast(0.92);
  transition: transform 0.28s ease, filter 0.28s ease;
}

.atlas-card__plate {
  padding: 12px 10px 8px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: transform 0.28s ease, filter 0.28s ease, opacity 0.28s ease;
}

.atlas-card__plate :deep(.architecture-sketch) {
  filter: grayscale(1) sepia(0.2) contrast(0.92);
  opacity: 0.9;
}

.atlas-card:hover .atlas-card__image,
.atlas-card.active .atlas-card__image,
.atlas-card:hover .atlas-card__plate,
.atlas-card.active .atlas-card__plate {
  transform: scale(1.12);
}

.atlas-grid--has-hover .atlas-card--hovered .atlas-card__image,
.atlas-grid--has-hover .atlas-card--hovered .atlas-card__plate {
  transform: scale(1.22);
}

.atlas-grid--has-hover .atlas-card--dimmed .atlas-card__image,
.atlas-grid--has-hover .atlas-card--dimmed .atlas-card__plate {
  transform: scale(0.9);
  filter: grayscale(1) sepia(0.1) contrast(0.84) brightness(0.92);
}

.atlas-grid--has-hover .atlas-card--dimmed .atlas-card__veil {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(35, 24, 16, 0.2) 100%),
    radial-gradient(circle at 82% 20%, rgba(255, 255, 255, 0.08), transparent 20%);
}

.atlas-card__badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  padding: 4px 8px 3px;
  border-radius: 999px;
  background: rgba(243, 236, 225, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.42);
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: rgba(79, 57, 45, 0.82);
}

.atlas-card__action {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 2;
  padding: 4px 8px 3px;
  border-radius: 999px;
  background: rgba(243, 236, 225, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.42);
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: rgba(79, 57, 45, 0.8);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.atlas-card:hover .atlas-card__action,
.atlas-card.active .atlas-card__action {
  opacity: 1;
  transform: translateY(0);
}

.atlas-card__veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, transparent 0%, transparent 54%, rgba(41, 29, 19, 0.06) 100%),
    radial-gradient(circle at 82% 20%, rgba(255, 255, 255, 0.14), transparent 20%);
}

.atlas-card__body {
  padding: 10px 12px 12px;
}

.atlas-card__eyebrow {
  font-family: 'ContentFont', serif;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: rgba(96, 74, 61, 0.66);
}

.atlas-card__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
}

.atlas-card__title-row h3 {
  margin: 0;
  font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  font-size: 20px;
  line-height: 1.08;
  color: #5a291f;
}

.atlas-card__body p {
  margin: 8px 0 0;
  font-family: 'ContentFont', serif;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(84, 62, 49, 0.76);
}

.gallery-side--atlas {
  min-height: 0;
}

.side-panel--atlas-right {
  min-height: 0;
  padding: 0;
  display: flex;
  background: transparent;
  border: none;
  box-shadow: none;
  backdrop-filter: none;
}

.side-panel--atlas-right :deep(.era-timeline) {
  flex: 1 1 auto;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
    align-items: flex-end;
  }

  .catalog-shell--with-hud {
    --catalog-hud-offset: 116px;
  }

  .catalog-actions {
    width: auto;
    justify-content: flex-end;
  }

  .building-section-screen__icon {
    top: 18px;
    left: 0;
    width: clamp(92px, 24vw, 126px);
  }

  .category-grid {
    grid-template-columns: 1fr;
    height: auto;
  }

  .group-grid {
    grid-template-columns: 1fr;
  }

  .stage--home,
  .stage--groups {
    margin: -10px;
    height: auto;
    min-height: calc(100vh - 20px);
  }

  .stage--groups {
    padding-top: 62px;
  }

  .stage-actions--floating {
    top: 12px;
    right: 12px;
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

  .stage--gallery.stage--atlas {
    grid-template-columns: 1fr;
  }

  .side-panel--atlas-left,
  .side-panel--atlas-detail-left,
  .atlas-main,
  .side-panel--atlas-right {
    min-height: auto;
  }

  .atlas-strip {
    flex-direction: column;
  }

  .stage--gallery.stage--atlas-detail {
    grid-template-columns: 1fr;
  }

  .atlas-strip__meta {
    justify-content: flex-start;
  }

  .atlas-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
    overflow: visible;
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
