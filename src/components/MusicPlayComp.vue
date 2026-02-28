<template>
    <div :class="[{ musicPlay: isPlaying }, 'music']" v-show="isMusic" @click="musicPlay">
        <!-- <svg class="icon" viewBox="0 0 1024 1024">
            <path
                d="M875.52 433.152q-7.168-1.024-12.8-10.24t-8.704-33.792q-5.12-39.936-26.112-58.88t-65.024-27.136q-46.08-9.216-81.408-37.376t-58.88-52.736q-22.528-21.504-34.816-15.36t-12.288 22.528l0 44.032 0 96.256q0 57.344-0.512 123.904t-0.512 125.952l0 104.448 0 58.368q1.024 24.576-7.68 54.784t-32.768 56.832-64 45.568-99.328 22.016q-60.416 3.072-109.056-21.504t-75.264-61.952-26.112-81.92 38.4-83.456 81.92-54.272 84.992-16.896 73.216 5.632 47.616 13.312l0-289.792q0-120.832 1.024-272.384 0-29.696 15.36-48.64t40.96-22.016q21.504-3.072 35.328 8.704t28.16 32.768 35.328 47.616 56.832 52.224q30.72 23.552 53.76 33.792t43.008 18.944 39.424 20.992 43.008 39.936q23.552 26.624 28.672 55.296t0.512 52.224-14.848 38.4-17.408 13.824z">
            </path>
        </svg> -->
        <img class="icon" src="../assets/images/music.png" alt="icon" />
        <audio ref="audioPlayer" id="audioPlayer" :src="musicUrl" controls="controls" autoplay loop="true" hidden="true"
            @play="handlePlay" @pause="handlePause"></audio>
    </div>
</template>
<script setup>
import { defineComponent, getCurrentInstance, ref, reactive, watch } from 'vue';

import musicUrl from '@/assets/music/bgm.mp3'

//使用vue的getCurrentInstance 方法获取当前组件实例
const { proxy } = getCurrentInstance()

let audioPlayer = ref(null) //音乐
let isPlaying = ref(false) //是否播放动画效果

//播放按钮
const musicPlay = () => {
    if (isPlaying.value) {
        audioPlayer.value.pause()
        isPlaying.value = false
    } else {
        audioPlayer.value.play()
        isPlaying.value = true
    }
}

//播放监听
const handlePlay = () => {
    isPlaying.value = true;
    localStorage.setItem('isPlaying', true)
}

//暂停监听
const handlePause = () => {
    isPlaying.value = false
    localStorage.setItem('isPlaying', false)
}

//通过路由地址判断音乐是否播放 图标是否显示
let isMusic = ref(false)
watch(() => proxy.$router.currentRoute.value.path, (newV, oldV) => {
    if (newV != '/') {
        isMusic.value = true
        if (localStorage.getItem('isPlaying')) {
            isPlaying.value = localStorage.getItem('isPlaying') == 'true' ? true : false
            if (isPlaying.value) audioPlayer.value.play()
        }
        else {
            isPlaying.value = true
            audioPlayer.value.play()
        }
    } else {
        isMusic.value = false
        isPlaying.value = false
        audioPlayer.value.pause()
    }
})
</script>
<style>
.music {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 4rem;
    position: fixed;
    right: 1rem;
    top: 4.5rem;
    z-index: 999;
    display: flex;
    align-items: center;
    background: #70756f2c;
    justify-content: center;
}

.musicPlay {
    animation: rotate 5s linear infinite;
}

.music .icon {
    width: 1.5rem;
    height: 1.5rem;
    fill: #c3db60;
}

.music audio {
    display: none;
}

@keyframes rotate {
    0% {
        transform: rotate(0deg)
    }

    100% {
        transform: rotate(360deg)
    }
}
</style>