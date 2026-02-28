import { createRouter, createWebHashHistory } from 'vue-router'
import EntryView from '@/views/EntryView.vue'

const routes = [
    {
        path: '/',
        name: 'Entry',
        component: EntryView
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
    // 无匹配页面则跳转到404
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/NotFoundView.vue')
    }
]

const router = createRouter(
    {
        history: createWebHashHistory(),
        routes: routes,
        // 在导航栏中，为当前活动路由的菜单项添加类名
        linkActiveClass: 'router-active'
    }
)

export default router