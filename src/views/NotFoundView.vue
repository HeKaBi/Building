<template>
    <div class="not-found-container">
        <div class="content">
            <h1 class="title">404</h1>
            <p class="message">寻寻觅觅，冷冷清清</p>
            <p class="sub-message">此页面虽未寻得，但诗韵永存，邀您共赏</p>
            <p class="poem">
                欲寻此路无踪迹，<br>
                空留明月照青苔。<br>
                不如归去赏诗韵，<br>
                唐宋元曲入梦来。
            </p>
            <button class="back-btn" @click="goHome">返回首页</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
    router.push('/')
}
</script>

<style scoped lang="scss">
.not-found-container {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.content {
    text-align: center;
    color: #333;
}

.title {
    font-size: 6rem;
    margin: 0;
    color: #1890ff;
}

.message {
    font-size: 2rem;
    margin: 1rem 0;
    color: #333;
    font-family: 'STKaiti', serif;
}

.sub-message {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    color: #666;
}

.poem {
    font-size: 1.1rem;
    margin: 1.5rem 0;
    color: #444;
    line-height: 1.8;
    font-family: 'STKaiti', serif;
}

.back-btn {
    padding: 0.8rem 2rem;
    font-size: 1rem;
    color: #1890ff;
    background-color: transparent;
    border: 2px solid #1890ff;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
        background-color: rgba(24, 144, 255, 0.1);
    }
}
</style>
