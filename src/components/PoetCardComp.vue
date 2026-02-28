<template>
    <div class="avatar-info">
        <img :src="props.avatar.length === 0 ? 'https://pic.rmb.bdstatic.com/bjh/240509/7f39f3e985978e480382b1f80f438e149853.jpeg' : props.avatar" alt="avatar">
        <div class="info">
            <div class="name"><strong>姓名：</strong>{{ props.name }}</div>
            <div class="gender"><strong>性别：</strong>{{ props.gender }}</div>
            <div class="dynasty"><strong>朝代：</strong>{{ props.dynasty }}</div>
            <div class="address"><strong>籍贯：</strong>{{ props.address }}</div>
            <div class="year"><strong>生卒年：</strong>{{ props.YearBirth + "年 - " + props.YearDeath + "年" }}</div>
            <div class="desc"><strong>简介：</strong>{{ props.desc }}</div>
        </div>
    </div>
</template>

<script setup lang='ts'>
// @ts-nocheck
import { onMounted, nextTick, watch } from 'vue'

const props = defineProps({
    avatar: {
        type: String,
        required: true,
        default: 'https://pic.rmb.bdstatic.com/bjh/240509/7f39f3e985978e480382b1f80f438e149853.jpeg'
    },
    name: {
        type: String,
        required: true,
        default: '佚名'
    },
    gender: {
        type: String,
        required: true,
        default: '不详'
    },
    address: {
        type: String,
        required: true,
        default: '不详'
    },
    YearBirth: {
        type: String,
        required: true,
        default: "0"
    },
    YearDeath: {
        type: String,
        required: true,
        default: "0"
    },
    desc: {
        type: String,
        required: true,
        default: ""
    },
    dynasty: {
        type: String,
        required: true,
        default: "" 
    }
})

watch(() => props.name, () => {
    nextTick(() => {
        const img = document.querySelector('.avatar-info img') as HTMLImageElement;
        img.src = props.avatar.length === 0 ? 'https://pic.rmb.bdstatic.com/bjh/240509/7f39f3e985978e480382b1f80f438e149853.jpeg' : props.avatar;
    })
})
</script>

<style scope lang="scss">
.avatar-info {
    width: 95%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    height: 35vh;

    img {
        width: auto;
        height: 25vh;
        border-radius: 50%;
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
        cursor: pointer;
    }

    .info {
        margin-left: 32px;
        font-size: 22px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 8px;
        font-family: 'ContentFont';
    }
}
</style>