import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const routes = [
  {
    path: '/',
    component: Home,
    meta: {
      title: 'Fides — The Duolingo of Catholicism',
      description: 'Learn the Catholic faith in 5 minutes a day. 200+ lessons across 7 pillars of Catholic theology.',
    },
  },
  {
    path: '/privacy',
    component: () => import('../views/Privacy.vue'),
    meta: {
      title: 'Privacy Policy — Fides',
      description: 'How Fides collects, uses, and protects your personal information. Read our full privacy policy.',
    },
  },
  {
    path: '/terms',
    component: () => import('../views/Terms.vue'),
    meta: {
      title: 'Terms of Service — Fides',
      description: 'Terms and conditions for using the Fides Catholic education app.',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const title = (to.meta.title as string) || 'Fides — The Duolingo of Catholicism'
  const description = (to.meta.description as string) || 'Learn the Catholic faith in 5 minutes a day.'

  document.title = title

  const metaDesc = document.querySelector('meta[name="description"]')
  if (metaDesc) metaDesc.setAttribute('content', description)

  const ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle) ogTitle.setAttribute('content', title)

  const ogDesc = document.querySelector('meta[property="og:description"]')
  if (ogDesc) ogDesc.setAttribute('content', description)

  const ogUrl = document.querySelector('meta[property="og:url"]')
  if (ogUrl) ogUrl.setAttribute('content', `https://joinfides.com${to.path}`)

  const canonical = document.querySelector('link[rel="canonical"]')
  if (canonical) canonical.setAttribute('href', `https://joinfides.com${to.path}`)
})

export default router
