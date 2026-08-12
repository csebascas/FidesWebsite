<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

// ── Store links (same constants as Download.vue) ──────────────────────────
const IOS_URL = 'https://apps.apple.com/us/app/fides-catholic-faith/id6761725633'
const ANDROID_INTENT = 'intent://details?id=com.liaxo.fides#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.liaxo.fides;end'
const ANDROID_FALLBACK = 'https://play.google.com/store/apps/details?id=com.liaxo.fides'

const route = useRoute()
const code = computed(() => String(route.params.code || '').toUpperCase().trim())

const inviterName = ref<string | null>(null)
const inviterAvatar = ref<string | null>(null)
const notFound = ref(false)
const loading = ref(true)

function detectPlatform(): 'ios' | 'android' | 'unknown' {
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod|macintosh/.test(ua) && 'ontouchend' in document) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'unknown'
}

const platform = ref<'ios' | 'android' | 'unknown'>('unknown')

async function loadInviter() {
  // Codes are variable length (friend = 6, creator codes can be longer).
  if (!code.value || code.value.length < 3 || code.value.length > 32) {
    notFound.value = true
    loading.value = false
    return
  }
  try {
    const res = await fetch(`/api/invite/${encodeURIComponent(code.value)}`)
    if (!res.ok) {
      notFound.value = true
    } else {
      const data = await res.json() as {
        inviter_name: string | null
        inviter_avatar_url: string | null
      }
      inviterName.value = data.inviter_name
      inviterAvatar.value = data.inviter_avatar_url
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

async function copyCodeToClipboard() {
  // Deferred deep linking: a Universal Link only opens the app if it's
  // already installed. For a brand-new user, the OS can only redirect to
  // the store, and nothing hands this URL back to the app after install.
  // Writing the code to the visitor's own clipboard here lets the app read
  // it back on first launch (see parseInviteCodeFromClipboard in the app
  // repo). Requires a user-gesture context, which the download button click
  // provides.
  try {
    await navigator.clipboard.writeText(code.value)
  } catch {
    /* no-op — best-effort; app falls back to manual code entry */
  }
}

function downloadAndStashCode() {
  // Persist the code via three mechanisms so the app picks it up post-install:
  //   1. localStorage — read by the website if user returns here after install.
  //   2. Clipboard — read by the app on first launch (deferred deep link).
  //   3. Append `?code=<X>` to the store URL → some attribution providers carry
  //      it through (App Store Connect campaign tokens, Play Console install
  //      referrer). When the universal link works (iOS / Android intent), the
  //      OS opens the app directly with the full URL path including /i/<code>.
  try { localStorage.setItem('fides_invite_code', code.value) } catch { /* no-op */ }
  void copyCodeToClipboard()

  if (platform.value === 'ios') {
    window.location.href = IOS_URL
  } else if (platform.value === 'android') {
    try {
      window.location.href = ANDROID_INTENT
    } catch {
      window.location.href = ANDROID_FALLBACK
    }
    setTimeout(() => {
      if (!document.hidden) {
        window.location.href = ANDROID_FALLBACK
      }
    }, 1500)
  } else {
    // Desktop: show both options visually
  }
}

function downloadIOS() { platform.value = 'ios'; downloadAndStashCode() }
function downloadAndroid() { platform.value = 'android'; downloadAndStashCode() }

const headline = computed(() => {
  if (notFound.value) return 'Invite link not found'
  if (!inviterName.value) return 'Join Fides'
  return `${inviterName.value.split(' ')[0]} invited you to Fides`
})

const sub = computed(() => {
  if (notFound.value) return 'The link may be expired or mistyped.'
  return 'The Catholic learning app. Daily theology, prayer, and faith formation in 5 minutes a day.'
})

const rewardLine = computed(() => {
  if (notFound.value || !inviterName.value) return null
  const first = inviterName.value.split(' ')[0]
  return `Sign up with this link and you'll get 2 weeks of Pro, free — courtesy of ${first}.`
})

onMounted(() => {
  platform.value = detectPlatform()
  void loadInviter()
})
</script>

<template>
  <div class="invite-page">
    <div class="invite-card">
      <h1 class="wordmark">Fides</h1>

      <template v-if="loading">
        <div class="spinner" />
      </template>

      <template v-else>
        <div v-if="!notFound && inviterAvatar" class="avatar">
          <img :src="inviterAvatar" alt="" />
        </div>
        <div v-else-if="!notFound" class="avatar avatar--initial">
          <span>{{ (inviterName?.charAt(0) ?? 'F').toUpperCase() }}</span>
        </div>

        <h2 class="headline">{{ headline }}</h2>
        <p class="sub">{{ sub }}</p>

        <div v-if="!notFound" class="buttons">
          <button class="dl-btn dl-btn--ios" @click="downloadIOS">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Download for iOS
          </button>
          <button class="dl-btn dl-btn--android" @click="downloadAndroid">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 2.236l1.442-1.442a.552.552 0 00-.78-.78L16.6 1.6a6.42 6.42 0 00-4.6-1.6 6.42 6.42 0 00-4.6 1.6L5.815.014a.552.552 0 00-.78.78L6.477 2.236A6.36 6.36 0 004 7h16a6.36 6.36 0 00-2.477-4.764zM9 5a1 1 0 110-2 1 1 0 010 2zm6 0a1 1 0 110-2 1 1 0 010 2zM4 8v10a1 1 0 001 1h1v3.5a1.5 1.5 0 003 0V19h6v3.5a1.5 1.5 0 003 0V19h1a1 1 0 001-1V8H4zm-3 0a1.5 1.5 0 00-1.5 1.5v7a1.5 1.5 0 003 0v-7A1.5 1.5 0 001 8zm22 0a1.5 1.5 0 00-1.5 1.5v7a1.5 1.5 0 003 0v-7A1.5 1.5 0 0023 8z"/></svg>
            Download for Android
          </button>
        </div>

        <div v-if="!notFound" class="reward-card">
          <div class="reward-eyebrow">REFERRAL REWARD</div>
          <p class="reward-line">{{ rewardLine }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.invite-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg);
}

.invite-card {
  text-align: center;
  max-width: 420px;
  width: 100%;
}

.wordmark {
  font-family: var(--serif);
  font-size: 32px;
  font-weight: 700;
  color: var(--gold);
  margin-bottom: 28px;
  letter-spacing: -0.5px;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin: 0 auto 18px;
  overflow: hidden;
  background: var(--raised);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar--initial span {
  font-family: var(--serif);
  font-size: 28px;
  color: var(--gold);
}

.headline {
  font-family: var(--serif);
  font-weight: 400;
  font-size: 26px;
  line-height: 1.2;
  color: var(--text);
  margin: 0 0 10px;
  letter-spacing: -0.3px;
}

.sub {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
  margin: 0 0 28px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--line);
  border-top-color: var(--gold);
  border-radius: 50%;
  margin: 40px auto;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 22px;
}

.dl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 600;
  padding: 14px 28px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}
.dl-btn:hover { opacity: 0.88; }
.dl-btn--ios {
  background: var(--gold);
  color: var(--bg);
}
.dl-btn--android {
  background: var(--raised);
  color: var(--text);
  border: 1px solid var(--line);
}

.reward-card {
  margin-top: 18px;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
  background: color-mix(in srgb, var(--gold) 8%, transparent);
}
.reward-eyebrow {
  font-family: var(--sans);
  font-weight: 500;
  font-size: 10px;
  letter-spacing: 1.8px;
  color: var(--gold);
  margin-bottom: 6px;
}
.reward-line {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
  margin: 0;
}
</style>
