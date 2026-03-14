<template>
  <section class="building-section-screen">
    <div class="building-section-screen__wash"></div>
    <div class="building-section-screen__grain"></div>
    <div class="building-section-screen__motif"></div>

    <div class="catalog-shell" :class="{ 'catalog-shell--with-hud': !!currentCategory }">
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
                    <div class="detail-side__eyebrow">{{ atlasEyebrow }}</div>
                    <h2>{{ detailItem.name }}</h2>
                    <button type="button" class="atlas-reset" @click="closeAtlasDetail">
                      返回图册
                    </button>
                  </div>

                  <section class="detail-side__block">
                    <h3>建筑介绍</h3>
                    <p>{{ detailItem.summary }}</p>
                  </section>

                  <section
                    v-for="section in detailSections"
                    :key="section.title"
                    class="detail-side__block"
                  >
                    <h3>{{ section.title }}</h3>
                    <p>{{ section.body }}</p>
                  </section>

                  <div class="detail-side__meta">
                    <span>{{ detailItem.eraLabel }}</span>
                    <span>{{ detailItem.region }}</span>
                    <span>{{ getItemStructureFeature(detailItem) }}</span>
                  </div>
                </section>
              </template>

              <template v-else>
                <section class="legend-block legend-block--note">
                  <h2 class="legend-block__title">图册说明</h2>
                  <p class="legend-block__copy">{{ currentGroup.description }}</p>
                  <div class="legend-block__chips">
                    <span>{{ currentCategory.title }}</span>
                    <span>{{ currentGroup.subtitle }}</span>
                    <span>{{ visibleCountLabel }} 样本</span>
                  </div>
                </section>

                <section v-if="hasStructureFilterOptions" class="legend-block">
                  <h2 class="legend-block__title">结构特点</h2>
                  <p class="legend-block__copy">按主要空间组织方式筛选当前分组样本。</p>

                  <button
                    v-for="item in structureFilterRows"
                    :key="item.label"
                    type="button"
                    class="legend-row legend-row--structure"
                    :class="{ active: activeStructureFilter === item.label }"
                    @click="selectStructureFilter(item.label)"
                  >
                    <span class="legend-row__text">
                      <strong>{{ item.label }}</strong>
                      <small>{{ item.description }}</small>
                    </span>
                    <span class="legend-row__meta">
                      <i class="legend-row__dot" :style="{ '--legend-color': item.color }"></i>
                      <em>{{ item.count }}</em>
                    </span>
                  </button>
                </section>

                <section v-if="hasRegionFilterOptions" class="legend-block">
                  <h2 class="legend-block__title">地域谱系</h2>
                  <div class="legend-block__hint">按地域建造传统缩小图册范围。</div>

                  <button
                    v-for="item in regionFilterRows"
                    :key="item.label"
                    type="button"
                    class="legend-row"
                    :class="{ active: activeRegionFilter === item.label }"
                    @click="selectRegionFilter(item.label)"
                  >
                    <span class="legend-row__text">
                      <strong>{{ item.label }}</strong>
                      <small>{{ item.description }}</small>
                    </span>
                    <span class="legend-row__meta">
                      <i class="legend-row__dot" :style="{ '--legend-color': item.color }"></i>
                      <em>{{ item.count }}</em>
                    </span>
                  </button>
                </section>

                <section class="legend-block legend-block--note">
                  <h2 class="legend-block__title">当前样本</h2>
                  <p class="legend-block__copy">{{ selectedItem.summary }}</p>
                  <div class="legend-block__chips">
                    <span>{{ selectedItem.name }}</span>
                    <span>{{ selectedItem.eraLabel }}</span>
                    <span>{{ selectedItem.region }}</span>
                    <span>{{ getItemStructureFeature(selectedItem) }}</span>
                    <span>{{ visibleCountLabel }}</span>
                  </div>
                  <button v-if="hasAtlasFilters" type="button" class="atlas-reset" @click="clearAtlasFilters">
                    重置筛选
                  </button>
                </section>
              </template>
            </aside>

            <div class="atlas-main" :style="{ '--accent-color': currentCategory.accent }">
              <template v-if="isAtlasDetailView && detailItem">
                <article
                  class="atlas-hero"
                  :style="getAtlasCardStyle(detailItem)"
                  @wheel.capture.stop.prevent="handleImageWheel($event, detailItem.id)"
                >
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
                      <ArchitectureSketch :variant="detailItem.variant" :accent="currentCategory.accent" />
                    </div>
                  </Transition>

                  <div class="atlas-hero__caption">
                    <span>线稿</span>
                    <span>滚轮切换前后样本</span>
                    <span>{{ detailItem.tags.join(' · ') }}</span>
                  </div>
                </article>
              </template>

              <template v-else>
                <div class="atlas-strip">
                  <div class="atlas-strip__title">
                    <div class="atlas-strip__eyebrow">{{ atlasEyebrow }}</div>
                    <h3>{{ currentGroup.title }}</h3>
                    <p>{{ atlasStripCopy }}</p>
                  </div>

                  <div class="atlas-strip__meta">
                    <span>{{ atlasFilterSummary }}</span>
                    <span>{{ visibleCountLabel }} 样本</span>
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

                      <div class="atlas-card__badge">{{ getItemStructureFeature(item) }}</div>
                      <div class="atlas-card__action">点击查看线稿与详解</div>
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
                :items="atlasItems"
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
import { buildingCatalog } from '@/demo/building-section-catalog/catalog';
import type { BuildingGalleryItem, BuildingPhotoMood, SketchVariant } from '@/demo/building-section-catalog/types';

const route = useRoute();
const router = useRouter();
const activeCategoryId = ref<string | null>(null);
const activeGroupId = ref<string | null>(null);
const activeItemId = ref<string | null>(null);
const hoveredItemId = ref<string | null>(null);
const atlasDetailItemId = ref<string | null>(typeof route.query.detail === 'string' ? route.query.detail : null);
const ALL_FILTER = '全部';
const activeStructureFilter = ref(ALL_FILTER);
const activeRegionFilter = ref(ALL_FILTER);
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

const getFilteredItems = (structureFilter: string, regionFilter: string) =>
  orderedItems.value.filter((item) => {
    const matchesStructure = structureFilter === ALL_FILTER || getItemStructureFeature(item) === structureFilter;
    const matchesRegion = regionFilter === ALL_FILTER || getItemRegionFamily(item) === regionFilter;
    return matchesStructure && matchesRegion;
  });

const structureFilters = computed(() => [
  ALL_FILTER,
  ...new Set(orderedItems.value.map((item) => getItemStructureFeature(item)).filter(Boolean)),
]);

const regionFilters = computed(() => [
  ALL_FILTER,
  ...new Set(orderedItems.value.map((item) => getItemRegionFamily(item)).filter(Boolean)),
]);

const hasStructureFilterOptions = computed(() => structureFilters.value.length > 1);
const hasRegionFilterOptions = computed(() => regionFilters.value.length > 1);
const hasAtlasFilters = computed(() => hasStructureFilterOptions.value || hasRegionFilterOptions.value);

const galleryItems = computed(() => getFilteredItems(activeStructureFilter.value, activeRegionFilter.value));

const atlasItems = computed(() => galleryItems.value.slice(0, 9));

const isAtlasDetailView = computed(
  () => isAtlasView.value && !!atlasDetailItemId.value && atlasItems.value.some((item) => item.id === atlasDetailItemId.value),
);

const displayedItemId = computed(() => {
  const preferredId = isAtlasDetailView.value
    ? atlasDetailItemId.value ?? activeItemId.value
    : hoveredItemId.value ?? activeItemId.value;
  const activeCollection = isAtlasView.value ? atlasItems.value : galleryItems.value;

  return activeCollection.some((item) => item.id === preferredId)
    ? preferredId
    : activeCollection[0]?.id ?? null;
});

const selectedItem = computed(
  () => {
    const activeCollection = isAtlasView.value ? atlasItems.value : galleryItems.value;
    return activeCollection.find((item) => item.id === displayedItemId.value) ?? activeCollection[0] ?? null;
  },
);

const detailItem = computed(
  () => atlasItems.value.find((item) => item.id === atlasDetailItemId.value) ?? selectedItem.value,
);

const visibleCountLabel = computed(() =>
  isAtlasView.value
    ? `${atlasItems.value.length}/${galleryItems.value.length}`
    : `${galleryItems.value.length}/${orderedItems.value.length}`,
);

const atlasEyebrow = computed(() =>
  `${currentCategory.value?.english ?? 'Architecture'} Album`,
);

const atlasFilterSummary = computed(() => {
  if (!hasAtlasFilters.value) {
    return currentGroup.value?.subtitle ?? '专题图册';
  }

  const structureLabel = activeStructureFilter.value === ALL_FILTER ? '全部结构' : activeStructureFilter.value;
  const regionLabel = activeRegionFilter.value === ALL_FILTER ? '全部地域' : activeRegionFilter.value;
  return `${structureLabel} · ${regionLabel}`;
});

const atlasStripCopy = computed(() =>
  hasAtlasFilters.value
    ? '点击卡片进入线稿与详细说明页，可结合左侧筛选、滚轮切换与右侧时间轴对比样本。'
    : '点击卡片进入线稿与详细说明页，可结合滚轮切换与右侧时间轴快速浏览当前专题。',
);

const structureFilterDescriptions: Record<string, string> = {
  全部: '查看全部结构类型',
  合院礼序: '以中轴与院落围合为核心',
  宗族聚落: '村巷与合族居住组织并重',
  吊脚干栏: '架空木构适应山地气候',
  深宅大院: '多进院落层层递进',
  防御围屋: '高墙厚土强化聚居防御',
  庄园堡寨: '居住与防御体系叠合',
  商住复合: '住宅兼具商业与交往功能',
  侨乡碉楼: '近代侨乡立面与防御结合',
};

const regionFilterDescriptions: Record<string, string> = {
  全部: '查看全部地域谱系',
  徽派: '天井、马头墙与三雕传统',
  湖湘: '深宅大院与宗族礼序并重',
  '湖湘侗寨': '民族村落与木构系统并行',
  晋派: '晋商合院与城堡式院落',
  江南: '市镇宅院与园居复合',
  客家: '围屋与土楼防御体系',
  '土家山地': '山地干栏与聚落水路',
  中原: '窑院和庄园式院落并存',
  '岭南侨乡': '侨乡塔楼与中西混合立面',
  '闽南侨乡': '红砖大厝与回乡营造传统',
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

const structureFilterRows = computed(() =>
  structureFilters.value.map((label, index) => ({
    label,
    description: structureFilterDescriptions[label] ?? '按该结构类型筛选',
    count:
      label === ALL_FILTER
        ? orderedItems.value.filter((item) => activeRegionFilter.value === ALL_FILTER || getItemRegionFamily(item) === activeRegionFilter.value).length
        : orderedItems.value.filter(
            (item) =>
              getItemStructureFeature(item) === label
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
        ? orderedItems.value.filter((item) => activeStructureFilter.value === ALL_FILTER || getItemStructureFeature(item) === activeStructureFilter.value).length
        : orderedItems.value.filter(
            (item) =>
              getItemRegionFamily(item) === label
              && (activeStructureFilter.value === ALL_FILTER || getItemStructureFeature(item) === activeStructureFilter.value),
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
  合院礼序: {
    spatial: '这一类型通常以中轴和院门为先导，正房、厢房与前院形成清晰主从关系，进入路径、停留节点和视线朝向都被礼序化处理。',
    craft: '重点可观察屋面出檐、院墙收分和木构节点的重复节奏，它们共同把日常起居和家族秩序稳定地组织在同一套空间框架里。',
  },
  宗族聚落: {
    spatial: '重点不是单体房屋，而是多组院落、巷道与水系的连续关系。建筑之间通过街巷、祠堂前场和公共空地形成整体聚居网络。',
    craft: '阅读这类样本时可留意排水、转角、巷道尺度和门楼控制方式，这些细节往往比单一立面更能说明聚落的组织逻辑。',
  },
  吊脚干栏: {
    spatial: '架空层、上层起居层与外侧廊道共同适应山地地形和湿热气候，空间往往随着坡地高差展开，而不是严格平铺在单一平面上。',
    craft: '线稿里最值得看的是柱脚处理、挑梁和栏板系统，它们直接决定了建筑如何把木构轻巧地落在复杂地形上。',
  },
  深宅大院: {
    spatial: '多进院落的递进感是核心特征，入口、前厅、主厅、后院次第展开，空间层次与家族等级被同时编码在建筑序列中。',
    craft: '这种类型通常在门楼、雀替、枋梁和雕花栏板上投入大量工艺，细部密度会随着空间等级提高而增强。',
  },
  防御围屋: {
    spatial: '厚墙、角楼、向心庭院与有限开口共同构成稳定边界，内部生活空间则围绕公共院心和交通环线重新组织。',
    craft: '材料和构造的重点在墙体厚度、开窗节制和高低层防御关系，线稿能帮助你更清楚地看到围护体系如何压倒立面装饰本身。',
  },
  庄园堡寨: {
    spatial: '这类建筑常把居住、防守、仓储和会客叠合在同一体量中，院落并非单纯展开，而是随着地势和防线层层设防。',
    craft: '细看会发现门洞、台地、窑洞或护墙之间的过渡处理非常关键，它们让一组建筑既能生活又能成为堡垒。',
  },
  商住复合: {
    spatial: '前场面向街市或水路，后场转入内院和起居空间，商业、会客与家庭生活被压缩进一套连续但分层的动线里。',
    craft: '线稿阅读时要看檐廊、走马楼、过厅和店宅界面的过渡方式，这些灰空间决定了商住混合的实际体验。',
  },
  侨乡碉楼: {
    spatial: '高耸的塔楼和较低的宅院、晒场并置，垂直防御视角与水平生活院落形成鲜明对比，是近代侨乡民居最显眼的空间特征。',
    craft: '关注塔楼转角、窗洞节奏和中西混合装饰的叠加方式，线稿能把立面上的时代混合性看得比照片更清楚。',
  },
};

const regionDetailCopy: Record<string, string> = {
  徽派: '徽派系统强调天井采光、马头墙防火和砖木石三雕的细部秩序，整体气质偏收敛而内向。',
  湖湘: '湖湘地区的深宅大院常把礼制、宗法和日常生活并置，前后进深大，厅屋关系明确。',
  '湖湘侗寨': '侗寨更强调聚落整体和山地顺应性，房屋与鼓楼、桥梁、水系往往作为一体来阅读。',
  晋派: '晋派民居重院落套合与门楼威仪，墙体厚实、空间递进强，常见商业财富与家族秩序共同作用。',
  江南: '江南宅院尺度更细腻，院落、园居与街巷关系紧密，往往在精工木作和流线组织上见长。',
  客家: '客家系统突出聚族而居与防御性，围屋、土楼和方围通过强边界形成内部稳定共同体。',
  '土家山地': '土家山地住居以架空、顺坡与连桥见长，空间组织与地形关系比中轴对称更重要。',
  中原: '中原庄园常把四合院、台地和防御边界组合在一起，尺度厚重，强调控制与聚合。',
  '岭南侨乡': '岭南侨乡民居保留了传统院落骨架，同时吸收近代立面语汇，形成鲜明的时代混合感。',
  '闽南侨乡': '闽南侨乡大厝更重红砖白石、燕尾脊和多进院落，空间礼序与装饰炫示并存。',
};

const variantDetailCopy: Record<string, string> = {
  'residence-courtyard': '线稿阅读建议：先看院门和主厅的轴线，再看厢房、过厅与边界墙体如何围出日常生活的秩序。',
  'residence-tulou': '线稿阅读建议：先看外围厚墙和内院的向心关系，再看居住单元如何沿环形或多边边界重复展开。',
  'residence-stilted': '线稿阅读建议：重点观察架空层、柱网和外廊，它们是山地木构最能说明地域适应性的部分。',
  'residence-diaolou': '线稿阅读建议：先抓塔楼体量和窗洞密度，再看附属院落和地面生活空间如何围绕它布置。',
};

const detailSections = computed(() => {
  const item = detailItem.value;

  if (!item) {
    return [];
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
};

const resetToHome = () => {
  activeCategoryId.value = null;
  activeGroupId.value = null;
  activeItemId.value = null;
  hoveredItemId.value = null;
  atlasDetailItemId.value = null;
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
  syncDetailQuery(itemId);
};

const closeAtlasDetail = () => {
  atlasDetailItemId.value = null;
  hoveredItemId.value = null;
  syncDetailQuery(null);
};

const getCurrentWheelItems = () => {
  if (isAtlasView.value) {
    return atlasItems.value;
  }

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

  if (isAtlasDetailView.value) {
    atlasDetailItemId.value = nextItem.id;
    syncDetailQuery(nextItem.id);
  }
};

const selectItem = (itemId: string) => {
  activeItemId.value = itemId;

  if (isAtlasDetailView.value) {
    atlasDetailItemId.value = itemId;
    syncDetailQuery(itemId);
  }
};

const setHoveredItem = (itemId: string | null) => {
  hoveredItemId.value = itemId;
};

const selectStructureFilter = (filter: string) => {
  const nextItems = getFilteredItems(filter, activeRegionFilter.value);
  activeStructureFilter.value = filter;

  if (!nextItems.length) {
    activeRegionFilter.value = ALL_FILTER;
  }

  hoveredItemId.value = null;
};

const selectRegionFilter = (filter: string) => {
  const nextItems = getFilteredItems(activeStructureFilter.value, filter);
  activeRegionFilter.value = filter;

  if (!nextItems.length) {
    activeStructureFilter.value = ALL_FILTER;
  }

  hoveredItemId.value = null;
};

const clearAtlasFilters = () => {
  activeStructureFilter.value = ALL_FILTER;
  activeRegionFilter.value = ALL_FILTER;
  hoveredItemId.value = null;
  atlasDetailItemId.value = null;
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
  },
);

watch(
  () => (isAtlasView.value ? atlasItems.value : galleryItems.value),
  (items) => {
    if (!items.length) {
      activeItemId.value = null;
      atlasDetailItemId.value = null;
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

.catalog-shell--with-hud .stage--groups,
.catalog-shell--with-hud .stage--gallery {
  box-sizing: border-box;
  padding-top: var(--catalog-hud-offset);
}

.stage--home {
  margin: -14px;
  height: calc(100% + 28px);
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
  padding: 16px 18px;
  border: 1px solid rgba(147, 116, 93, 0.16);
  border-radius: 24px 8px 24px 8px;
  background:
    linear-gradient(180deg, rgba(245, 239, 230, 0.96), rgba(235, 226, 211, 0.92)),
    radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.18), transparent 26%);
  box-shadow: 0 12px 28px rgba(72, 54, 41, 0.08);
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

  .catalog-shell--with-hud {
    --catalog-hud-offset: 116px;
  }

  .catalog-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .category-grid {
    grid-template-columns: 1fr;
    height: auto;
  }

  .stage--home {
    margin: -10px;
    height: auto;
    min-height: calc(100vh - 20px);
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
