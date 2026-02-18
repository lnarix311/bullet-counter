// === Configuration ===
const CONFIG = {
  startValue: 0,
  tps: 50,
  flashInterval: 200,
  maxLogRows: 8,
  typewriterSpeed: 5,
  latencyMin: 250,
  latencyMax: 500,
  latencyPoints: 100,
  latencyUpdateMs: 80,
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
    row.style.opacity = '0.6';
    row.style.transition = 'none';

    const interval = setInterval(() => {
      if (i < text.length) {
        row.textContent = text.slice(0, i + 1);
        i++;
      } else {
        clearInterval(interval);
        this._styleRow(row, text);
        row.classList.add('visible');
      }
    }, this.typewriterSpeed);
  }

  _styleRow(row, text) {
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

// === Chain Race ===
class ChainRace {
  constructor(container) {
    this.container = container;
    this.lanes = Array.from(container.querySelectorAll('.race-lane'));
    this.running = false;
    this.raceDuration = 8000; // max race time in ms (Eth capped here)
    this.holdDuration = 3500; // hold final state before reset
    this.chains = [
      { name: 'bullet', latency: 0.375 },
      { name: 'solana', latency: 150 },
      { name: 'arbitrum', latency: 250 },
      { name: 'eth', latency: 12000 },
    ];
  }

  start() {
    this.running = true;
    this._startRace();
  }

  stop() {
    this.running = false;
  }

  _startRace() {
    if (!this.running) return;

    // Reset all dots and labels
    this.lanes.forEach(lane => {
      const dot = lane.querySelector('.race-dot');
      const done = lane.querySelector('.race-done');
      const ms = lane.querySelector('.race-ms');
      const trail = lane.querySelector('.race-trail');
      dot.style.transition = 'none';
      dot.style.left = '0%';
      done.classList.remove('visible');
      ms.classList.remove('highlight');
      if (trail) {
        trail.style.transition = 'none';
        trail.style.width = '0';
        trail.style.opacity = '0';
      }
    });

    // Force reflow
    void this.container.offsetWidth;

    // Start each chain's animation
    const maxLatency = Math.min(Math.max(...this.chains.map(c => c.latency)), this.raceDuration);

    this.chains.forEach(chain => {
      const lane = this.container.querySelector(`[data-chain="${chain.name}"]`);
      const dot = lane.querySelector('.race-dot');
      const done = lane.querySelector('.race-done');
      const ms = lane.querySelector('.race-ms');
      const trail = lane.querySelector('.race-trail');

      // Scale duration: bullet = ~50ms, eth = raceDuration
      // Use log scale so the differences are visible but not too extreme
      let duration;
      if (chain.latency < 1) {
        duration = 50; // Bullet: nearly instant
      } else {
        // Map latency logarithmically to 0.5s - raceDuration
        const logMin = Math.log(1);
        const logMax = Math.log(12000);
        const logVal = Math.log(chain.latency);
        const t = (logVal - logMin) / (logMax - logMin);
        duration = 500 + t * (this.raceDuration - 500);
      }

      // Animate the dot
      requestAnimationFrame(() => {
        dot.style.transition = `left ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
        dot.style.left = '100%';

        // Bullet trail effect
        if (trail) {
          trail.style.transition = `width ${duration * 0.8}ms ease-out, opacity ${duration}ms ease-out`;
          trail.style.width = '100%';
          trail.style.opacity = '0.6';
          // Fade trail after arrival
          setTimeout(() => {
            trail.style.transition = 'opacity 0.5s ease';
            trail.style.opacity = '0';
          }, duration + 100);
        }

        // Show DONE and highlight ms when finished
        setTimeout(() => {
          done.classList.add('visible');
          ms.classList.add('highlight');
        }, duration);
      });
    });

    // After hold period, restart
    const totalCycle = this.raceDuration + this.holdDuration;
    setTimeout(() => {
      if (this.running) this._startRace();
    }, totalCycle);
  }
}

// === Latency Graph ===
class LatencyGraph {
  constructor(canvas, valueEl, { min, max, points, updateMs }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.valueEl = valueEl;
    this.min = min;
    this.max = max;
    this.maxPoints = points;
    this.updateMs = updateMs;
    this.data = [];
    this.current = (min + max) / 2;
    this.target = this.current;
    this.animId = null;
    this.running = false;
    this.hue = 180; // start at cyan

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = rect.height * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    this.w = rect.width;
    this.h = rect.height;
  }

  start() {
    this.running = true;
    this._tick();
    this._draw();
  }

  stop() {
    this.running = false;
  }

  _tick() {
    if (!this.running) return;

    // Smooth random walk toward target
    if (Math.random() < 0.15) {
      this.target = this.min + Math.random() * (this.max - this.min);
    }
    this.current += (this.target - this.current) * 0.15;
    // Add small noise
    this.current += (Math.random() - 0.5) * 15;
    this.current = Math.max(this.min, Math.min(this.max, this.current));

    this.data.push(this.current);
    if (this.data.length > this.maxPoints) {
      this.data.shift();
    }

    // Update display value
    this.valueEl.textContent = `${Math.round(this.current)}μs`;

    setTimeout(() => this._tick(), this.updateMs);
  }

  _draw() {
    if (!this.running && this.data.length === 0) return;

    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const pad = 2;
    const drawH = h - pad * 2;
    const drawW = w - pad * 2;

    ctx.clearRect(0, 0, w, h);

    if (this.data.length < 2) {
      requestAnimationFrame(() => this._draw());
      return;
    }

    // Advance hue (~1 degree per frame for smooth rainbow cycling)
    this.hue = (this.hue + 0.8) % 360;
    const hue = this.hue;
    const lineColor = `hsl(${hue}, 100%, 60%)`;
    const glowColor = `hsla(${hue}, 100%, 60%, 0.6)`;
    const fillTop = `hsla(${hue}, 100%, 60%, 0.15)`;
    const fillBot = `hsla(${hue}, 100%, 60%, 0.01)`;
    const guideColor = `hsla(${hue}, 100%, 60%, 0.1)`;

    // Update the value readout color to match
    this.valueEl.style.color = lineColor;
    this.valueEl.style.textShadow = `0 0 8px ${glowColor}`;

    // Draw guide lines (dashed, dim)
    ctx.strokeStyle = guideColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad + drawW, pad);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad, pad + drawH);
    ctx.lineTo(pad + drawW, pad + drawH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad, pad + drawH / 2);
    ctx.lineTo(pad + drawW, pad + drawH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw the line as rainbow segments
    const stepX = drawW / (this.maxPoints - 1);
    const offset = this.maxPoints - this.data.length;

    // Calculate all points first
    const pts = [];
    for (let i = 0; i < this.data.length; i++) {
      const x = pad + (offset + i) * stepX;
      const normalized = (this.data[i] - this.min) / (this.max - this.min);
      const y = pad + drawH - normalized * drawH;
      pts.push({ x, y });
    }

    // Draw each segment with its own hue
    ctx.lineWidth = 2;
    for (let i = 1; i < pts.length; i++) {
      const segHue = (hue + (i / pts.length) * 360) % 360;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = `hsl(${segHue}, 100%, 60%)`;
      ctx.shadowColor = `hsla(${segHue}, 100%, 60%, 0.5)`;
      ctx.shadowBlur = 6;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Fill under the line with gradient matching current hue
    if (pts.length > 1) {
      const lastPt = pts[pts.length - 1];
      const firstPt = pts[0];

      ctx.beginPath();
      ctx.moveTo(firstPt.x, firstPt.y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.lineTo(lastPt.x, pad + drawH);
      ctx.lineTo(firstPt.x, pad + drawH);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, fillTop);
      gradient.addColorStop(1, fillBot);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Dot on the latest point
      ctx.beginPath();
      ctx.arc(lastPt.x, lastPt.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    requestAnimationFrame(() => this._draw());
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

  // Jackpot cascade: rapid burst of pitched chimes like a slot machine payout
  playJackpot() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Metallic click opener
    const clickLen = 0.03;
    const clickBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * clickLen, this.ctx.sampleRate);
    const clickData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickData.length; i++) {
      clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (clickData.length * 0.2));
    }
    const clickSrc = this.ctx.createBufferSource();
    clickSrc.buffer = clickBuf;
    const clickHp = this.ctx.createBiquadFilter();
    clickHp.type = 'highpass';
    clickHp.frequency.value = 4000;
    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.25, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + clickLen);
    clickSrc.connect(clickHp);
    clickHp.connect(clickGain);
    clickGain.connect(this.ctx.destination);
    clickSrc.start(now);
    clickSrc.stop(now + clickLen);

    // Then cascade 8 chimes at ascending pitches
    const baseFreqs = [1760, 2093, 2349, 2637, 2793, 3136, 3520, 3951];
    const spacing = 0.06; // 60ms between each chime

    baseFreqs.forEach((freq, i) => {
      const t = now + 0.08 + (i * spacing); // start after the click
      const dur = 0.2 + (i * 0.02); // later chimes ring slightly longer

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + dur);

      const gain = this.ctx.createGain();
      const vol = 0.08 + (i * 0.015); // crescendo
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur);

      // Add shimmer overtone on every other chime
      if (i % 2 === 0) {
        const shimmer = this.ctx.createOscillator();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(freq * 2, t);
        shimmer.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur * 0.5);

        const shimGain = this.ctx.createGain();
        shimGain.gain.setValueAtTime(vol * 0.2, t);
        shimGain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.5);

        shimmer.connect(shimGain);
        shimGain.connect(this.ctx.destination);
        shimmer.start(t);
        shimmer.stop(t + dur * 0.5);
      }
    });

    // Final bright ring to cap it off
    const finalT = now + 0.08 + (baseFreqs.length * spacing) + 0.05;
    const finalOsc = this.ctx.createOscillator();
    finalOsc.type = 'sine';
    finalOsc.frequency.setValueAtTime(4186, finalT); // C8
    finalOsc.frequency.exponentialRampToValueAtTime(3520, finalT + 0.4);

    const finalGain = this.ctx.createGain();
    finalGain.gain.setValueAtTime(0.18, finalT);
    finalGain.gain.exponentialRampToValueAtTime(0.001, finalT + 0.4);

    finalOsc.connect(finalGain);
    finalGain.connect(this.ctx.destination);
    finalOsc.start(finalT);
    finalOsc.stop(finalT + 0.4);
  }
}

// === App Init ===
const digitContainer = document.getElementById('digit-container');
const counterEl = document.getElementById('counter');
const txLogEl = document.getElementById('tx-log');
const latencyCanvas = document.getElementById('latency-canvas');
const latencyValueEl = document.getElementById('latency-value');
const roller = new DigitRoller(digitContainer);
const sound = new SoundManager();
const txLog = new TxLogManager(txLogEl, CONFIG.maxLogRows, CONFIG.typewriterSpeed);
const latencyGraph = new LatencyGraph(latencyCanvas, latencyValueEl, {
  min: CONFIG.latencyMin,
  max: CONFIG.latencyMax,
  points: CONFIG.latencyPoints,
  updateMs: CONFIG.latencyUpdateMs,
});
const raceTracksEl = document.getElementById('race-tracks');
const chainRace = new ChainRace(raceTracksEl);

let transactionCount = CONFIG.startValue;
let lastFlash = 0;

function checkMilestones(value) {
  const currentFlash = Math.floor(value / CONFIG.flashInterval) * CONFIG.flashInterval;

  if (currentFlash > lastFlash && currentFlash > 0) {
    lastFlash = currentFlash;
    sound.playJackpot();
    if (window.speedLinesBurst) {
      window.speedLinesBurst();
    }
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

  // Add to transaction log (throttle to ~10 per second for readability)
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
    latencyGraph.start();
    chainRace.start();
    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 500);
  });
} else {
  setTimeout(() => { feed.start(); latencyGraph.start(); chainRace.start(); }, 500);
}
