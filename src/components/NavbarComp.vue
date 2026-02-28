<template>
    <nav class="nav-bar" style="height: 70px;">
        <div class="nav-item" v-for="(item, index) in navItems" :key="index" :class="{ active: currentIndex === index }"
            @click="handleClick(index)">
            <div>{{ item.title }}</div>
        </div>
    </nav>
</template>

<script setup lang='ts'>
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
    router.push(navItems[index].link);
};

watch(() => router.currentRoute.value.path, (newPath) => {
    const index = navItems.findIndex((item) => item.link === newPath);
    if (index !== -1) {
        currentIndex.value = index;
    }
}, {
    immediate: true
})
</script>

<style scoped lang="scss">
.nav-bar {
    width: 100vw !important;
    margin: 0;
    height: 70px;
    min-height: 70px;
    max-height: 70px;
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    box-sizing: border-box;
    position: relative;
    z-index: 1;
    background-color: rgba(185, 184, 182, 0.735) !important;
    margin-bottom: 4px;
    flex-shrink: 0; /* 防止flex容器压缩高度 */
}

.nav-item {
    text-align: center;
    font-family: '华文行楷', sans-serif;
    font-size: 33px;
    padding: 4px;
    user-select: none;
    cursor: pointer;
    transition: color 0.3s ease, transform 0.3s ease; // 添加平滑过渡效果
    position: relative;
    transform: scale(1); // 初始缩放比例

    &:hover {
        color: #a9304c;
        transform: scale(1.1); // 鼠标悬停时稍微放大
    }

    &::before {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: #a9304c;
        border-radius: 2px;
        transform: scaleX(0); // 初始状态下缩放为0
        transition: transform 0.3s ease; // 添加平滑过渡效果
        transform-origin: left;
    }

    &.active {
        color: #a9304c;
        transform: scale(1.1); // 当前选中时稍微放大

        &::before {
            transform: scaleX(1); // 选中时拉伸到100%
        }
    }
}
</style>
