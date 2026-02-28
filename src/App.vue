<template>
  <div class="app-container">
    <div class="global-bg"></div>
    <MusicPlayComp/>
    <NavbarComp v-if="!isEntry" />
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
  width: 100vw;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
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
import NavbarComp from './components/NavbarComp.vue';
import router from './router'
import { ref, watch } from 'vue';

const isEntry = ref(false);

watch(() => router.currentRoute.value.path, (newRoute) => {
  isEntry.value = newRoute === '/';
}, {
  immediate: true
})
</script>
