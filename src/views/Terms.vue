<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav>
    <RouterLink to="/" class="nav-wordmark">Fides</RouterLink>
    <RouterLink to="/" class="nav-back">Back</RouterLink>
  </nav>

  <article class="legal">
    <h1>Terms of Service</h1>
    <p class="updated">Last updated: April 13, 2026</p>

    <p>
      These Terms of Service ("Terms") govern your use of the Fides mobile
      application (the "App") operated by Fides ("we," "our," or "us"). By
      downloading or using the App, you agree to these Terms.
    </p>

    <h2>1. Acceptance of Terms</h2>
    <p>
      By accessing or using the App, you agree to be bound by these Terms and
      our <RouterLink to="/privacy">Privacy Policy</RouterLink>. If you do not
      agree, do not use the App.
    </p>

    <h2>2. Description of Service</h2>
    <p>
      Fides is a Catholic education app that provides lessons, quizzes, spaced
      repetition review, prayer guidance, and saint collectibles. The App is
      available as a free version with limited features and a paid subscription
      ("Fides Pro") that unlocks additional content and features.
    </p>

    <h2>3. Account Registration</h2>
    <p>
      You may use certain features of the App without an account. To save
      progress, sync across devices, and access all features, you must create an
      account. You are responsible for maintaining the confidentiality of your
      account credentials and for all activity under your account.
    </p>
    <p>
      You may sign in using Apple Sign-In, Google Sign-In, or email. You must
      provide accurate information and be at least 13 years old (or 16 in the
      EEA) to create an account.
    </p>

    <h2>4. Subscriptions and Payments</h2>
    <p>
      <strong>Free tier.</strong> The free version of Fides includes access to a
      limited number of lessons and basic features.
    </p>
    <p>
      <strong>Fides Pro.</strong> Fides Pro is available as a monthly
      subscription, annual subscription, or one-time lifetime purchase. Pricing
      is displayed in the App at the time of purchase and may vary by region.
    </p>
    <p>
      <strong>Billing.</strong> All payments are processed through the Apple App
      Store or Google Play Store, depending on your platform. By subscribing, you
      agree to the respective store's payment terms. We do not directly process
      or store your payment information.
    </p>
    <p>
      <strong>Auto-renewal.</strong> Monthly and annual subscriptions
      automatically renew unless cancelled at least 24 hours before the end of
      the current billing period. You can manage or cancel your subscription
      through your Apple ID account settings (iOS) or Google Play subscriptions
      (Android).
    </p>
    <p>
      <strong>Refunds.</strong> Refund requests are handled by Apple or Google
      according to their respective refund policies. We cannot process refunds
      directly.
    </p>

    <h2>5. Acceptable Use</h2>
    <ul>
      <li>Do not use the App for any unlawful purpose</li>
      <li>Do not attempt to reverse engineer, decompile, or extract source code from the App</li>
      <li>Do not interfere with or disrupt the App's infrastructure</li>
      <li>Do not create multiple accounts to abuse free tier limitations</li>
      <li>Do not share, redistribute, or commercially exploit App content without permission</li>
      <li>Do not use automated systems to access the App (bots, scrapers, etc.)</li>
    </ul>

    <h2>6. Intellectual Property</h2>
    <p>
      All content in the App — including but not limited to lesson text, quiz
      questions, explanations, app design, graphics, icons, and software — is
      owned by Fides or licensed to us and is protected by copyright and
      intellectual property laws.
    </p>
    <p>
      Artwork depicting saints and religious figures used in the App is sourced
      from public domain works. The selection, arrangement, and presentation of
      this artwork within the App is proprietary.
    </p>

    <h2>7. User-Generated Content</h2>
    <p>
      Content you create in the App (prayer journal entries, intentions,
      reflections) remains yours. By storing it in the App, you grant us a
      limited license to store and display it back to you. We will not share,
      publish, or use your private content for any other purpose.
    </p>

    <h2>8. Content Disclaimer</h2>
    <p>
      Fides is an educational tool designed to teach Catholic theology, history,
      and practice. While we strive for theological accuracy and faithfulness to
      Church teaching, the App is not a substitute for formal catechesis,
      spiritual direction, or the sacraments. Content is provided for educational
      purposes and does not constitute official Church teaching or theological
      advice.
    </p>

    <h2>9. Availability and Modifications</h2>
    <p>
      We reserve the right to modify, suspend, or discontinue the App or any
      feature at any time without prior notice. We may update lesson content, add
      or remove features, and adjust pricing for future subscription periods. We
      will not reduce the features available to active subscribers during their
      current billing period.
    </p>

    <h2>10. Termination</h2>
    <p>
      We may suspend or terminate your account if you violate these Terms. You
      may delete your account at any time through the App's settings. Upon
      termination, your right to use the App ceases, but provisions that by their
      nature should survive (intellectual property, limitation of liability,
      etc.) will remain in effect.
    </p>

    <h2>11. Limitation of Liability</h2>
    <p>
      To the maximum extent permitted by law, Fides shall not be liable for any
      indirect, incidental, special, consequential, or punitive damages arising
      from your use of the App. Our total liability for any claim arising from
      these Terms or the App shall not exceed the amount you paid us in the 12
      months preceding the claim.
    </p>

    <h2>12. Disclaimer of Warranties</h2>
    <p>
      The App is provided "as is" and "as available" without warranties of any
      kind, express or implied. We do not warrant that the App will be
      uninterrupted, error-free, or free of harmful components.
    </p>

    <h2>13. Governing Law and Dispute Resolution</h2>
    <p>
      These Terms are governed by the laws of the United States. Any disputes
      arising from or relating to these Terms or your use of the App shall be
      resolved in the courts of competent jurisdiction. Nothing in these Terms
      limits your rights under mandatory consumer protection laws in your
      jurisdiction, including GDPR, CCPA, or equivalent local regulations.
    </p>

    <h2>14. Changes to Terms</h2>
    <p>
      We may update these Terms from time to time. We will notify you of
      material changes through the App or by email. Your continued use of the
      App after changes constitutes acceptance of the updated Terms.
    </p>

    <h2>15. Contact</h2>
    <p>
      For questions about these Terms, contact us at
      <a href="mailto:legal@joinfides.com">legal@joinfides.com</a>.
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
