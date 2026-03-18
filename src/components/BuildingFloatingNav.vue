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
                v-for="(item, index) in buildingSections"
                :key="item.key"
                type="button"
                class="building-nav-item"
                :class="{ active: activePath === item.path }"
                @click="navigate(item.path)"
            >
                <span class="building-nav-item__index">0{{ index + 1 }}</span>
                <span class="building-nav-item__copy">
                    <strong>{{ item.title }}</strong>
                    <em>{{ item.subtitle }}</em>
                </span>
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
    left: 50%;
    width: min(320px, calc(100vw - 40px));
    height: 22px;
    z-index: 1790;
    transform: translateX(-50%);
}

.building-nav-dock {
    position: fixed;
    top: 0;
    left: 50%;
    z-index: 1800;
    transform: translateX(-50%);
    pointer-events: none;
}

.building-nav-panel,
.building-nav-item {
    pointer-events: auto;
}

.building-nav-panel {
    margin-top: 0;
    padding: 14px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
    width: min(1080px, calc(100vw - 64px));
    border: 1px solid rgba(99, 66, 45, 0.28);
    border-radius: 24px;
    background:
        linear-gradient(180deg, rgba(243, 235, 224, 0.97), rgba(232, 222, 206, 0.96)),
        radial-gradient(circle at top, rgba(255, 255, 255, 0.24), transparent 46%);
    box-shadow: 0 20px 48px rgba(56, 35, 24, 0.18);
    backdrop-filter: blur(10px);
    opacity: 0;
    transform: translateY(calc(-100% - 10px)) scale(0.98);
    transform-origin: top center;
    pointer-events: none;
    transition: opacity 0.24s ease, transform 0.24s ease;
}

.building-nav-dock--open .building-nav-panel {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
}

.building-nav-item {
    min-height: 88px;
    border: 1px solid rgba(111, 75, 53, 0.16);
    border-radius: 18px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.54), rgba(255, 255, 255, 0.2)),
        linear-gradient(135deg, rgba(198, 158, 120, 0.08), rgba(122, 79, 54, 0.06));
    color: #4b2e1d;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding: 14px 16px;
    text-align: left;
    transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease, color 0.24s ease;
}

.building-nav-item:hover,
.building-nav-item.active {
    transform: translateY(-2px);
    border-color: rgba(138, 64, 42, 0.44);
    box-shadow: 0 12px 22px rgba(122, 66, 43, 0.16);
    color: #8f2f1f;
}

.building-nav-item__index {
    font-family: 'TitleFont', 'Times New Roman', serif;
    font-size: 14px;
    letter-spacing: 0.14em;
    color: rgba(89, 61, 42, 0.68);
}

.building-nav-item__copy {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.building-nav-item__copy strong {
    font-family: 'NavFont', 'STKaiti', 'KaiTi', serif;
    font-size: 24px;
    font-weight: 500;
    letter-spacing: 0.08em;
}

.building-nav-item__copy em {
    font-family: 'ContentFont', 'STSong', 'SimSun', serif;
    font-size: 12px;
    font-style: normal;
    letter-spacing: 0.16em;
    color: rgba(89, 61, 42, 0.78);
}

@media (max-width: 1120px) {
    .building-nav-panel {
        width: min(920px, calc(100vw - 32px));
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 720px) {
    .building-nav-zone {
        height: 18px;
        width: min(220px, calc(100vw - 24px));
    }

    .building-nav-panel {
        width: min(520px, calc(100vw - 20px));
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        padding: 12px;
    }

    .building-nav-item {
        min-height: 76px;
        padding: 12px 14px;
    }

    .building-nav-item__copy strong {
        font-size: 20px;
    }
}
</style>
