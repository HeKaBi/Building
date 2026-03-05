<template>
    <nav class="nav-bar">
        <div
            class="nav-item"
            v-for="(item, index) in navItems"
            :key="item.link"
            :class="{ active: currentIndex === index }"
            @click="handleClick(index)"
        >
            <span class="nav-label">{{ item.title }}</span>
            <span class="nav-ink" aria-hidden="true"></span>
        </div>
    </nav>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import router from '../router';

const navItems = [
    { title: '江山诗脉', link: '/home' },
    { title: '诗海词云', link: '/poetry-summary' },
    { title: '诗络万象', link: '/poet-summary' },
    { title: '诗人行状', link: '/poet-details' },
    { title: '飞花擂台', link: '/feihua' },
];

const currentIndex = ref(0);

const handleClick = (index: number) => {
    currentIndex.value = index;
    const targetPath = navItems[index].link;

    if (router.currentRoute.value.path !== targetPath) {
        router.push(targetPath);
    }
};

watch(
    () => router.currentRoute.value.path,
    (newPath) => {
        const index = navItems.findIndex((item) => item.link === newPath);

        if (index !== -1) {
            currentIndex.value = index;
        }
    },
    {
        immediate: true,
    },
);
</script>

<style scoped lang="scss">
.nav-bar {
    width: 100%;
    height: 78px;
    min-height: 78px;
    max-height: 78px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 clamp(16px, 4vw, 72px);
    box-sizing: border-box;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    margin-bottom: 6px;
    overflow: hidden;
    background:
        linear-gradient(180deg, rgba(246, 238, 225, 0.98) 0%, rgba(234, 220, 200, 0.92) 100%),
        repeating-linear-gradient(
            45deg,
            rgba(118, 79, 53, 0.06) 0,
            rgba(118, 79, 53, 0.06) 1px,
            transparent 1px,
            transparent 8px
        );
    border-top: 1px solid rgba(103, 66, 42, 0.4);
    border-bottom: 1px solid rgba(103, 66, 42, 0.42);
    box-shadow: 0 4px 14px rgba(54, 30, 18, 0.12);
}

.nav-bar::before,
.nav-bar::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 58px;
    height: 58px;
    border: 1px solid rgba(150, 105, 73, 0.24);
    border-radius: 50%;
    transform: translateY(-50%);
    pointer-events: none;
}

.nav-bar::before {
    left: -26px;
}

.nav-bar::after {
    right: -26px;
}

.nav-item {
    flex: 1;
    min-width: 120px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
    cursor: pointer;
    user-select: none;
    color: #2a1b13;
    transition: color 0.28s ease, transform 0.28s ease, text-shadow 0.28s ease;
}

.nav-item + .nav-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 22%;
    width: 1px;
    height: 56%;
    background: linear-gradient(to bottom, rgba(141, 94, 58, 0), rgba(141, 94, 58, 0.5), rgba(141, 94, 58, 0));
}

.nav-item:hover {
    color: #8b2d1f;
    transform: translateY(-1px);
}

.nav-item.active {
    color: #8b2d1f;
    text-shadow: 0 2px 8px rgba(139, 45, 31, 0.22);
    transform: translateY(-1px);
}

.nav-label {
    font-family: 'NavFont', 'STKaiti', 'KaiTi', 'STSong', 'SimSun', serif;
    font-size: 33px;
    letter-spacing: 0.08em;
    line-height: 1;
    padding: 0 8px;
}

.nav-ink {
    position: absolute;
    bottom: 14px;
    width: 58%;
    max-width: 130px;
    height: 8px;
    border-radius: 999px;
    background:
        radial-gradient(circle at 22% 50%, rgba(189, 48, 36, 0.45), transparent 42%),
        radial-gradient(circle at 72% 52%, rgba(173, 37, 31, 0.62), rgba(129, 23, 19, 0.86));
    opacity: 0;
    transform: scaleX(0.2);
    transform-origin: center;
    transition: opacity 0.28s ease, transform 0.28s ease;
    pointer-events: none;
    filter: blur(0.2px);
}

.nav-item:hover .nav-ink,
.nav-item.active .nav-ink {
    opacity: 0.95;
    transform: scaleX(1);
}

@media (max-width: 1200px) {
    .nav-bar {
        padding: 0 clamp(10px, 2vw, 24px);
    }
}

@media (max-width: 860px) {
    .nav-bar {
        height: 64px;
        min-height: 64px;
        max-height: 64px;
    }

    .nav-item {
        min-width: 92px;
    }

    .nav-ink {
        bottom: 10px;
        height: 6px;
    }
}
</style>


