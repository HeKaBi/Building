<template>
    <div class="home-container">
        <div class="entry-bg"></div>
        <div class="content-wrapper">
            <div class="arrow-container" @click="navigateToHome">
                <div class="arrow">></div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const navigateToHome = () => {
    const content = document.querySelector('.content-wrapper') as HTMLElement | null
    const entryBg = document.querySelector('.entry-bg') as HTMLElement | null // 获取背景元素
    
    if (content && entryBg) {
        content.style.transform = 'translateY(-10vh)'
        entryBg.style.opacity = '0'  // 透明度从 1 变为 0
        
        setTimeout(() => {
            router.push('/home')
        }, 800)
    }
}
</script>

<style scoped lang="scss">
.home-container {
    position: relative;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
}

.content-wrapper {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    transition: transform 1s ease-in-out;
}

.title-container {
    text-align: center;
    margin-bottom: 2rem;
}

.intro-container {
    width: 80%;
    max-width: 800px;
    margin-bottom: 1rem;
    text-align: justify;
    font-family: 'ContentFont', serif;
    font-size: 25px;
    line-height: 30px;
    cursor: pointer;
}

.title {
    font-family: 'TitleFont';
    font-size: 4rem;
    color: #333;
    text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.5);
}

.arrow-container {
    position: absolute;
    bottom: 2rem;
    cursor: pointer;
}

.arrow {
    font-size: 3rem;
    color: #666;
    transform: rotate(90deg);
    animation: bounce 2s infinite;
    cursor: pointer;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
}

.arrow:hover {
    color: #333;
    transform: rotate(90deg) scale(1.1);
}

@keyframes bounce {

    0%,
    20%,
    50%,
    80%,
    100% {
        transform: rotate(90deg) translateX(0);
    }

    40% {
        transform: rotate(90deg) translateX(-20px);
    }

    60% {
        transform: rotate(90deg) translateX(-10px);
    }
}
</style>
