import { createRouter, createWebHashHistory } from 'vue-router'
import EntryView from '@/views/EntryView.vue'

const routes = [
    {
        path: '/',
        name: 'Entry',
        component: EntryView,
        meta: {
            hideNavbar: true,
            hideMusic: true
        }
    },
    {
        path: '/home',
        name: 'Home',
        component: () => import('@/views/HomeView.vue')
    },
    {
        path: '/feihua',
        name: 'Feihua',
        component: () => import('@/views/FeihuaView.vue')
    },
    {
        path: '/poetry-summary',
        name: 'PoetrySummary',
        component: () => import('@/views/PoetrySummaryView.vue')
    },
    {
        path: '/poet-summary',
        name: 'PoetSummary',
        component: () => import('@/views/PoetSummaryView.vue')
    },
    {
        path: '/poet-details',
        name: 'PoetDetails',
        component: () => import('@/views/PoetDetailsView.vue')
    },
    {
        path: '/building-map-demo',
        name: 'BuildingMapDemo',
        component: () => import('@/views/BuildingMapDemoView.vue'),
        meta: {
            hideNavbar: true,
            hideMusic: true
        }
    },
    {
        path: '/building-section-demo',
        name: 'BuildingSectionDemo',
        component: () => import('@/views/BuildingSectionDemoView.vue'),
        meta: {
            hideNavbar: true,
            hideMusic: true
        }
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/NotFoundView.vue')
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
    linkActiveClass: 'router-active'
})

export default router
