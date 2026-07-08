<template>
  <div class="login-page">
    <div class="login-glow"></div>
    <form class="login-box" :class="{ shake: shaking }" @submit.prevent="handleLogin">
      <h1 class="wordmark">Fides</h1>

      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model="email" type="email" autocomplete="email" spellcheck="false" />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" />
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" class="btn-gold" :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>

      <p class="foot">Access limited to authorized admins.<br>Stays signed in for 30 days on this device.</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const shaking = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), password: password.value }),
    })
    if (res.ok) {
      router.push('/d/dashboard')
      return
    }
    const data = await res.json().catch(() => ({}))
    error.value = data.error || 'Invalid credentials'
    shaking.value = true
    setTimeout(() => (shaking.value = false), 320)
  } catch {
    error.value = 'Network error — try again'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  position: relative;
  overflow: hidden;
}

.login-glow {
  position: absolute;
  top: 12vh;
  left: 50%;
  transform: translateX(-50%);
  width: 420px;
  height: 300px;
  background: radial-gradient(closest-side, rgba(196, 145, 44, 0.10), transparent);
  pointer-events: none;
}

.login-box {
  width: 320px;
  position: relative;
  animation: rise 0.2s ease-out;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.login-box.shake {
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

.wordmark {
  font-family: var(--serif);
  font-size: 32px;
  font-weight: 700;
  color: var(--text);
  text-align: center;
  margin: 0 0 26px;
}

.field label {
  display: block;
  font-family: var(--sans);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 6px;
}

.field input {
  width: 100%;
  background: var(--raised);
  border: none;
  outline: none;
  border-radius: 6px;
  padding: 12px 14px;
  font-family: var(--sans);
  font-size: 13.5px;
  color: var(--text);
  margin-bottom: 14px;
  transition: box-shadow 0.15s ease;
}

.field input:focus {
  box-shadow: 0 0 0 1px var(--gold);
}

.error {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--streak);
  margin: -4px 0 10px;
}

.btn-gold {
  width: 100%;
  background: var(--gold);
  color: #0c0c0c;
  border: none;
  border-radius: 6px;
  padding: 13px;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 4px;
  transition: transform 0.12s ease, opacity 0.15s ease;
}

.btn-gold:active { transform: scale(0.97); }
.btn-gold:disabled { opacity: 0.6; cursor: default; }

.foot {
  font-family: var(--sans);
  font-size: 10.5px;
  color: var(--text-3);
  text-align: center;
  margin-top: 14px;
  line-height: 1.6;
}
</style>
