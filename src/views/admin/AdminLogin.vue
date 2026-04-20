<template>
  <div class="login-page">
    <div class="login-card">
      <div class="logo-wrap">
        <div class="logo-circle">
          <span class="logo-letter">F</span>
        </div>
      </div>

      <!-- Gate: access code -->
      <form v-if="!gateUnlocked" @submit.prevent="checkGate" class="login-form">
        <div class="field">
          <label for="access-code">Access Code</label>
          <input
            id="access-code"
            v-model="accessCode"
            type="password"
            placeholder="Enter access code"
            autocomplete="off"
          />
        </div>
        <p v-if="gateError" class="error">Invalid access code</p>
        <button type="submit" class="btn-gold">Continue</button>
      </form>

      <!-- Login form (only after gate) -->
      <form v-else @submit.prevent="handleLogin" class="login-form">
        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="admin@joinfides.com"
            autocomplete="email"
          />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Password"
            autocomplete="current-password"
          />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" class="btn-gold" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const accessCode = ref('')
const gateUnlocked = ref(false)
const gateError = ref(false)
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function checkGate() {
  gateError.value = false
  try {
    const res = await fetch('/api/auth/gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: accessCode.value }),
    })
    if (res.ok) {
      gateUnlocked.value = true
    } else {
      gateError.value = true
    }
  } catch {
    gateError.value = true
  }
}

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    })

    if (res.ok) {
      router.push('/d/dashboard')
    } else {
      const data = await res.json().catch(() => ({}))
      error.value = data.error || 'Invalid credentials'
    }
  } catch {
    error.value = 'Network error. Please try again.'
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
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 40px 32px;
}

.logo-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
}

.logo-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid var(--gold);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-letter {
  font-family: var(--serif);
  font-size: 28px;
  color: var(--gold);
  font-weight: 700;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field input {
  font-family: var(--sans);
  font-size: 14px;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--raised);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}

.field input::placeholder {
  color: var(--text-3);
}

.field input:focus {
  border-color: var(--gold);
}

.error {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--streak);
  margin: 0;
}

.btn-gold {
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 600;
  padding: 12px 16px;
  border-radius: 6px;
  border: none;
  background: var(--gold);
  color: var(--bg);
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: 8px;
}

.btn-gold:hover {
  opacity: 0.9;
}

.btn-gold:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
