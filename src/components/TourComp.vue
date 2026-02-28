<template>
    <div class="tour-person-txt">
        <canvas ref="liveCanvas" class="live-canvas"
            :style="{left: `${props.left}%`, bottom: `${props.bottom}%`}"></canvas>
        <div class="tour-content">
            <div class="txt-btn">
                <div v-html="props.content" style="text-align:justify;"></div>
                <el-button class="next-btn" type="warning" size="default" @click="nextStep">
                    {{ props.stepCount === currentIndex + 1 ? '完成' : '下一步' }}
                </el-button>
            </div>
        </div>
    </div>
</template>

<script setup lang='ts'>
// @ts-nocheck
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

window.PIXI = PIXI; // 为了pixi-live2d-display内部调用
let app; // 为了存储pixi实例
let model; // 为了存储live2d实例
const liveCanvas = ref();

const currentIndex = defineModel({ type: Number, default: 0 });
const props = defineProps({
    content: {
        type: String,
        required: true,
        default: 'content'
    },
    stepCount: {
        type: Number,
        required: true,
        default: 0
    },
    left: {
        type: Number,
        required: true,
        default: 0
    },
    bottom: {
        type: Number,
        required: true,
        default: 0
    }
})

const nextStep = () => {
    currentIndex.value = currentIndex.value + 1;
}

onMounted(async () => {
    app = new PIXI.Application({
        view: liveCanvas.value,
        autoStart: true,
        resizeTo: window,
        backgroundAlpha: 0,
    })

    const modelPath = `${import.meta.env.BASE_URL}live2d/model/poet.model3.json`;
    model = await Live2DModel.from(modelPath);
    app.stage.addChild(model);

    model.scale.set(0.2);
})

onUnmounted(() => {
    model?.destroy();
    app?.destroy();
});
</script>

<style scope lang="scss">
.tour-person-txt {
    width: 100%;
    height: 100%;
    z-index: 4000;
}

.live-canvas {
    position: absolute;
    z-index: 3000;
    width: 680px;
    height: 320px;
}

.tour-content {
    position: relative;
    top: 35%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    .txt-btn {
        width: 46%;
        font-family: 'ContentFont';
        border-radius: 16px;
        background-color: #eee9dedf;
        padding: 16px;
        z-index: 4500;
        font-size: 22px;

        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: space-between;

        div {
            width: 100%;

            p{
                margin-bottom: 8px;
                margin-top: 8px;
                text-indent: 2em;
            }
        }

        .next-btn {
            width: 20%;
            z-index: 10000;
            font-family: 'ContentFont';
            font-size: 18px;
            border-radius: 8px;
            background-color: #d7ab82;

            &:hover {
                background-color: #cc7e63;
            }
        }
    }
}
</style>