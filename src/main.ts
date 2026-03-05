import { createApp } from 'vue'
import App from './App.vue'

import './style/global.scss'
import router from './router'
import store from './store'
import { waitForChartFonts } from './utils/chartFonts'

const app = createApp(App).use(router).use(store)

waitForChartFonts().finally(() => {
  app.mount('#app')
})