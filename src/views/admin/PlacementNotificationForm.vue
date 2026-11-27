<template>
  <section class="campaign">
    <h2>Placement notification</h2>
    <form @submit.prevent="submit" @input="resetPreview">
      <fieldset :disabled="busy">
        <label>
          Superwall placement
          <input v-model.trim="placement" required maxlength="120" />
        </label>
        <label>
          Audience
          <select v-model="audience" @change="resetPreview">
            <option value="specific">Specific users</option>
            <option value="never_subscribed">Never subscribed</option>
            <option value="inactive">Inactive subscribers</option>
            <option value="active">Active Pro users</option>
          </select>
        </label>
        <label v-if="audience === 'specific'">
          User IDs
          <textarea v-model.trim="userIds" required rows="2" placeholder="One UUID per line, or comma-separated" />
        </label>
        <label>
          Notification title
          <input v-model.trim="title" required maxlength="100" />
        </label>
        <label>
          Notification body
          <textarea v-model.trim="body" required maxlength="300" rows="3" />
        </label>
        <button type="submit" :disabled="eligible === 0">
          {{ busy ? 'Working…' : eligible === null ? 'Preview audience' : `Queue for ${eligible} users` }}
        </button>
      </fieldset>
      <p role="status">{{ message }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const placement = ref('')
const audience = ref('specific')
const userIds = ref('')
const title = ref('')
const body = ref('')
const busy = ref(false)
const eligible = ref<number | null>(null)
const message = ref('')
let campaignId = crypto.randomUUID()

function resetPreview() {
  eligible.value = null
  message.value = ''
  campaignId = crypto.randomUUID()
}

async function submit() {
  if (busy.value || eligible.value === 0) return
  const preview = eligible.value === null
  busy.value = true
  message.value = ''
  try {
    const res = await fetch('/api/admin/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: preview ? 'preview_placement_notification' : 'queue_placement_notification',
        id: campaignId,
        userIds: audience.value === 'specific' ? userIds.value.split(/[\s,]+/).filter(Boolean) : [],
        data: { placement: placement.value, audience: audience.value, title: title.value, body: body.value, expectedCount: eligible.value },
      }),
    })
    const result = await res.json()
    if (!res.ok) {
      if (res.status === 400) eligible.value = null
      message.value = result.error || 'Could not process the campaign.'
      return
    }
    if (preview) {
      eligible.value = result.count
      message.value = result.count ? `${result.count} users can receive this notification.` : 'No eligible users.'
      return
    }
    title.value = ''
    body.value = ''
    resetPreview()
    message.value = `Queued for ${result.count} users. Find this send under By offer using ${result.offerKey}.`
  } catch {
    message.value = 'Could not reach the server. Try again.'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.campaign { background: var(--surface); padding: 18px; border-radius: 10px; margin-bottom: 24px; }
h2 { margin: 0 0 14px; font: 700 18px var(--serif); }
fieldset { display: grid; gap: 12px; border: 0; margin: 0; padding: 0; min-width: 0; }
label { display: grid; gap: 5px; font-size: 13px; }
input, select, textarea {
  width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 6px;
  border: 1px solid var(--line); background: var(--bg); color: var(--text); font: inherit;
}
button { justify-self: start; border: 0; border-radius: 6px; padding: 8px 14px; background: var(--gold-light); color: #0c0c0c; font: inherit; cursor: pointer; }
button:disabled, fieldset:disabled { opacity: .65; }
p { margin: 10px 0 0; color: var(--text-2); font-size: 13px; overflow-wrap: anywhere; }
p:empty { display: none; }
</style>
