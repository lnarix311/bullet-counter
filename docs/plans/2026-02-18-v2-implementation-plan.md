# V2: Transaction Log + New Effects - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add live transaction log with typewriter animation, casino ding sound, and screen flash + speed lines effect. Remove old glitch/particle effects.

**Architecture:** Modify existing vanilla HTML/CSS/JS files. No new dependencies.

**Tech Stack:** Same as v1 - HTML5, CSS3, vanilla JS, Canvas API, Web Audio API

---

### Task 1: Add Transaction Log HTML + CSS

**Files:**
- Modify: `index.html`
- Modify: `style.css`

**Step 1: Add tx-log container to index.html**

After the tagline-area div and before closing `</main>`, add:
```html
    <div class="tx-log-area">
      <div id="tx-log" class="tx-log"></div>
    </div>
```

**Step 2: Add transaction log CSS to style.css**

Add before the responsive media query section:
```css
/* === Transaction Log === */
.tx-log-area {
  width: clamp(300px, 70vw, 700px);
  max-height: 25vh;
  overflow: hidden;
  position: relative;
}

.tx-log-area::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px;
  background: linear-gradient(transparent, var(--bg-primary));
  pointer-events: none;
  z-index: 1;
}

.tx-log {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.5rem;
}

.tx-row {
  font-size: clamp(0.55rem, 1.2vw, 0.75rem);
  color: var(--cyan-dim);
  white-space: nowrap;
  overflow: hidden;
  letter-spacing: 0.05em;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.tx-row.visible {
  opacity: 1;
}

.tx-row.fading {
  opacity: 0;
  transition: opacity 0.5s ease;
}

.tx-row .tx-hash {
  color: var(--white-dim);
}

.tx-row .tx-arrow {
  color: var(--cyan);
  margin: 0 0.3em;
}

/* === Screen Flash === */
.screen-flash {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: white;
  opacity: 0;
  pointer-events: none;
  z-index: 50;
}

.screen-flash.active {
  animation: flashBang 0.15s ease-out forwards;
}

@keyframes flashBang {
  0% { opacity: 0.5; }
  100% { opacity: 0; }
}
```

**Step 3: Update responsive section in style.css**

Add to the existing `@media (max-width: 600px)` block:
```css
  .tx-log-area {
    width: 95vw;
  }
  .tx-row {
    font-size: 0.5rem;
  }
```

**Step 4: Also need to change body overflow from hidden to allow the taller layout:**

Change `html, body` overflow from `hidden` to `hidden` but add `overflow-y: auto` or adjust .container to not be 100vh fixed. Actually, better approach: change `.container` from `height: 100vh` to `min-height: 100vh` and reduce the counter font size slightly to fit everything.

**Step 5: Add screen flash div to index.html**

After the scanlines div:
```html
  <div id="screen-flash" class="screen-flash"></div>
```

**Step 6: Commit**
```bash
git add index.html style.css
git commit -m "feat: add transaction log HTML/CSS and screen flash element"
```

---

### Task 2: Replace effects.js - Speed Lines + Flash

**Files:**
- Rewrite: `effects.js`

**Step 1: Rewrite effects.js with speed lines system**

Replace entire file with:
```js
const canvas = document.getElementById('fx-canvas');
const ctx = canvas.getContext('2d');

let lines = [];
let animating = false;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class SpeedLine {
  constructor(cx, cy) {
    const angle = Math.random() * Math.PI * 2;
    this.cx = cx;
    this.cy = cy;
    this.angle = angle;
    this.length = 0;
    this.maxLength = 150 + Math.random() * 300;
    this.speed = 15 + Math.random() * 25;
    this.width = 1 + Math.random() * 2.5;
    this.life = 1;
    this.decay = 0.015 + Math.random() * 0.01;
    this.startDist = 30 + Math.random() * 60;
    this.color = Math.random() > 0.4
      ? { r: 0, g: 240, b: 255 }
      : { r: 255, g: 255, b: 255 };
  }

  update() {
    this.length += this.speed;
    this.life -= this.decay;
  }

  draw(ctx) {
    const { r, g, b } = this.color;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const startDist = this.startDist;
    const endDist = startDist + this.length;

    const x1 = this.cx + cos * startDist;
    const y1 = this.cy + sin * startDist;
    const x2 = this.cx + cos * endDist;
    const y2 = this.cy + sin * endDist;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${this.life * 0.8})`;
    ctx.lineWidth = this.width;
    ctx.shadowColor = `rgba(${r},${g},${b},${this.life * 0.5})`;
    ctx.shadowBlur = 8;
    ctx.stroke();
  }
}

function spawnSpeedLines() {
  const counterEl = document.querySelector('.counter');
  const rect = counterEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < 16; i++) {
    lines.push(new SpeedLine(cx, cy));
  }

  // Trigger screen flash
  const flash = document.getElementById('screen-flash');
  if (flash) {
    flash.classList.remove('active');
    void flash.offsetWidth; // force reflow
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 200);
  }

  if (!animating) {
    animating = true;
    animate();
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  lines = lines.filter(l => l.life > 0);

  for (const l of lines) {
    l.update();
    l.draw(ctx);
  }

  ctx.shadowBlur = 0;

  if (lines.length > 0) {
    requestAnimationFrame(animate);
  } else {
    animating = false;
  }
}

// Expose to app.js
window.speedLinesBurst = spawnSpeedLines;
```

**Step 2: Commit**
```bash
git add effects.js
git commit -m "feat: replace particle system with speed lines + screen flash"
```

---

### Task 3: Rewrite app.js - New Milestones, TX Log, Ding Sound

**Files:**
- Rewrite: `app.js`

**Step 1: Rewrite app.js with new milestone system, transaction log, and casino ding**

Replace entire file. Key changes from v1:
- CONFIG: remove milestoneInterval, add dingInterval (50) and flashInterval (200)
- SoundManager: remove playGlitch(), add playDing(loud) with sine oscillator at 880Hz
- New: TxLogManager class - generates mock tx data, typewriter animation, manages 8 visible rows
- New: mock tx data generator (random hex hashes/addresses)
- MilestoneDetector: now handles two tiers
- triggerMilestoneEffect: replaced with tiered system
- Remove all glitch CSS class toggling

Full replacement code:
```js
// === Configuration ===
const CONFIG = {
  startValue: 0,
  tps: 50,
  dingInterval: 50,
  flashInterval: 200,
  maxLogRows: 8,
  typewriterSpeed: 5, // ms per character
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

// === Mock TX Data ===
function randomHex(len) {
  const chars = '0123456789abcdef';
  let s = '0x';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

function mockTxData() {
  return {
    hash: randomHex(8),
    from: randomHex(6),
    to: randomHex(6),
  };
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

// === Transaction Log Manager ===
class TxLogManager {
  constructor(container, maxRows, typewriterSpeed) {
    this.container = container;
    this.maxRows = maxRows;
    this.typewriterSpeed = typewriterSpeed;
    this.rows = [];
  }

  addTransaction(tx) {
    const text = `${tx.hash}  ${tx.from} → ${tx.to}`;
    const row = document.createElement('div');
    row.className = 'tx-row';

    this.container.prepend(row);
    this.rows.unshift(row);

    // Typewriter effect
    this._typewrite(row, text);

    // Remove excess rows
    while (this.rows.length > this.maxRows) {
      const old = this.rows.pop();
      old.classList.add('fading');
      setTimeout(() => old.remove(), 500);
    }
  }

  _typewrite(row, text) {
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        row.textContent = text.slice(0, i + 1);
        i++;
      } else {
        clearInterval(interval);
        // Build styled version after typewriter completes
        this._styleRow(row, text);
        row.classList.add('visible');
      }
    }, this.typewriterSpeed);

    // Show during typing
    row.style.opacity = '0.6';
    row.style.transition = 'none';
  }

  _styleRow(row, text) {
    // Parse: "0xhash  0xfrom → 0xto"
    const parts = text.split('  ');
    const hash = parts[0];
    const addrPart = parts[1] || '';
    const [from, to] = addrPart.split(' → ');

    row.innerHTML = '';
    row.style.opacity = '';
    row.style.transition = '';

    const hashSpan = document.createElement('span');
    hashSpan.className = 'tx-hash';
    hashSpan.textContent = hash;
    row.appendChild(hashSpan);

    const spacer = document.createTextNode('  ');
    row.appendChild(spacer);

    if (from) {
      const fromSpan = document.createTextNode(from);
      row.appendChild(fromSpan);
    }

    const arrow = document.createElement('span');
    arrow.className = 'tx-arrow';
    arrow.textContent = '→';
    row.appendChild(arrow);

    if (to) {
      const toSpan = document.createTextNode(to);
      row.appendChild(toSpan);
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

  playDing(loud = false) {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const volume = loud ? 0.35 : 0.15;
    const duration = loud ? 0.5 : 0.3;

    // Main bell tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);

    // Harmonic overtone for brightness
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, now);
    osc2.frequency.exponentialRampToValueAtTime(1320, now + duration * 0.7);

    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(volume * 0.3, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + duration * 0.7);

    if (loud) {
      // Extra shimmer for the big ding
      const osc3 = this.ctx.createOscillator();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(2640, now);
      osc3.frequency.exponentialRampToValueAtTime(1760, now + 0.3);

      const gain3 = this.ctx.createGain();
      gain3.gain.setValueAtTime(volume * 0.15, now);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc3.connect(gain3);
      gain3.connect(this.ctx.destination);
      osc3.start(now);
      osc3.stop(now + 0.3);
    }
  }
}

// === App Init ===
const digitContainer = document.getElementById('digit-container');
const counterEl = document.getElementById('counter');
const txLogEl = document.getElementById('tx-log');
const roller = new DigitRoller(digitContainer);
const sound = new SoundManager();
const txLog = new TxLogManager(txLogEl, CONFIG.maxLogRows, CONFIG.typewriterSpeed);

let transactionCount = CONFIG.startValue;
let lastDing = 0;
let lastFlash = 0;

function checkMilestones(value) {
  const currentDing = Math.floor(value / CONFIG.dingInterval) * CONFIG.dingInterval;
  const currentFlash = Math.floor(value / CONFIG.flashInterval) * CONFIG.flashInterval;

  // Check 200th milestone first (includes ding)
  if (currentFlash > lastFlash && currentFlash > 0) {
    lastFlash = currentFlash;
    lastDing = currentDing; // prevent double ding
    sound.playDing(true);
    if (window.speedLinesBurst) {
      window.speedLinesBurst();
    }
  }
  // Check 50th milestone (ding only)
  else if (currentDing > lastDing && currentDing > 0) {
    lastDing = currentDing;
    sound.playDing(false);
  }
}

// Initialize counter display
roller.update(transactionCount);

// Start mock feed
const feed = new MockFeed(CONFIG.tps);
feed.onTransaction((count) => {
  transactionCount += count;
  roller.update(transactionCount);
  checkMilestones(transactionCount);

  // Add to transaction log (not every tx - throttle to ~10 per second for readability)
  if (transactionCount % 5 === 0) {
    txLog.addTransaction(mockTxData());
  }
});

// Start on overlay click (enables Web Audio)
const overlay = document.getElementById('start-overlay');
if (overlay) {
  overlay.addEventListener('click', () => {
    sound.init();
    feed.start();
    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 500);
  });
} else {
  setTimeout(() => feed.start(), 500);
}
```

**Step 2: Commit**
```bash
git add app.js
git commit -m "feat: add transaction log, casino ding, tiered milestones, remove glitch"
```

---

### Task 4: Clean Up Unused CSS

**Files:**
- Modify: `style.css`

**Step 1: Remove old glitch CSS that is no longer used**

Remove the entire glitch effect section (.counter.glitching, glitchText, glitchClipTop, glitchClipBottom keyframes). Keep the bloom flash since it could still be useful.

**Step 2: Commit**
```bash
git add style.css
git commit -m "chore: remove unused glitch CSS animations"
```

---

### Task 5: Visual Verification + Polish

**Step 1: Open http://localhost:8080 and verify:**
- Click overlay dismisses, counter starts
- Transaction log appears below counter with typewriter animation
- Casino ding plays every 50th tx
- Screen flash + speed lines fire every 200th tx with louder ding
- Responsive at mobile width (375px)
- No console errors

**Step 2: Fix any issues found**

**Step 3: Commit any fixes**
```bash
git add -A
git commit -m "fix: polish v2 visual issues"
```
