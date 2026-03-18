<template>
    <div class="building-layout">
        <BuildingFloatingNav />
        <router-view />
    </div>
</template>

<script setup lang="ts">
import BuildingFloatingNav from '@/components/BuildingFloatingNav.vue';
</script>

<style scoped>
.building-layout {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>
