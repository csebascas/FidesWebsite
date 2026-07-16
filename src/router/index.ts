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
  {
    path: '/download',
    component: () => import('../views/Download.vue'),
    meta: {
      title: 'Download Fides',
      description: 'Download the Fides app for iOS or Android. Learn the Catholic faith in 5 minutes a day.',
    },
  },
  {
    path: '/i/:code',
    component: () => import('../views/Invite.vue'),
    meta: {
      title: 'You\'ve been invited to Fides',
      description: 'A friend invited you to Fides. Sign up via this link and you both get 2 weeks of Pro free.',
    },
  },
  {
    path: '/d/login',
    component: () => import('../views/admin/AdminLogin.vue'),
    meta: {
      title: 'Admin Login — Fides',
    },
  },
  {
    path: '/d',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/d/dashboard',
      },
      {
        path: 'dashboard',
        component: () => import('../views/admin/AdminDashboard.vue'),
        meta: { title: 'Dashboard — Fides Admin', requiresAuth: true },
      },
      {
        path: 'revenue',
        component: () => import('../views/admin/AdminRevenue.vue'),
        meta: { title: 'Revenue — Fides Admin', requiresAuth: true },
      },
      {
        path: 'health',
        component: () => import('../views/admin/AdminHealth.vue'),
        meta: { title: 'System Health — Fides Admin', requiresAuth: true },
      },
      {
        path: 'reports',
        component: () => import('../views/admin/AdminReports.vue'),
        meta: { title: 'Weekly Report — Fides Admin', requiresAuth: true },
      },
      {
        path: 'creators',
        component: () => import('../views/admin/AdminCreators.vue'),
        meta: { title: 'Creators — Fides Admin', requiresAuth: true },
      },
      {
        path: 'content/:type',
        component: () => import('../views/admin/AdminContentList.vue'),
        meta: { title: 'Content — Fides Admin', requiresAuth: true },
      },
      {
        path: 'content/:type/:id',
        component: () => import('../views/admin/AdminContentEdit.vue'),
        meta: { title: 'Edit Content — Fides Admin', requiresAuth: true },
      },
      {
        path: 'downloads',
        component: () => import('../views/admin/AdminDownloads.vue'),
        meta: { title: 'Downloads — Fides Admin', requiresAuth: true },
      },
      {
        path: 'users',
        component: () => import('../views/admin/AdminUsers.vue'),
        meta: { title: 'Users — Fides Admin', requiresAuth: true },
      },
      {
        path: 'feedback',
        component: () => import('../views/admin/AdminFeedback.vue'),
        meta: { title: 'Feedback — Fides Admin', requiresAuth: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to, _from, next) => {
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        next()
      } else {
        next('/d/login')
      }
    } catch {
      next('/d/login')
    }
  } else {
    next()
  }
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
