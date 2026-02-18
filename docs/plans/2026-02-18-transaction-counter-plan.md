# Bullet Transaction Counter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a cyberpunk-themed single-page website with a fast-moving transaction counter that triggers glitch explosion effects at milestones.

**Architecture:** Vanilla HTML/CSS/JS. No build tools. Canvas overlay for particle effects. Web Audio API for sounds. Mock data feed with pluggable interface for real blockchain later.

**Tech Stack:** HTML5, CSS3 (animations, clamp, custom properties), vanilla JS (ES modules), Canvas API, Web Audio API, Google Fonts (JetBrains Mono)

---

### Task 1: HTML Scaffold + Local Server

**Files:**
- Create: `index.html`

**Step 1: Create index.html with base structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bullet - Transaction Counter</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <canvas id="fx-canvas"></canvas>
  <div class="scanlines"></div>

  <main class="container">
    <div class="logo-area">
      <h1 class="logo-text">BULLET</h1>
    </div>

    <div class="counter-area">
      <div id="counter" class="counter" aria-live="polite">
        <span class="digit-group" id="digit-container"></span>
      </div>
    </div>

    <div class="tagline-area">
      <p class="tagline-primary">transactions processed</p>
      <p class="tagline-secondary">sub-1ms latency</p>
    </div>
  </main>

  <script type="module" src="app.js"></script>
</body>
</html>
```

**Step 2: Start local server and verify**

Run: `cd /Users/mts/bullet-counter && python3 -m http.server 8080`
Open: `http://localhost:8080`
Expected: Bare page with "BULLET" text, empty counter area, taglines visible.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add HTML scaffold for transaction counter"
```

---

### Task 2: Cyberpunk CSS Theme

**Files:**
- Create: `style.css`

**Step 1: Create style.css with full cyberpunk theme**

```css
/* === Reset & Base === */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #0a0a0f;
  --bg-grid: #111118;
  --cyan: #00f0ff;
  --cyan-dim: #00f0ff66;
  --cyan-glow: #00f0ff33;
  --magenta: #ff00aa;
  --white: #e0e0e8;
  --white-dim: #e0e0e866;
  --font-mono: 'JetBrains Mono', monospace;
}

html, body {
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--white);
  font-family: var(--font-mono);
}

/* === Canvas Overlay === */
#fx-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

/* === Scanlines === */
.scanlines {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.08) 2px,
    rgba(0, 0, 0, 0.08) 4px
  );
}

/* === Animated Grid Background === */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  background-image:
    linear-gradient(var(--bg-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--bg-grid) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.4;
  animation: gridPulse 4s ease-in-out infinite;
}

@keyframes gridPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.5; }
}

/* === Layout === */
.container {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: clamp(1rem, 3vh, 2.5rem);
}

/* === Logo === */
.logo-area {
  text-align: center;
}

.logo-text {
  font-size: clamp(1.5rem, 4vw, 3rem);
  font-weight: 700;
  letter-spacing: 0.5em;
  text-transform: uppercase;
  color: var(--white);
  text-shadow:
    0 0 10px var(--cyan-glow),
    0 0 30px var(--cyan-glow);
}

/* === Counter === */
.counter-area {
  text-align: center;
}

.counter {
  display: inline-flex;
  align-items: center;
  font-size: clamp(3rem, 12vw, 10rem);
  font-weight: 700;
  color: var(--cyan);
  text-shadow:
    0 0 20px var(--cyan-dim),
    0 0 60px var(--cyan-glow),
    0 0 100px var(--cyan-glow);
  line-height: 1;
  position: relative;
}

.digit-group {
  display: inline-flex;
  align-items: center;
}

/* Each digit is a container that clips the rolling numbers */
.digit-slot {
  display: inline-block;
  width: 0.65em;
  height: 1.15em;
  overflow: hidden;
  position: relative;
}

.digit-slot .digit-roll {
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 0;
  transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}

.digit-slot .digit-roll span {
  display: block;
  height: 1.15em;
  line-height: 1.15em;
  text-align: center;
}

/* Comma separator */
.digit-comma {
  display: inline-block;
  width: 0.35em;
  text-align: center;
  opacity: 0.6;
}

/* === Glitch Effect === */
.counter.glitching {
  animation: glitchText 0.3s steps(3) forwards;
}

.counter.glitching::before,
.counter.glitching::after {
  content: attr(data-value);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.counter.glitching::before {
  color: var(--magenta);
  animation: glitchClipTop 0.3s steps(4) forwards;
  z-index: 1;
}

.counter.glitching::after {
  color: var(--cyan);
  animation: glitchClipBottom 0.3s steps(4) forwards;
  z-index: 2;
}

@keyframes glitchText {
  0% { transform: translate(0); }
  20% { transform: translate(-3px, 2px) skewX(-2deg); }
  40% { transform: translate(3px, -1px) skewX(3deg); }
  60% { transform: translate(-2px, 1px) skewX(-1deg); }
  80% { transform: translate(2px, -2px) skewX(2deg); }
  100% { transform: translate(0) skewX(0); }
}

@keyframes glitchClipTop {
  0% { clip-path: inset(0 0 60% 0); transform: translate(2px, -1px); }
  25% { clip-path: inset(0 0 40% 0); transform: translate(-3px, 1px); }
  50% { clip-path: inset(0 0 55% 0); transform: translate(1px, -2px); }
  75% { clip-path: inset(0 0 45% 0); transform: translate(-2px, 2px); }
  100% { clip-path: inset(0 0 50% 0); transform: translate(0); }
}

@keyframes glitchClipBottom {
  0% { clip-path: inset(60% 0 0 0); transform: translate(-2px, 1px); }
  25% { clip-path: inset(40% 0 0 0); transform: translate(3px, -1px); }
  50% { clip-path: inset(55% 0 0 0); transform: translate(-1px, 2px); }
  75% { clip-path: inset(45% 0 0 0); transform: translate(2px, -2px); }
  100% { clip-path: inset(50% 0 0 0); transform: translate(0); }
}

/* Bloom flash on milestone */
.counter.bloom {
  animation: bloomFlash 0.4s ease-out forwards;
}

@keyframes bloomFlash {
  0% {
    text-shadow:
      0 0 40px var(--cyan),
      0 0 80px var(--cyan),
      0 0 150px var(--cyan);
    filter: brightness(2);
  }
  100% {
    text-shadow:
      0 0 20px var(--cyan-dim),
      0 0 60px var(--cyan-glow),
      0 0 100px var(--cyan-glow);
    filter: brightness(1);
  }
}

/* === Taglines === */
.tagline-area {
  text-align: center;
}

.tagline-primary {
  font-size: clamp(0.8rem, 2vw, 1.3rem);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--white-dim);
}

.tagline-secondary {
  font-size: clamp(0.7rem, 1.5vw, 1rem);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--cyan-dim);
  margin-top: 0.5rem;
}

/* === Responsive === */
@media (max-width: 600px) {
  .logo-text {
    letter-spacing: 0.3em;
  }
  .digit-slot {
    width: 0.6em;
  }
  .digit-comma {
    width: 0.25em;
  }
}
```

**Step 2: Verify in browser**

Reload `http://localhost:8080`
Expected: Dark background with animated grid, scanlines, "BULLET" logo with cyan glow, taglines visible. Cyberpunk look.

**Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add cyberpunk CSS theme with grid, scanlines, and glow effects"
```

---

### Task 3: Counter Logic + Digit Rolling Animation

**Files:**
- Create: `app.js`

**Step 1: Create app.js with counter, digit rolling, and mock feed**

```js
// === Configuration ===
const CONFIG = {
  startValue: 0,
  tps: 50,              // transactions per second (mock)
  milestoneInterval: 100, // trigger effect every N transactions
};

// === Data Feed Interface ===
class MockFeed {
  constructor(tps) {
    this.tps = tps;
    this.callback = null;
    this.interval = null;
  }

  onTransaction(callback) {
    this.callback = callback;
  }

  start() {
    const msPerTx = 1000 / this.tps;
    this.interval = setInterval(() => {
      if (this.callback) this.callback(1);
    }, msPerTx);
  }

  stop() {
    clearInterval(this.interval);
  }
}

// === Digit Roller ===
class DigitRoller {
  constructor(container) {
    this.container = container;
    this.slots = [];
    this.currentFormatted = '';
  }

  formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  update(value) {
    const formatted = this.formatNumber(value);

    if (formatted.length !== this.currentFormatted.length) {
      this._rebuild(formatted);
    } else {
      this._roll(formatted);
    }

    this.currentFormatted = formatted;
  }

  _rebuild(formatted) {
    this.container.innerHTML = '';
    this.slots = [];

    for (const char of formatted) {
      if (char === ',') {
        const comma = document.createElement('span');
        comma.className = 'digit-comma';
        comma.textContent = ',';
        this.container.appendChild(comma);
        this.slots.push({ type: 'comma', el: comma });
      } else {
        const slot = document.createElement('span');
        slot.className = 'digit-slot';

        const roll = document.createElement('span');
        roll.className = 'digit-roll';

        for (let i = 0; i <= 9; i++) {
          const span = document.createElement('span');
          span.textContent = i;
          roll.appendChild(span);
        }

        slot.appendChild(roll);
        this.container.appendChild(slot);

        const digit = parseInt(char);
        roll.style.transform = `translateY(-${digit * (100 / 10)}%)`;

        this.slots.push({ type: 'digit', el: slot, roll, value: digit });
      }
    }
  }

  _roll(formatted) {
    let slotIdx = 0;
    for (const char of formatted) {
      const slot = this.slots[slotIdx];
      if (char === ',') {
        // skip comma slots
      } else if (slot && slot.type === 'digit') {
        const digit = parseInt(char);
        if (digit !== slot.value) {
          slot.roll.style.transform = `translateY(-${digit * (100 / 10)}%)`;
          slot.value = digit;
        }
      }
      slotIdx++;
    }
  }
}

// === Milestone Detector ===
class MilestoneDetector {
  constructor(interval, callback) {
    this.interval = interval;
    this.callback = callback;
    this.lastMilestone = 0;
  }

  check(value) {
    const currentMilestone = Math.floor(value / this.interval) * this.interval;
    if (currentMilestone > this.lastMilestone && currentMilestone > 0) {
      this.lastMilestone = currentMilestone;
      this.callback(currentMilestone);
    }
  }
}

// === Sound Manager ===
class SoundManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.initialized = true;
  }

  playGlitch() {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 0.5;

    // Noise buffer
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter for digital character
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    filter.Q.value = 5;

    // Distortion
    const distortion = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = (Math.PI + 50) * x / (Math.PI + 50 * Math.abs(x));
    }
    distortion.curve = curve;

    // Gain envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);

    // Sub bass thud
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

// === App Init ===
const digitContainer = document.getElementById('digit-container');
const counterEl = document.getElementById('counter');
const roller = new DigitRoller(digitContainer);
const sound = new SoundManager();

let transactionCount = CONFIG.startValue;

const milestone = new MilestoneDetector(CONFIG.milestoneInterval, (value) => {
  triggerMilestoneEffect(value);
});

function triggerMilestoneEffect(value) {
  sound.init();
  sound.playGlitch();

  // Set data attribute for glitch pseudo-elements
  counterEl.setAttribute('data-value', roller.formatNumber(value));

  // Phase 1: Glitch
  counterEl.classList.add('glitching');

  // Phase 2: Particle burst (handled by effects.js)
  if (window.particleBurst) {
    window.particleBurst();
  }

  setTimeout(() => {
    counterEl.classList.remove('glitching');
    // Phase 3: Bloom
    counterEl.classList.add('bloom');
    setTimeout(() => {
      counterEl.classList.remove('bloom');
    }, 400);
  }, 300);
}

// Initialize counter display
roller.update(transactionCount);

// Start mock feed
const feed = new MockFeed(CONFIG.tps);
feed.onTransaction((count) => {
  transactionCount += count;
  roller.update(transactionCount);
  milestone.check(transactionCount);
});

// Start on first user interaction (required for Web Audio)
function startOnInteraction() {
  feed.start();
  document.removeEventListener('click', startOnInteraction);
  document.removeEventListener('keydown', startOnInteraction);
}

// Also auto-start after a brief delay (audio won't work until interaction)
document.addEventListener('click', startOnInteraction);
document.addEventListener('keydown', startOnInteraction);

// Auto-start the counter (sound will only work after interaction)
setTimeout(() => {
  feed.start();
}, 500);
```

**Step 2: Verify in browser**

Reload `http://localhost:8080`
Expected: Counter starts at 0 and begins incrementing at ~50 TPS after 0.5s. Digits roll smoothly. At 100 transactions, glitch CSS effect fires and a digital glitch sound plays. Number has cyan glow.

**Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add counter logic with digit rolling, mock feed, milestone detection, and sound"
```

---

### Task 4: Canvas Particle Burst Effect

**Files:**
- Create: `effects.js`
- Modify: `index.html` (add script tag)

**Step 1: Create effects.js with particle system**

```js
const canvas = document.getElementById('fx-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let animating = false;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1;
    this.decay = 0.01 + Math.random() * 0.03;
    this.size = 1 + Math.random() * 3;

    // Cyan or magenta
    this.color = Math.random() > 0.3
      ? { r: 0, g: 240, b: 255 }
      : { r: 255, g: 0, b: 170 };
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.97;
    this.vy *= 0.97;
    this.life -= this.decay;
  }

  draw(ctx) {
    const { r, g, b } = this.color;
    ctx.fillStyle = `rgba(${r},${g},${b},${this.life})`;
    ctx.shadowColor = `rgba(${r},${g},${b},${this.life * 0.8})`;
    ctx.shadowBlur = 10;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

function spawnBurst() {
  const counterEl = document.querySelector('.counter');
  const rect = counterEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < 80; i++) {
    particles.push(new Particle(cx, cy));
  }

  // Also spawn line glitch fragments
  for (let i = 0; i < 12; i++) {
    const frag = new Particle(cx + (Math.random() - 0.5) * rect.width, cy);
    frag.vx = (Math.random() - 0.5) * 15;
    frag.vy = (Math.random() - 0.5) * 3;
    frag.size = Math.random() * rect.width * 0.3;
    frag.decay = 0.04;
    particles.push(frag);
  }

  if (!animating) {
    animating = true;
    animate();
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter(p => p.life > 0);

  for (const p of particles) {
    p.update();
    p.draw(ctx);
  }

  ctx.shadowBlur = 0;

  if (particles.length > 0) {
    requestAnimationFrame(animate);
  } else {
    animating = false;
  }
}

// Expose to app.js
window.particleBurst = spawnBurst;
```

**Step 2: Add effects.js script to index.html**

In `index.html`, add before the app.js script tag:
```html
  <script src="effects.js"></script>
  <script type="module" src="app.js"></script>
```

**Step 3: Verify in browser**

Reload `http://localhost:8080`
Expected: At every 100-tx milestone, cyan and magenta particles burst outward from the counter, with horizontal glitch line fragments. Particles fade out over ~1 second.

**Step 4: Commit**

```bash
git add effects.js index.html
git commit -m "feat: add canvas particle burst effect for milestones"
```

---

### Task 5: Click-to-Start Overlay + Polish

**Files:**
- Modify: `index.html` (add overlay div)
- Modify: `style.css` (add overlay styles)
- Modify: `app.js` (handle overlay dismiss + auto-start fix)

**Step 1: Add overlay to index.html**

Add after `<main>` closing tag, before scripts:
```html
  <div id="start-overlay" class="start-overlay">
    <p class="start-text">CLICK TO INITIALIZE</p>
  </div>
```

**Step 2: Add overlay CSS to style.css**

```css
/* === Start Overlay === */
.start-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.5s ease;
}

.start-overlay.hidden {
  opacity: 0;
  pointer-events: none;
}

.start-text {
  font-family: var(--font-mono);
  font-size: clamp(1rem, 3vw, 1.8rem);
  letter-spacing: 0.3em;
  color: var(--cyan);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
```

**Step 3: Update app.js to use overlay for start**

Replace the interaction/auto-start block at the bottom of app.js with:
```js
// Start on overlay click (enables Web Audio)
const overlay = document.getElementById('start-overlay');
overlay.addEventListener('click', () => {
  sound.init();
  feed.start();
  overlay.classList.add('hidden');
  setTimeout(() => overlay.remove(), 500);
});
```

Remove the old `startOnInteraction` function and the `setTimeout` auto-start.

**Step 4: Verify in browser**

Reload `http://localhost:8080`
Expected: "CLICK TO INITIALIZE" overlay pulses. On click, overlay fades out, counter starts, sound works on milestones.

**Step 5: Commit**

```bash
git add index.html style.css app.js
git commit -m "feat: add click-to-start overlay for audio context initialization"
```

---

### Task 6: Final Responsive Testing + Cleanup

**Step 1: Test at mobile width**

Open browser DevTools, toggle device toolbar, test at 375px width (iPhone SE).
Expected: Counter fills ~90% width, logo smaller, taglines readable, grid and scanlines visible. Milestone effects still work.

**Step 2: Test at tablet width**

Test at 768px.
Expected: Proportional scaling between mobile and desktop.

**Step 3: Fix any responsive issues found**

Adjust CSS clamp values or media queries as needed.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: responsive polish and cleanup"
```

---

## Verification Checklist

After all tasks:
- [ ] Page loads with dark cyberpunk theme, grid background, scanlines
- [ ] "CLICK TO INITIALIZE" overlay appears
- [ ] Click dismisses overlay, counter starts incrementing
- [ ] Digits roll smoothly (slot-machine style)
- [ ] Number has comma formatting
- [ ] Every 100 transactions: CSS glitch + particle burst + sound
- [ ] Responsive on mobile (375px), tablet (768px), desktop
- [ ] No console errors
- [ ] CONFIG.tps adjustable (try 200, 1000)
