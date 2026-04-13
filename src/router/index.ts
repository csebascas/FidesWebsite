import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/privacy', component: () => import('../views/Privacy.vue') },
    { path: '/terms', component: () => import('../views/Terms.vue') },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
