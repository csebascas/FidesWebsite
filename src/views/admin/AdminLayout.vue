<template>
  <div class="admin-layout">
    <button class="hamburger" @click="sidebarOpen = !sidebarOpen">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <router-link to="/d/dashboard" class="wordmark">Fides<em>.</em></router-link>

      <nav class="sidebar-nav">
        <router-link v-for="item in NAV_TOP" :key="item.to" :to="item.to" class="nav-item" @click="closeSidebar">
          <svg class="icon" width="14" height="14" viewBox="0 0 14 14" v-html="item.icon"></svg>
          {{ item.label }}
        </router-link>

        <span class="nav-section">Revenue &amp; Partners</span>
        <router-link v-for="item in NAV_MONEY" :key="item.to" :to="item.to" class="nav-item" @click="closeSidebar">
          <svg class="icon" width="14" height="14" viewBox="0 0 14 14" v-html="item.icon"></svg>
          {{ item.label }}
        </router-link>

        <span class="nav-section">Content</span>
        <router-link v-for="item in NAV_CONTENT" :key="item.to" :to="item.to" class="nav-item" @click="closeSidebar">
          <svg class="icon" width="14" height="14" viewBox="0 0 14 14" v-html="item.icon"></svg>
          {{ item.label }}
        </router-link>

        <span class="nav-section">Operations</span>
        <router-link v-for="item in NAV_OPS" :key="item.to" :to="item.to" class="nav-item" @click="closeSidebar">
          <svg class="icon" width="14" height="14" viewBox="0 0 14 14" v-html="item.icon"></svg>
          {{ item.label }}
        </router-link>
      </nav>

      <button class="search-trigger" @click="searchOpen = true">
        <svg width="11" height="11" viewBox="0 0 11 11"><circle cx="4.8" cy="4.8" r="3.4" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="m7.4 7.4 2.3 2.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        <span class="search-trigger-text">Search</span>
        <kbd class="search-trigger-kbd">&#8984;K</kbd>
      </button>

      <div class="sidebar-who">
        <div class="avatar">{{ initial }}</div>
        <span class="user-email" :title="userEmail">{{ userEmail }}</span>
        <button class="sign-out" title="Sign out" @click="handleSignOut">
          <svg width="13" height="13" viewBox="0 0 13 13"><path d="M5 2H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2M8.5 9 11 6.5 8.5 4M10.7 6.5H5.2" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </aside>

    <div class="sidebar-overlay" v-if="sidebarOpen" @click="sidebarOpen = false"></div>

    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <QuickSearch v-model="searchOpen" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import QuickSearch from '../../components/QuickSearch.vue'

const STROKE = 'stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"'

const NAV_TOP = [
  { to: '/d/dashboard', label: 'Dashboard', icon: `<rect x="1.5" y="1.5" width="4.6" height="4.6" rx="1" ${STROKE} stroke-width="1.2"/><rect x="7.9" y="1.5" width="4.6" height="4.6" rx="1" ${STROKE} stroke-width="1.2"/><rect x="1.5" y="7.9" width="4.6" height="4.6" rx="1" ${STROKE} stroke-width="1.2"/><rect x="7.9" y="7.9" width="4.6" height="4.6" rx="1" ${STROKE} stroke-width="1.2"/>` },
  { to: '/d/growth', label: 'Growth', icon: `<path d="M2 11.5L5.5 7.5L8 9.5L12 4" ${STROKE} stroke-width="1.3"/><path d="M9 4h3v3" ${STROKE} stroke-width="1.3"/>` },
  { to: '/d/bible-path', label: 'Bible Path', icon: `<path d="M7 3.2C5.8 2.2 4 1.8 2 2v8c2 -0.2 3.8 0.2 5 1.2 1.2-1 3-1.4 5-1.2V2c-2 -0.2-3.8 0.2-5 1.2z" ${STROKE} stroke-width="1.1"/><path d="M7 3.2v8" ${STROKE} stroke-width="1.1"/>` },
]

const NAV_MONEY = [
  { to: '/d/revenue', label: 'Revenue', icon: `<path d="M7 1.5v11M9.8 3.6H5.7a1.9 1.9 0 1 0 0 3.8h2.6a1.9 1.9 0 1 1 0 3.8H3.9" ${STROKE} stroke-width="1.2"/>` },
  { to: '/d/referrals', label: 'Referrals', icon: `<path d="M4.2 4.6a2.3 2.3 0 1 1 4.6 0 2.3 2.3 0 1 1-4.6 0M2 11.6a4.4 4.4 0 0 1 8.8 0M9.8 6.2 12 4M10.4 3.4l-.6 2.8 2.8-.6" ${STROKE} stroke-width="1.1"/>` },
  { to: '/d/offers', label: 'Offers', icon: `<path d="M6.7 1.9H2.4a.5.5 0 0 0-.5.5v4.3a1 1 0 0 0 .3.7l4.6 4.6a1 1 0 0 0 1.4 0l4-4a1 1 0 0 0 0-1.4L7.4 2.2a1 1 0 0 0-.7-.3z" ${STROKE} stroke-width="1.1"/><circle cx="4.6" cy="4.6" r="0.8" ${STROKE} stroke-width="1"/>` },
  { to: '/d/creators', label: 'Creators', icon: `<circle cx="7" cy="4.4" r="2.3" ${STROKE} stroke-width="1.1"/><path d="M2.6 11.6a4.4 4.4 0 0 1 8.8 0" ${STROKE} stroke-width="1.1"/><path d="M11 2.2l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" ${STROKE} stroke-width="0.9"/>` },
  { to: '/d/creator-of-month', label: 'Creator of Month', icon: `<path d="M7 1.6l1.6 3.3 3.6.5-2.6 2.5.6 3.6L7 9.8 3.8 11.6l.6-3.6L1.8 5.4l3.6-.5z" ${STROKE} stroke-width="1.1"/>` },
]

const NAV_CONTENT = [
  { to: '/d/content/lessons', label: 'Lessons', icon: `<path d="M2 2.5h4a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 0 6 10H2V2.5zM12 2.5H8A1.5 1.5 0 0 0 6.5 4v7.5A1.5 1.5 0 0 1 8 10h4V2.5z" ${STROKE} stroke-width="1.1"/>` },
  { to: '/d/content/articles', label: 'Articles', icon: `<rect x="2" y="1.8" width="10" height="10.4" rx="1.2" ${STROKE} stroke-width="1.1"/><path d="M4.3 4.5h5.4M4.3 7h5.4M4.3 9.5h3.2" ${STROKE} stroke-width="1.1"/>` },
  { to: '/d/content/entries', label: 'Entries', icon: `<path d="M2 3.5h10M2 7h10M2 10.5h6.5" ${STROKE} stroke-width="1.2"/>` },
  { to: '/d/content/saints', label: 'Saints', icon: `<circle cx="7" cy="8.4" r="3.1" ${STROKE} stroke-width="1.1"/><path d="M3.6 3.2a5.4 5.4 0 0 1 6.8 0" ${STROKE} stroke-width="1.1"/>` },
  { to: '/d/content/tracks', label: 'Tracks', icon: `<circle cx="3.2" cy="3.2" r="1.6" ${STROKE} stroke-width="1.1"/><circle cx="10.8" cy="10.8" r="1.6" ${STROKE} stroke-width="1.1"/><path d="M4.4 4.4c2.2 2.2 3 3 6.4 3.2M4 10.8h4.2" ${STROKE} stroke-width="1.1"/>` },
  { to: '/d/content/pillars', label: 'Pillars', icon: `<path d="M2.5 12V5.5M7 12V5.5M11.5 12V5.5M1.5 12.5h11M1.8 5l5.2-3 5.2 3z" ${STROKE} stroke-width="1.1"/>` },
  { to: '/d/visio', label: 'Visio Rooms', icon: `<rect x="1.8" y="2.4" width="10.4" height="9.2" rx="1" ${STROKE} stroke-width="1.1"/><circle cx="5" cy="6" r="1.3" ${STROKE} stroke-width="1.1"/><path d="M2.2 10.4 5.4 7.6l2 1.8 2.3-2.6 2 2.2" ${STROKE} stroke-width="1.1"/>` },
]

const NAV_OPS = [
  { to: '/d/users', label: 'Users', icon: `<circle cx="7" cy="4.6" r="2.4" ${STROKE} stroke-width="1.1"/><path d="M2.4 12a4.8 4.8 0 0 1 9.2 0" ${STROKE} stroke-width="1.1"/>` },
  { to: '/d/feedback', label: 'Feedback', icon: `<path d="M2 3.4C2 2.6 2.6 2 3.4 2h7.2c.8 0 1.4.6 1.4 1.4v4.8c0 .8-.6 1.4-1.4 1.4H6.5l-2.8 2.6V9.6H3.4C2.6 9.6 2 9 2 8.2V3.4z" ${STROKE} stroke-width="1.1"/>` },
  { to: '/d/downloads', label: 'Downloads', icon: `<path d="M7 1.8v7M4.2 6.2 7 9l2.8-2.8M2.2 11.6h9.6" ${STROKE} stroke-width="1.2"/>` },
  { to: '/d/health', label: 'Health', icon: `<path d="M1.5 7h2.5l1.5-3.5L8 10.5 9.5 7h3" ${STROKE} stroke-width="1.2"/>` },
  { to: '/d/reports', label: 'Reports', icon: `<path d="M2.5 11.5V8M7 11.5V5M11.5 11.5V2.5" ${STROKE} stroke-width="1.3"/>` },
]

const router = useRouter()
const userEmail = ref('')
const sidebarOpen = ref(false)
const searchOpen = ref(false)

const initial = computed(() => (userEmail.value[0] || '·').toUpperCase())

function closeSidebar() {
  sidebarOpen.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchOpen.value = !searchOpen.value
  }
}

async function handleSignOut() {
  await fetch('/api/auth/logout', { method: 'POST' })
  router.push('/d/login')
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  try {
    const res = await fetch('/api/auth/me')
    if (res.ok) {
      const data = await res.json()
      userEmail.value = data.email || ''
    }
  } catch {
    // ignore
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

.sidebar {
  width: 200px;
  min-width: 200px;
  background: var(--bg);
  border-right: 0.5px solid var(--line);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  padding: 20px 0 14px;
}

.wordmark {
  font-family: var(--serif);
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  text-decoration: none;
  padding: 0 18px;
  margin-bottom: 20px;
}

.wordmark em {
  font-style: normal;
  color: var(--gold-light);
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--sans);
  font-size: 12.5px;
  color: var(--text-2);
  text-decoration: none;
  padding: 8px 18px;
  position: relative;
  transition: color 0.15s ease;
}

.nav-item .icon {
  flex-shrink: 0;
  opacity: 0.75;
  transition: opacity 0.15s ease;
}

.nav-item:hover { color: var(--text); }

.nav-item.router-link-active {
  color: var(--gold-light);
}

.nav-item.router-link-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--gold);
}

.nav-item.router-link-active .icon { opacity: 1; }

.nav-section {
  font-family: var(--sans);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.8px;
  color: var(--text-3);
  padding: 18px 18px 6px;
}

.search-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 12px;
  padding: 8px 10px;
  border-radius: 6px;
  border: none;
  background: var(--surface);
  color: var(--text-3);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.search-trigger:hover { background: var(--raised); color: var(--text-2); }
.search-trigger-text { font-family: var(--sans); font-size: 11.5px; flex: 1; text-align: left; }
.search-trigger-kbd {
  font-family: var(--sans);
  font-size: 9.5px;
  color: var(--text-2);
  background: var(--raised);
  padding: 2px 6px;
  border-radius: 4px;
}

.sidebar-who {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 12px;
  padding: 10px 6px 0;
  border-top: 0.5px solid var(--line);
}

.avatar {
  width: 26px;
  height: 26px;
  border-radius: 13px;
  background: rgba(196, 145, 44, 0.08);
  color: var(--gold-light);
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-email {
  flex: 1;
  min-width: 0;
  font-family: var(--sans);
  font-size: 10.5px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sign-out {
  background: none;
  border: none;
  padding: 4px;
  color: var(--text-3);
  cursor: pointer;
  display: flex;
  transition: color 0.15s ease;
}

.sign-out:hover { color: var(--streak); }

.main-content {
  flex: 1;
  padding: 28px 36px;
  overflow-y: auto;
  margin-left: 200px;
}

.hamburger {
  display: none;
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 200;
  background: var(--surface);
  border: none;
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  flex-direction: column;
  gap: 4px;
}

.hamburger span {
  display: block;
  width: 18px;
  height: 2px;
  background: var(--text-2);
  border-radius: 1px;
}

.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .hamburger {
    display: flex;
  }

  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    background: var(--bg);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 99;
  }

  .main-content {
    margin-left: 0;
    padding: 24px 20px;
    padding-top: 60px;
  }
}
</style>
