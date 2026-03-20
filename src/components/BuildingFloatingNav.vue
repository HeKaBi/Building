<template>
    <div
        class="building-nav-zone"
        @mouseenter="openPanel"
        @mouseleave="scheduleClose"
    ></div>

    <div class="building-nav-dock" :class="{ 'building-nav-dock--open': isOpen }">
        <div
            class="building-nav-panel"
            @mouseenter="openPanel"
            @mouseleave="scheduleClose"
        >
            <button
                v-for="item in buildingSections"
                :key="item.key"
                type="button"
                class="building-nav-item"
                :class="{ active: activePath === item.path }"
                @click="navigate(item.path)"
            >
                <span class="building-nav-item__title">{{ item.title }}</span>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { buildingSections } from '@/const/buildingSections';

const route = useRoute();
const router = useRouter();
const isOpen = ref(false);
let closeTimer: number | null = null;

const activePath = computed(() => {
    const matchedSection = buildingSections.find((item) => route.path.startsWith(item.path));
    return matchedSection?.path ?? '';
});

const clearCloseTimer = () => {
    if (closeTimer !== null) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
    }
};

const openPanel = () => {
    clearCloseTimer();
    isOpen.value = true;
};

const scheduleClose = () => {
    clearCloseTimer();
    closeTimer = window.setTimeout(() => {
        isOpen.value = false;
        closeTimer = null;
    }, 120);
};

const navigate = (path: string) => {
    clearCloseTimer();
    isOpen.value = false;
    if (route.path !== path) {
        router.push(path);
    }
};

watch(
    () => route.path,
    () => {
        clearCloseTimer();
        isOpen.value = false;
    },
);

onBeforeUnmount(() => {
    clearCloseTimer();
});
</script>

<style scoped lang="scss">
.building-nav-zone {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 24px;
    z-index: 1790;
}

.building-nav-dock {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1800;
    pointer-events: none;
}

.building-nav-panel,
.building-nav-item {
    pointer-events: auto;
}

.building-nav-panel {
    margin-top: 0;
    width: 100vw;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    opacity: 0;
    transform: translateY(calc(-100% - 4px));
    transform-origin: top center;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.building-nav-dock--open .building-nav-panel {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}

.building-nav-item {
    height: 78px;
    border: none;
    border-bottom: 1px solid rgba(154, 67, 54, 0.16);
    background: transparent;
    color: rgba(61, 40, 30, 0.92);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    transition: background-color 180ms ease, color 180ms ease;
    position: relative;
}

.building-nav-item__title {
    font-family: 'NavFont', 'ChartTitleFont', 'Noto Serif TC', 'STKaiti', 'KaiTi', serif;
    font-size: clamp(22px, 2.15vw, 33px);
    line-height: 1;
    letter-spacing: 0.08em;
}

.building-nav-item::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 10px;
    transform: translateX(-50%) scaleX(0.2);
    transform-origin: center;
    width: min(70%, 170px);
    height: 3px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(154, 67, 54, 0.14), rgba(154, 67, 54, 0.98), rgba(154, 67, 54, 0.14));
    opacity: 0;
    transition: opacity 180ms ease, transform 180ms ease;
}

.building-nav-item:hover,
.building-nav-item.active {
    background: rgba(244, 237, 226, 0.64);
    color: #8f3128;
}

.building-nav-item:hover::after,
.building-nav-item.active::after {
    opacity: 1;
    transform: translateX(-50%) scaleX(1);
}

@media (max-width: 980px) {
    .building-nav-zone {
        height: 20px;
    }

    .building-nav-item {
        height: 62px;
    }

    .building-nav-item__title {
        font-size: clamp(14px, 2.8vw, 20px);
        letter-spacing: 0.05em;
    }

    .building-nav-item::after {
        bottom: 7px;
        height: 2px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .building-nav-panel,
    .building-nav-item,
    .building-nav-item::after {
        transition: none;
    }
}
</style>
