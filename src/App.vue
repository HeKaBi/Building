<template>
  <div class="app-container">
    <div class="global-bg"></div>
    <div class="global-overlay"></div>
    <MusicPlayComp v-if="!hideMusic" />
    <NavbarComp v-if="!hideNavbar" />
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style scoped>
.app-container {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';

import NavbarComp from './components/NavbarComp.vue';
import router from './router';

const hideNavbar = computed(() => Boolean(router.currentRoute.value.meta.hideNavbar));
const hideMusic = computed(() => Boolean(router.currentRoute.value.meta.hideMusic));
</script>
