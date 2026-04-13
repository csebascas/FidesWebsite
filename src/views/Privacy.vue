<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav>
    <RouterLink to="/" class="nav-wordmark">Fides</RouterLink>
    <RouterLink to="/" class="nav-back">Back</RouterLink>
  </nav>

  <article class="legal">
    <h1>Privacy Policy</h1>
    <p class="updated">Last updated: April 13, 2026</p>

    <p>
      Fides ("we," "our," or "us") is committed to protecting your privacy.
      This Privacy Policy explains how we collect, use, and safeguard your
      information when you use the Fides mobile application (the "App").
    </p>

    <h2>1. Information We Collect</h2>
    <p>
      <strong>Account information.</strong> When you create an account, we collect
      your email address and authentication credentials. If you sign in with
      Apple, we receive only the information Apple provides (which may include a
      private relay email). If you sign in with Google, we receive your name,
      email address, and profile photo.
    </p>
    <p>
      <strong>Learning data.</strong> We collect information about your learning
      progress, including lessons completed, quiz responses, review schedules,
      streaks, XP earned, and saint unlocks. This data is used to personalize
      your experience and optimize your learning.
    </p>
    <p>
      <strong>Prayer journal entries.</strong> If you use the prayer journal
      feature, your intentions and reflections are stored in your account. This
      content is private to you and is never shared with third parties or used
      for advertising.
    </p>
    <p>
      <strong>Device information.</strong> We collect device type, operating
      system version, app version, and push notification tokens to deliver
      notifications you have opted into.
    </p>
    <p>
      <strong>Crash and performance data.</strong> We use Google Firebase
      Crashlytics to collect crash reports and performance diagnostics. This data
      includes device state at the time of a crash, stack traces, and device
      identifiers. It is used solely to diagnose and fix bugs.
    </p>
    <p>
      <strong>Local storage.</strong> Certain preferences and cached data
      (accessibility settings, streak state, onboarding progress) are stored
      locally on your device using MMKV and are never transmitted to our servers.
    </p>

    <h2>2. How We Use Your Information</h2>
    <ul>
      <li>To provide and maintain the App and your learning progress</li>
      <li>To schedule reviews and personalize your lesson queue</li>
      <li>To send push notifications you have opted into (streak reminders, review alerts)</li>
      <li>To process subscriptions and payments (handled by Apple and Google; we do not store payment information)</li>
      <li>To diagnose crashes and improve App stability via Firebase Crashlytics</li>
      <li>To manage subscription paywalls via Superwall</li>
      <li>To respond to support requests</li>
    </ul>

    <h2>3. Legal Basis for Processing (GDPR)</h2>
    <p>
      If you are located in the European Economic Area (EEA), United Kingdom, or
      Switzerland, we process your personal data on the following legal bases:
    </p>
    <ul>
      <li><strong>Contract performance</strong> — to provide the App, maintain your account, and deliver subscription features you have purchased</li>
      <li><strong>Legitimate interests</strong> — to improve the App, diagnose crashes, and prevent fraud, where these interests are not overridden by your rights</li>
      <li><strong>Consent</strong> — to send push notifications and, where required, to process crash and analytics data. You may withdraw consent at any time</li>
      <li><strong>Legal obligation</strong> — to comply with applicable laws, such as tax and accounting requirements for subscription payments</li>
    </ul>

    <h2>4. Data Storage and Security</h2>
    <p>
      Your data is stored securely using Supabase (hosted on AWS). All data is
      encrypted at rest and in transit using TLS 1.2+. Authentication is handled
      through Supabase Auth with industry-standard practices including bcrypt
      password hashing and JWT tokens. We enforce row-level security policies so
      that users can only access their own data.
    </p>

    <h2>5. Third-Party Services</h2>
    <p>We share data with the following third-party processors:</p>
    <ul>
      <li><strong>Supabase</strong> (AWS US regions) — database, authentication, backend infrastructure, and edge functions</li>
      <li><strong>Google Firebase</strong> — Crashlytics for crash reporting and diagnostics</li>
      <li><strong>Superwall</strong> — paywall presentation and subscription event tracking</li>
      <li><strong>Apple App Store / Google Play Store</strong> — payment processing for subscriptions. We receive confirmation of purchase status but never see or store your payment details</li>
      <li><strong>Expo (EAS)</strong> — push notification delivery via Expo Push Service</li>
    </ul>
    <p>
      We do not sell, rent, or trade your personal information to any third
      party. We do not use your data for advertising. We do not participate in
      data broker networks.
    </p>

    <h2>6. International Data Transfers</h2>
    <p>
      Your data may be transferred to and processed in the United States, where
      our infrastructure providers (Supabase, Firebase, Expo) operate. For users
      in the EEA/UK, these transfers are protected by Standard Contractual
      Clauses (SCCs) as adopted by the European Commission, or equivalent
      safeguards provided by our processors.
    </p>

    <h2>7. Data Retention</h2>
    <p>
      We retain your account data for as long as your account is active. If you
      delete your account, we will delete your personal data within 30 days.
      Crash reports are retained for 90 days. Anonymized, aggregated data (e.g.,
      total lesson completions) may be retained indefinitely. We may retain
      certain data longer where required by law (e.g., transaction records for
      tax purposes).
    </p>

    <h2>8. Your Rights</h2>
    <p>Depending on your location, you may have the right to:</p>
    <ul>
      <li><strong>Access</strong> the personal data we hold about you</li>
      <li><strong>Rectify</strong> inaccurate or incomplete data</li>
      <li><strong>Delete</strong> your account and associated data ("right to erasure")</li>
      <li><strong>Port</strong> your data in a machine-readable format</li>
      <li><strong>Restrict or object</strong> to certain processing activities</li>
      <li><strong>Withdraw consent</strong> for push notifications or analytics at any time</li>
      <li><strong>Lodge a complaint</strong> with your local data protection authority</li>
    </ul>
    <p>
      <strong>For California residents (CCPA/CPRA):</strong> You have the right
      to know what personal information we collect, request deletion, and opt out
      of the sale of personal information. We do not sell personal information.
      To exercise any of these rights, contact us at
      <a href="mailto:privacy@joinfides.com">privacy@joinfides.com</a>.
    </p>

    <h2>9. Children's Privacy</h2>
    <p>
      Fides is not directed to children under 13 (or under 16 in the EEA). We do
      not knowingly collect personal information from children under these ages.
      If you believe we have inadvertently collected such information, please
      contact us and we will promptly delete it.
    </p>

    <h2>10. Push Notifications</h2>
    <p>
      We send push notifications only for features you have explicitly enabled
      (streak reminders, review alerts, achievement notifications). You can
      disable any or all notifications in the App's settings or through your
      device's system notification settings at any time.
    </p>

    <h2>11. Changes to This Policy</h2>
    <p>
      We may update this Privacy Policy from time to time. We will notify you of
      material changes by posting the updated policy in the App and updating the
      "Last updated" date above. For significant changes, we will provide
      additional notice (such as an in-app notification). Your continued use of
      the App after changes constitutes acceptance of the updated policy.
    </p>

    <h2>12. Contact Us</h2>
    <p>
      If you have questions about this Privacy Policy, wish to exercise your data
      rights, or need to reach our data protection contact, email us at
      <a href="mailto:privacy@joinfides.com">privacy@joinfides.com</a>.
    </p>
  </article>

  <footer>
    <div class="footer-inner">
      <span class="footer-copy">Fides &copy; 2026</span>
      <div class="footer-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/privacy">Privacy</RouterLink>
        <RouterLink to="/terms">Terms</RouterLink>
      </div>
    </div>
  </footer>
</template>

<style scoped>
nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  height: 56px;
  background: rgba(12,12,12,0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 0.5px solid var(--line);
}
.nav-wordmark {
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 700;
}
.nav-back {
  font-size: 13px;
  color: var(--text-3);
  transition: color 0.2s;
}
.nav-back:hover { color: var(--text-2); }

.legal {
  max-width: 640px;
  margin: 0 auto;
  padding: 120px 24px 80px;
}
.legal h1 {
  font-family: var(--serif);
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 6px;
}
.updated {
  font-size: 12px;
  color: var(--text-3);
  margin-bottom: 40px;
}
.legal h2 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-top: 36px;
  margin-bottom: 12px;
}
.legal p {
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-2);
  margin-bottom: 14px;
}
.legal ul {
  padding-left: 18px;
  margin-bottom: 14px;
}
.legal li {
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-2);
  margin-bottom: 4px;
}
.legal a {
  color: var(--gold-light);
}
.legal a:hover { text-decoration: underline; }
.legal strong { color: var(--text); }

footer {
  border-top: 0.5px solid var(--line);
  padding: 36px 40px;
}
.footer-inner {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.footer-copy { font-size: 12px; color: var(--text-3); }
.footer-links { display: flex; gap: 24px; }
.footer-links a { font-size: 12px; color: var(--text-3); transition: color 0.2s; }
.footer-links a:hover { color: var(--text-2); }

@media (max-width: 600px) {
  nav { padding: 0 20px; }
  footer { padding: 28px 20px; }
  .footer-inner { flex-direction: column; gap: 12px; }
}
</style>
