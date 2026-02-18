// === Configuration ===
const CONFIG = {
  startValue: 0,
  tps: 50,
  dingInterval: 50,
  flashInterval: 200,
  maxLogRows: 8,
  typewriterSpeed: 5,
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

  // Cash register ka-ching: metallic click + brief ring
  playKaChing() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Part 1: Metallic click (short noise burst through highpass)
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

    // Part 2: Metallic ring (two detuned sine waves for shimmer)
    const ringDur = 0.25;
    const ringStart = now + 0.02;

    const ring1 = this.ctx.createOscillator();
    ring1.type = 'sine';
    ring1.frequency.setValueAtTime(3520, ringStart); // A7
    ring1.frequency.exponentialRampToValueAtTime(2800, ringStart + ringDur);

    const ring1Gain = this.ctx.createGain();
    ring1Gain.gain.setValueAtTime(0.12, ringStart);
    ring1Gain.gain.exponentialRampToValueAtTime(0.001, ringStart + ringDur);

    ring1.connect(ring1Gain);
    ring1Gain.connect(this.ctx.destination);
    ring1.start(ringStart);
    ring1.stop(ringStart + ringDur);

    const ring2 = this.ctx.createOscillator();
    ring2.type = 'sine';
    ring2.frequency.setValueAtTime(3540, ringStart); // slightly detuned
    ring2.frequency.exponentialRampToValueAtTime(2820, ringStart + ringDur);

    const ring2Gain = this.ctx.createGain();
    ring2Gain.gain.setValueAtTime(0.08, ringStart);
    ring2Gain.gain.exponentialRampToValueAtTime(0.001, ringStart + ringDur);

    ring2.connect(ring2Gain);
    ring2Gain.connect(this.ctx.destination);
    ring2.start(ringStart);
    ring2.stop(ringStart + ringDur);
  }

  // Jackpot cascade: rapid burst of pitched chimes like a slot machine payout
  playJackpot() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Play the ka-ching first as the opener
    this.playKaChing();

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
    lastDing = currentDing;
    sound.playJackpot();
    if (window.speedLinesBurst) {
      window.speedLinesBurst();
    }
  }
  // Check 50th milestone (ding only)
  else if (currentDing > lastDing && currentDing > 0) {
    lastDing = currentDing;
    sound.playKaChing();
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
    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 500);
  });
} else {
  setTimeout(() => feed.start(), 500);
}
