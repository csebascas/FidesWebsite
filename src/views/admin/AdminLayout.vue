<template>
  <div class="admin-layout">
    <button class="hamburger" @click="sidebarOpen = !sidebarOpen">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-top">
        <router-link to="/d/dashboard" class="wordmark">Fides</router-link>
        <button class="search-trigger" @click="searchOpen = true">
          <span class="search-trigger-text">Search...</span>
          <kbd class="search-trigger-kbd">&#8984;K</kbd>
        </button>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/d/dashboard" class="nav-item" @click="closeSidebar">Dashboard</router-link>
        <router-link to="/d/health" class="nav-item" @click="closeSidebar">Health</router-link>

        <div class="nav-divider"></div>
        <span class="nav-section">Content</span>

        <router-link to="/d/content/lessons" class="nav-item" @click="closeSidebar">Lessons</router-link>
        <router-link to="/d/content/articles" class="nav-item" @click="closeSidebar">Articles</router-link>
        <router-link to="/d/content/entries" class="nav-item" @click="closeSidebar">Entries</router-link>
        <router-link to="/d/content/saints" class="nav-item" @click="closeSidebar">Saints</router-link>
        <router-link to="/d/content/tracks" class="nav-item" @click="closeSidebar">Tracks</router-link>
        <router-link to="/d/content/pillars" class="nav-item" @click="closeSidebar">Pillars</router-link>

        <div class="nav-divider"></div>
        <span class="nav-section">Management</span>

        <router-link to="/d/downloads" class="nav-item" @click="closeSidebar">Downloads</router-link>
        <router-link to="/d/users" class="nav-item" @click="closeSidebar">Users</router-link>
        <router-link to="/d/feedback" class="nav-item" @click="closeSidebar">Feedback</router-link>
      </nav>

      <div class="sidebar-bottom">
        <span class="user-email">{{ userEmail }}</span>
        <button class="sign-out" @click="handleSignOut">Sign out</button>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import QuickSearch from '../../components/QuickSearch.vue'

const router = useRouter()
const userEmail = ref('')
const sidebarOpen = ref(false)
const searchOpen = ref(false)

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
  width: 220px;
  min-width: 220px;
  background: var(--surface);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
}

.sidebar-top {
  padding: 24px 16px 16px;
}

.wordmark {
  font-family: var(--serif);
  font-size: 18px;
  color: var(--gold);
  text-decoration: none;
  font-weight: 700;
}

.search-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--raised);
  cursor: pointer;
  transition: border-color 0.15s;
}
.search-trigger:hover { border-color: var(--text-3); }
.search-trigger-text { font-family: var(--sans); font-size: 12px; color: var(--text-3); }
.search-trigger-kbd {
  font-family: var(--sans); font-size: 10px; color: var(--text-3);
  background: var(--surface); padding: 2px 6px; border-radius: 3px;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  overflow-y: auto;
}

.nav-item {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-3);
  text-decoration: none;
  padding: 10px 16px;
  transition: color 0.15s;
  border-left: 2px solid transparent;
}

.nav-item:hover {
  color: var(--text-2);
}

.nav-item.router-link-active {
  color: var(--gold-light);
  border-left-color: var(--gold);
}

.nav-divider {
  height: 1px;
  background: var(--line);
  margin: 8px 16px;
}

.nav-section {
  font-family: var(--sans);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-3);
  padding: 8px 16px 4px;
}

.sidebar-bottom {
  padding: 16px;
  border-top: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-email {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sign-out {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  transition: color 0.15s;
}

.sign-out:hover {
  color: var(--streak);
}

.main-content {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
  margin-left: 220px;
}

.hamburger {
  display: none;
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 200;
  background: var(--surface);
  border: 1px solid var(--line);
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
    transition: transform 0.25s ease;
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
