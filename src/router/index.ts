import { createRouter, createWebHashHistory } from 'vue-router'
import EntryView from '@/views/EntryView.vue'
import { buildingSections } from '@/const/buildingSections'

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
        path: '/building',
        component: () => import('@/views/BuildingLayoutView.vue'),
        meta: {
            hideNavbar: true,
            hideMusic: true
        },
        children: [
            {
                path: '',
                redirect: buildingSections[0].path
            },
            {
                path: 'map',
                name: 'BuildingMapDemo',
                component: () => import('@/views/BuildingMapDemoView.vue')
            },
            {
                path: 'atlas',
                name: 'BuildingSectionDemo',
                component: () => import('@/views/BuildingSectionDemoView.vue')
            },
            {
                path: 'matrix',
                name: 'BuildingDashboardDemo',
                component: () => import('@/views/BuildingDashboardDemoView.vue')
            },
            {
                path: 'portrait',
                name: 'BuildingPortraitDemo',
                component: () => import('@/views/BuildingPortraitDemoView.vue')
            },
            {
                path: 'qa',
                name: 'BuildingQaDemo',
                component: () => import('@/views/BuildingQaDemoView.vue')
            },
        ]
    },
    {
        path: '/building-map-demo',
        redirect: buildingSections.find((item) => item.key === 'map')?.path ?? '/building/map'
    },
    {
        path: '/building-section-demo',
        redirect: buildingSections.find((item) => item.key === 'atlas')?.path ?? '/building/atlas'
    },
    {
        path: '/building-dashboard-demo',
        redirect: buildingSections.find((item) => item.key === 'matrix')?.path ?? '/building/matrix'
    },
    {
        path: '/building-portrait-demo',
        redirect: buildingSections.find((item) => item.key === 'portrait')?.path ?? '/building/portrait'
    },
    {
        path: '/building-qa-demo',
        redirect: buildingSections.find((item) => item.key === 'qa')?.path ?? '/building/qa'
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
