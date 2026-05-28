<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('visible')
      })
    },
    { threshold: 0.12 }
  )
  document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => observer.observe(el))
})
</script>

<template>
  <!-- ═══ NAV ═══ -->
  <nav>
    <RouterLink to="/" class="nav-wordmark">Fides</RouterLink>
    <div class="nav-right">
      <a href="#learn" class="nav-link">How it works</a>
      <RouterLink to="/download" class="nav-download">Download</RouterLink>
    </div>
  </nav>

  <!-- ═══ HERO ═══ -->
  <header class="hero">
    <div class="hero-content">
      <h1 class="hero-headline">
        The Duolingo<br />of Catholicism.
      </h1>
      <p class="hero-sub">
        200+ lessons. 7 pillars of theology. 5 minutes a day.
      </p>
      <div class="hero-actions">
        <a href="https://apps.apple.com/us/app/fides-catholic-faith/id6761725633" class="cta-btn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          iOS
        </a>
        <a href="https://play.google.com/store/apps/details?id=com.liaxo.fides" class="cta-btn cta-btn--android">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 2.236l1.442-1.442a.552.552 0 00-.78-.78L16.6 1.6a6.42 6.42 0 00-4.6-1.6 6.42 6.42 0 00-4.6 1.6L5.815.014a.552.552 0 00-.78.78L6.477 2.236A6.36 6.36 0 004 7h16a6.36 6.36 0 00-2.477-4.764zM9 5a1 1 0 110-2 1 1 0 010 2zm6 0a1 1 0 110-2 1 1 0 010 2zM4 8v10a1 1 0 001 1h1v3.5a1.5 1.5 0 003 0V19h6v3.5a1.5 1.5 0 003 0V19h1a1 1 0 001-1V8H4zm-3 0a1.5 1.5 0 00-1.5 1.5v7a1.5 1.5 0 003 0v-7A1.5 1.5 0 001 8zm22 0a1.5 1.5 0 00-1.5 1.5v7a1.5 1.5 0 003 0v-7A1.5 1.5 0 0023 8z"/></svg>
          Android
        </a>
        <span class="hero-free">Free to start</span>
      </div>
    </div>
  </header>

  <!-- ═══ PHONE SHOWCASE ═══ -->
  <section class="showcase reveal">
    <div class="showcase-phones">
      <div class="phone phone--back">
        <img src="/screenshots/concept.png" alt="Lesson content with Caravaggio painting" />
      </div>
      <div class="phone phone--front">
        <img src="/screenshots/learn.png" alt="Learn tab dashboard" />
      </div>
      <div class="phone phone--back phone--right">
        <img src="/screenshots/saints.png" alt="Saints collection" />
      </div>
    </div>
  </section>

  <!-- ═══ ONE-LINER ═══ -->
  <section class="statement reveal">
    <p>
      Most Catholics can't explain their own faith.<br class="hide-mobile" />
      Fides fixes that — one lesson at a time.
    </p>
  </section>

  <!-- ═══ HOW IT WORKS — editorial, not cards ═══ -->
  <section id="learn" class="editorial">
    <div class="ed-block reveal">
      <div class="ed-text">
        <span class="ed-label">Learn</span>
        <h2>Five minutes.<br />One concept.</h2>
        <p>
          Each lesson teaches a single idea through short readings,
          classical art, and targeted questions. You'll know immediately
          if you understood it. No fluff, no filler.
        </p>
      </div>
      <div class="ed-phone">
        <img src="/screenshots/concept.png" alt="Lesson showing the Incredulity of Saint Thomas" />
      </div>
    </div>

    <div class="ed-block ed-block--reverse reveal">
      <div class="ed-text">
        <span class="ed-label">Review</span>
        <h2>Remember<br />permanently.</h2>
        <p>
          Our spaced repetition system brings questions back right before
          you'd forget. A few minutes of daily review moves knowledge
          from short-term memory to permanent understanding.
        </p>
      </div>
      <div class="ed-phone">
        <img src="/screenshots/review.png" alt="Review session showing due questions" />
      </div>
    </div>

    <div class="ed-block reveal">
      <div class="ed-text">
        <span class="ed-label">Test</span>
        <h2>Questions that<br />make you think.</h2>
        <p>
          Not trivia. Real theological questions with explanations
          grounded in Scripture, the Catechism, and the Church Fathers.
          Wrong answers teach as much as right ones.
        </p>
      </div>
      <div class="ed-phone">
        <img src="/screenshots/question.png" alt="Multiple choice question about Anointing of the Sick" />
      </div>
    </div>
  </section>

  <!-- ═══ PILLARS ═══ -->
  <section class="pillars reveal-stagger">
    <h2 class="pillars-title">Seven pillars. Two thousand years.</h2>
    <p class="pillars-sub">
      Every lesson grounded in Scripture, the Catechism, and the Fathers.
    </p>
    <div class="pillars-list">
      <div class="pillar"><span class="pillar-dot" style="background:#C4912C"></span>Foundations</div>
      <div class="pillar"><span class="pillar-dot" style="background:#5B8DEF"></span>Apologetics</div>
      <div class="pillar"><span class="pillar-dot" style="background:#D4673A"></span>Church History</div>
      <div class="pillar"><span class="pillar-dot" style="background:#7B68EE"></span>Scripture</div>
      <div class="pillar"><span class="pillar-dot" style="background:#4ECDC4"></span>Science &amp; Faith</div>
      <div class="pillar"><span class="pillar-dot" style="background:#E8B44E"></span>Moral Theology</div>
      <div class="pillar"><span class="pillar-dot" style="background:#FF6B9D"></span>Sacramental Life</div>
    </div>
  </section>

  <!-- ═══ COLLECT ═══ -->
  <section class="collect">
    <div class="collect-inner reveal">
      <div class="collect-text">
        <span class="ed-label">Collect</span>
        <h2>60+ saints.<br />Earned, not given.</h2>
        <p>
          Complete tracks, hit milestones, keep your streak alive,
          and open the app on feast days. Each saint has a story,
          a portrait, and a reason you earned them.
        </p>
      </div>
      <div class="collect-phones">
        <div class="phone">
          <img src="/screenshots/saints.png" alt="Saints collection screen" />
        </div>
        <div class="phone phone--overlap">
          <img src="/screenshots/saint-unlock.png" alt="Saint unlock reveal" />
        </div>
      </div>
    </div>
  </section>

  <!-- ═══ STREAK ═══ -->
  <section class="streak-section reveal">
    <div class="streak-inner">
      <div class="streak-phone">
        <img src="/screenshots/streak.png" alt="62-day streak screen" />
      </div>
      <div class="streak-text">
        <span class="ed-label" style="color:var(--streak)">Streaks</span>
        <h2>Build a habit<br />that actually sticks.</h2>
        <p>
          Daily streaks, XP, and progress tracking.
          The same psychology that got 100M people on Duolingo every day,
          for something that matters more.
        </p>
      </div>
    </div>
  </section>

  <!-- ═══ FINAL CTA ═══ -->
  <section class="final-cta reveal">
    <h2>Your faith deserves<br />more than Sunday.</h2>
    <p>Free to download. No credit card required.</p>
    <div class="cta-buttons">
      <a href="https://apps.apple.com/us/app/fides-catholic-faith/id6761725633" class="cta-btn cta-btn--lg">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
        iOS
      </a>
      <a href="https://play.google.com/store/apps/details?id=com.liaxo.fides" class="cta-btn cta-btn--lg cta-btn--android">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 2.236l1.442-1.442a.552.552 0 00-.78-.78L16.6 1.6a6.42 6.42 0 00-4.6-1.6 6.42 6.42 0 00-4.6 1.6L5.815.014a.552.552 0 00-.78.78L6.477 2.236A6.36 6.36 0 004 7h16a6.36 6.36 0 00-2.477-4.764zM9 5a1 1 0 110-2 1 1 0 010 2zm6 0a1 1 0 110-2 1 1 0 010 2zM4 8v10a1 1 0 001 1h1v3.5a1.5 1.5 0 003 0V19h6v3.5a1.5 1.5 0 003 0V19h1a1 1 0 001-1V8H4zm-3 0a1.5 1.5 0 00-1.5 1.5v7a1.5 1.5 0 003 0v-7A1.5 1.5 0 001 8zm22 0a1.5 1.5 0 00-1.5 1.5v7a1.5 1.5 0 003 0v-7A1.5 1.5 0 0023 8z"/></svg>
        Android
      </a>
    </div>
  </section>

  <!-- ═══ FOOTER ═══ -->
  <footer>
    <div class="footer-inner">
      <span class="footer-copy">Fides &copy; 2026</span>
      <div class="footer-links">
        <RouterLink to="/privacy">Privacy</RouterLink>
        <RouterLink to="/terms">Terms</RouterLink>
        <a href="mailto:support@joinfides.com">Contact</a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════ */
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
.nav-right {
  display: flex;
  align-items: center;
  gap: 24px;
}
.nav-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
  transition: color 0.2s;
}
.nav-link:hover { color: var(--text-2); }
.nav-download {
  font-size: 12px;
  font-weight: 600;
  color: var(--bg);
  background: var(--gold);
  padding: 7px 18px;
  border-radius: 6px;
  transition: opacity 0.2s;
}
.nav-download:hover { opacity: 0.88; }

@media (max-width: 600px) {
  nav { padding: 0 20px; }
  .nav-link { display: none; }
}

/* ═══════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════ */
.hero {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 140px 24px 40px;
}
.hero-content {
  max-width: 620px;
}
.hero-headline {
  font-family: var(--serif);
  font-size: clamp(36px, 7vw, 64px);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.5px;
  margin-bottom: 20px;
}
.hero-sub {
  font-size: 15px;
  line-height: 1.65;
  color: var(--text-2);
  margin-bottom: 32px;
}
.hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}
.hero-free {
  font-size: 13px;
  color: var(--text-3);
  width: 100%;
}

@media (max-width: 600px) {
  .hero { padding: 120px 20px 32px; min-height: 60vh; }
  .hero-sub { font-size: 14px; margin-bottom: 28px; }
  .hero-free { margin-top: 4px; }
}

/* CTA button */
.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--gold);
  color: var(--bg);
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 600;
  padding: 13px 26px;
  border-radius: 6px;
  transition: opacity 0.2s;
}
.cta-btn:hover { opacity: 0.88; }
.cta-btn--android {
  background: var(--raised);
  color: var(--text);
}
.cta-btn--lg {
  font-size: 16px;
  padding: 16px 36px;
}
.cta-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ═══════════════════════════════════════════════════════
   SHOWCASE — 3 phones
   ═══════════════════════════════════════════════════════ */
.showcase {
  padding: 0 24px 100px;
  overflow: hidden;
}
.showcase-phones {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
}
.phone img {
  border-radius: 28px;
  border: 1px solid #222;
}
.phone--front img {
  width: 260px;
}
.phone--back img {
  width: 220px;
  opacity: 0.5;
  margin-top: 40px;
}
.phone--right {
  /* shown on desktop only */
}

@media (max-width: 760px) {
  .showcase { padding: 0 20px 60px; }
  .phone--back { display: none; }
  .phone--front img { width: 240px; }
}

/* ═══════════════════════════════════════════════════════
   STATEMENT
   ═══════════════════════════════════════════════════════ */
.statement {
  padding: 80px 24px;
  text-align: center;
}
.statement p {
  font-family: var(--serif);
  font-size: clamp(20px, 3.5vw, 32px);
  font-weight: 400;
  line-height: 1.4;
  color: var(--text-2);
  max-width: 680px;
  margin: 0 auto;
}

@media (max-width: 600px) {
  .statement { padding: 48px 20px; }
}

/* ═══════════════════════════════════════════════════════
   EDITORIAL BLOCKS
   ═══════════════════════════════════════════════════════ */
.editorial {
  padding: 40px 24px 60px;
  max-width: 1060px;
  margin: 0 auto;
}

@media (max-width: 600px) {
  .editorial { padding: 20px 20px 40px; }
}
.ed-block {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 60px;
  align-items: center;
  padding: 80px 0;
  border-top: 0.5px solid var(--line);
}
.ed-block--reverse {
  grid-template-columns: 300px 1fr;
}
.ed-block--reverse .ed-text {
  order: 2;
}
.ed-block--reverse .ed-phone {
  order: 1;
}
.ed-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--gold-light);
  margin-bottom: 16px;
}
.ed-text h2 {
  font-family: var(--serif);
  font-size: clamp(26px, 3.5vw, 36px);
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 16px;
}
.ed-text p {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-2);
  max-width: 440px;
}
.ed-phone img {
  width: 100%;
  border-radius: 28px;
  border: 1px solid #222;
}

@media (max-width: 760px) {
  .ed-block,
  .ed-block--reverse {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 40px 0;
  }
  .ed-block--reverse .ed-text { order: 1; }
  .ed-block--reverse .ed-phone { order: 2; }
  .ed-phone { max-width: 220px; margin: 0 auto; }
  .ed-text p { font-size: 14px; }
}

/* ═══════════════════════════════════════════════════════
   PILLARS
   ═══════════════════════════════════════════════════════ */
.pillars {
  padding: 80px 24px;
  text-align: center;
  border-top: 0.5px solid var(--line);
}
.pillars-title {
  font-family: var(--serif);
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 700;
  margin-bottom: 12px;
}
.pillars-sub {
  font-size: 14px;
  color: var(--text-2);
  margin-bottom: 40px;
}
.pillars-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 700px;
  margin: 0 auto;
}
.pillar {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  background: var(--surface);
  padding: 12px 20px;
  border-radius: 6px;
}
.pillar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .pillars { padding: 48px 20px; }
  .pillars-sub { margin-bottom: 28px; }
  .pillar { font-size: 13px; padding: 10px 16px; }
}

/* ═══════════════════════════════════════════════════════
   COLLECT
   ═══════════════════════════════════════════════════════ */
.collect {
  padding: 80px 24px;
  overflow: hidden;
}
.collect-inner {
  max-width: 1060px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
}
.collect-text h2 {
  font-family: var(--serif);
  font-size: clamp(26px, 3.5vw, 36px);
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 16px;
}
.collect-text p {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-2);
  max-width: 420px;
}
.collect-phones {
  display: flex;
  gap: 16px;
  justify-content: center;
}
.collect-phones .phone img {
  width: 200px;
}
.phone--overlap {
  margin-top: 48px;
}

@media (max-width: 760px) {
  .collect { padding: 48px 20px; }
  .collect-inner {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 32px;
  }
  .collect-text p { margin: 0 auto; font-size: 14px; }
  .collect-phones .phone img { width: 140px; }
  .phone--overlap { margin-top: 32px; }
}

/* ═══════════════════════════════════════════════════════
   STREAK
   ═══════════════════════════════════════════════════════ */
.streak-section {
  padding: 80px 24px;
  border-top: 0.5px solid var(--line);
}
.streak-inner {
  max-width: 1060px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 60px;
  align-items: center;
}
.streak-phone img {
  width: 100%;
  border-radius: 28px;
  border: 1px solid #222;
}
.streak-text h2 {
  font-family: var(--serif);
  font-size: clamp(26px, 3.5vw, 36px);
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 16px;
}
.streak-text p {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-2);
  max-width: 440px;
}

@media (max-width: 760px) {
  .streak-section { padding: 48px 20px; }
  .streak-inner {
    grid-template-columns: 1fr;
    gap: 28px;
    text-align: center;
  }
  .streak-phone { max-width: 200px; margin: 0 auto; }
  .streak-text p { font-size: 14px; margin: 0 auto; }
}

/* ═══════════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════════ */
.final-cta {
  text-align: center;
  padding: 120px 24px;
  border-top: 0.5px solid var(--line);
}

@media (max-width: 600px) {
  .final-cta { padding: 72px 20px; }
  .final-cta p { font-size: 14px; }
  .cta-btn--lg { font-size: 14px; padding: 14px 28px; }
}
.final-cta h2 {
  font-family: var(--serif);
  font-size: clamp(30px, 4.5vw, 44px);
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 16px;
}
.final-cta p {
  font-size: 15px;
  color: var(--text-2);
  margin-bottom: 32px;
}

/* ═══════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════ */
footer {
  border-top: 0.5px solid var(--line);
  padding: 36px 40px;
}
.footer-inner {
  max-width: 1060px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.footer-copy {
  font-size: 12px;
  color: var(--text-3);
}
.footer-links {
  display: flex;
  gap: 24px;
}
.footer-links a {
  font-size: 12px;
  color: var(--text-3);
  transition: color 0.2s;
}
.footer-links a:hover { color: var(--text-2); }

@media (max-width: 600px) {
  footer { padding: 28px 20px; }
  .footer-inner { flex-direction: column; gap: 12px; }
}

/* ─── Utility ─────────────────────────────────────── */
.hide-mobile {
  @media (max-width: 640px) { display: none; }
}
</style>
