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
    lastDing = currentDing;
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
