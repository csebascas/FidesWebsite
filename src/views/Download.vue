<script setup lang="ts">
import { onMounted, ref } from 'vue'

// iOS: https:// link on iOS Safari auto-opens the native App Store app
const IOS_URL = 'https://apps.apple.com/us/app/fides-catholic-apologetics/id6761725633'
// Android: intent:// opens the native Play Store app directly from Chrome.
// Chrome blocks market:// from web pages, so intent:// is required.
// S.browser_fallback_url handles devices without Google Play (Huawei, etc.)
const ANDROID_INTENT = 'intent://details?id=com.liaxo.fides#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.liaxo.fides;end'
const ANDROID_FALLBACK = 'https://play.google.com/store/apps/details?id=com.liaxo.fides'

const detected = ref<'ios' | 'android' | 'unknown'>('unknown')
const redirecting = ref(true)
let tracked = false

function detectPlatform(): 'ios' | 'android' | 'unknown' {
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod|macintosh/.test(ua) && 'ontouchend' in document) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'unknown'
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    referrer: document.referrer || params.get('ref') || null,
    utm_source: params.get('utm_source') || params.get('ref') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
  }
}

function trackClick(platform: 'ios' | 'android' | 'unknown') {
  if (tracked) return
  tracked = true

  const utm = getUtmParams()
  // Use sendBeacon so the request survives page navigation
  const payload = JSON.stringify({ platform, ...utm })
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' })
    navigator.sendBeacon('/api/downloads/track', blob)
  } else {
    fetch('/api/downloads/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  }
}

function openStore(platform: 'ios' | 'android') {
  if (platform === 'ios') {
    window.location.href = IOS_URL
  } else {
    // Try intent:// for native Play Store. If the browser doesn't support
    // intent:// (e.g. Firefox, Samsung Internet), fall back to https://.
    try {
      window.location.href = ANDROID_INTENT
    } catch {
      window.location.href = ANDROID_FALLBACK
    }
    // Safety net: if intent:// doesn't navigate away within 1.5s, go to web
    setTimeout(() => {
      if (!document.hidden) {
        window.location.href = ANDROID_FALLBACK
      }
    }, 1500)
  }
}

function redirect(platform: 'ios' | 'android' | 'unknown') {
  trackClick(platform)

  if (platform === 'ios' || platform === 'android') {
    openStore(platform)
  } else {
    redirecting.value = false
  }
}

onMounted(() => {
  detected.value = detectPlatform()
  redirect(detected.value)
})

function manualDownload(platform: 'ios' | 'android') {
  tracked = false // allow tracking for manual selection after fallback
  redirect(platform)
}
</script>

<template>
  <div class="download-page">
    <div class="download-card">
      <h1 class="wordmark">Fides</h1>

      <template v-if="redirecting">
        <p class="status">Redirecting to your app store...</p>
        <div class="spinner"></div>
      </template>

      <template v-else>
        <p class="status">Choose your platform</p>
        <div class="buttons">
          <button class="dl-btn dl-btn--ios" @click="manualDownload('ios')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Download for iOS
          </button>
          <button class="dl-btn dl-btn--android" @click="manualDownload('android')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 2.236l1.442-1.442a.552.552 0 00-.78-.78L16.6 1.6a6.42 6.42 0 00-4.6-1.6 6.42 6.42 0 00-4.6 1.6L5.815.014a.552.552 0 00-.78.78L6.477 2.236A6.36 6.36 0 004 7h16a6.36 6.36 0 00-2.477-4.764zM9 5a1 1 0 110-2 1 1 0 010 2zm6 0a1 1 0 110-2 1 1 0 010 2zM4 8v10a1 1 0 001 1h1v3.5a1.5 1.5 0 003 0V19h6v3.5a1.5 1.5 0 003 0V19h1a1 1 0 001-1V8H4zm-3 0a1.5 1.5 0 00-1.5 1.5v7a1.5 1.5 0 003 0v-7A1.5 1.5 0 001 8zm22 0a1.5 1.5 0 00-1.5 1.5v7a1.5 1.5 0 003 0v-7A1.5 1.5 0 0023 8z"/></svg>
            Download for Android
          </button>
        </div>
      </template>

      <p class="footer-text">Free to download. No credit card required.</p>
    </div>
  </div>
</template>

<style scoped>
.download-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg);
}

.download-card {
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.wordmark {
  font-family: var(--serif);
  font-size: 36px;
  font-weight: 700;
  color: var(--gold);
  margin-bottom: 32px;
}

.status {
  font-size: 16px;
  color: var(--text-2);
  margin-bottom: 24px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--line);
  border-top-color: var(--gold);
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 600;
  padding: 16px 32px;
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

.footer-text {
  margin-top: 32px;
  font-size: 13px;
  color: var(--text-3);
}
</style>
