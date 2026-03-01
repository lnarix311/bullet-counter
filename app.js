// === Configuration ===
const CONFIG = {
  flashInterval: 250,
  maxLogRows: 8,
  typewriterSpeed: 5,
  latencyMin: 5,
  latencyMax: 15,
  latencyPoints: 100,
  latencyUpdateMs: 80,
  rpcUrl: 'https://mainnet.megaeth.com/rpc',
  blockscoutApi: 'https://megaeth.blockscout.com/api/v2',
  blockscoutUrl: 'https://megaeth.blockscout.com',
  wsUrl: 'wss://megaeth.drpc.org',
  pollIntervalMs: 2000,
  statsPollMs: 10000,
};

// === Live Data Feed ===
class LiveFeed {
  constructor() {
    this.ws = null;
    this.onTxCount = null;
    this.onNewTx = null;
    this.onBlockTime = null;
    this.onStats = null;
    this.totalTx = 0;
    this.lastBlockNumber = null;
    this.lastBlockTimestamp = null;
    this.connected = false;
    this.pollTimer = null;
    this.statsPollTimer = null;
  }

  async init() {
    // Fetch initial stats from Blockscout
    try {
      const res = await fetch(`${CONFIG.blockscoutApi}/stats`);
      const data = await res.json();
      this.totalTx = parseInt(data.total_transactions) || 0;

      if (this.onStats) {
        this.onStats({
          totalBlocks: data.total_blocks,
          totalAddresses: data.total_addresses,
          txToday: data.transactions_today,
        });
      }
    } catch (e) {
      console.warn('Blockscout stats fetch failed, using fallback:', e);
      this.totalTx = 0;
    }

    return this.totalTx;
  }

  start() {
    this._connectWs();
    this._pollStats();
  }

  stop() {
    if (this.ws) this.ws.close();
    clearInterval(this.pollTimer);
    clearInterval(this.statsPollTimer);
  }

  _connectWs() {
    try {
      this.ws = new WebSocket(CONFIG.wsUrl);

      this.ws.onopen = () => {
        // Subscribe to new block headers
        this.ws.send(JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_subscribe',
          params: ['newHeads'],
          id: 1,
        }));
        this.connected = true;
        this._updateBadge(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.params && data.params.result) {
            this._handleNewHead(data.params.result);
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      this.ws.onerror = () => {
        console.warn('WebSocket error, falling back to polling');
        this._fallbackToPolling();
      };

      this.ws.onclose = () => {
        this.connected = false;
        this._updateBadge(false);
        // Reconnect after 5s
        setTimeout(() => {
          if (!this.pollTimer) this._connectWs();
        }, 5000);
      };
    } catch (e) {
      this._fallbackToPolling();
    }
  }

  _fallbackToPolling() {
    if (this.pollTimer) return;
    this._updateBadge(true);
    this.pollTimer = setInterval(() => this._pollLatestBlock(), CONFIG.pollIntervalMs);
    this._pollLatestBlock();
  }

  async _pollLatestBlock() {
    try {
      const res = await fetch(CONFIG.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: ['latest', true],
          id: 1,
        }),
      });
      const data = await res.json();
      if (data.result) {
        this._processBlock(data.result);
      }
    } catch (e) {
      // silent fail, will retry on next poll
    }
  }

  _handleNewHead(head) {
    // Fetch full block with transactions
    const blockNum = head.number;
    fetch(CONFIG.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: [blockNum, true],
        id: 2,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.result) this._processBlock(data.result);
      })
      .catch(() => {});
  }

  _processBlock(block) {
    const blockNum = parseInt(block.number, 16);
    const timestamp = parseInt(block.timestamp, 16);
    const txCount = block.transactions ? block.transactions.length : 0;

    // Skip if we already processed this block
    if (this.lastBlockNumber && blockNum <= this.lastBlockNumber) return;

    // Calculate block time
    if (this.lastBlockTimestamp && this.onBlockTime) {
      const blockTimeMs = (timestamp - this.lastBlockTimestamp) * 1000;
      if (blockTimeMs > 0 && blockTimeMs < 30000) {
        this.onBlockTime(blockTimeMs);
      }
    }

    this.lastBlockNumber = blockNum;
    this.lastBlockTimestamp = timestamp;

    // Increment counter
    if (txCount > 0) {
      this.totalTx += txCount;
      if (this.onTxCount) this.onTxCount(this.totalTx);
    }

    // Feed real transactions to log
    if (block.transactions && this.onNewTx) {
      // Show up to 3 transactions per block for readability
      const txs = block.transactions.slice(0, 3);
      txs.forEach(tx => {
        if (typeof tx === 'object') {
          this.onNewTx({
            hash: tx.hash,
            from: tx.from,
            to: tx.to || '(contract)',
          });
        }
      });
    }
  }

  async _pollStats() {
    const poll = async () => {
      try {
        const res = await fetch(`${CONFIG.blockscoutApi}/stats`);
        const data = await res.json();
        const newTotal = parseInt(data.total_transactions) || 0;

        // Sync counter if Blockscout total is ahead
        if (newTotal > this.totalTx) {
          this.totalTx = newTotal;
          if (this.onTxCount) this.onTxCount(this.totalTx);
        }

        if (this.onStats) {
          this.onStats({
            totalBlocks: data.total_blocks,
            totalAddresses: data.total_addresses,
            txToday: data.transactions_today,
          });
        }
      } catch (e) {
        // silent fail
      }
    };

    this.statsPollTimer = setInterval(poll, CONFIG.statsPollMs);
  }

  _updateBadge(connected) {
    const badge = document.getElementById('live-badge');
    const text = badge?.querySelector('.live-text');
    if (badge && text) {
      if (connected) {
        badge.classList.add('connected');
        text.textContent = 'LIVE';
      } else {
        badge.classList.remove('connected');
        text.textContent = 'CONNECTING';
      }
    }
  }
}

// === Mock Feed (fallback if all real connections fail) ===
class MockFeed {
  constructor(tps) {
    this.tps = tps;
    this.onTxCount = null;
    this.onNewTx = null;
    this.interval = null;
    this.totalTx = 0;
  }

  async init() {
    this.totalTx = 277000000 + Math.floor(Math.random() * 1000000);
    return this.totalTx;
  }

  start() {
    const msPerTx = 1000 / this.tps;
    this.interval = setInterval(() => {
      this.totalTx += 1;
      if (this.onTxCount) this.onTxCount(this.totalTx);
      if (this.totalTx % 5 === 0 && this.onNewTx) {
        this.onNewTx(mockTxData());
      }
    }, msPerTx);
  }

  stop() { clearInterval(this.interval); }
  _updateBadge() {}
}

// === Helper: shorten hex addresses ===
function shortAddr(addr) {
  if (!addr || addr.length < 10) return addr || '??';
  return addr.slice(0, 6) + '..' + addr.slice(-4);
}

function shortHash(hash) {
  if (!hash || hash.length < 10) return hash || '??';
  return hash.slice(0, 10);
}

// === Mock TX Data (fallback) ===
function randomHex(len) {
  const chars = '0123456789abcdef';
  let s = '0x';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

function mockTxData() {
  return { hash: randomHex(32), from: randomHex(20), to: randomHex(20) };
}

// === Format large numbers ===
function formatCompact(n) {
  if (typeof n === 'string') n = parseInt(n);
  if (isNaN(n)) return '--';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
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
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
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
      if (char !== ',' && slot && slot.type === 'digit') {
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
    const hash = shortHash(tx.hash);
    const from = shortAddr(tx.from);
    const to = shortAddr(tx.to);
    const text = `${hash}  ${from} → ${to}`;
    const row = document.createElement('div');
    row.className = 'tx-row';

    this.container.prepend(row);
    this.rows.unshift(row);

    this._typewrite(row, text, tx);

    while (this.rows.length > this.maxRows) {
      const old = this.rows.pop();
      old.classList.add('fading');
      setTimeout(() => old.remove(), 500);
    }
  }

  _typewrite(row, text, tx) {
    let i = 0;
    row.style.opacity = '0.6';
    row.style.transition = 'none';

    const interval = setInterval(() => {
      if (i < text.length) {
        row.textContent = text.slice(0, i + 1);
        i++;
      } else {
        clearInterval(interval);
        this._styleRow(row, tx);
        row.classList.add('visible');
      }
    }, this.typewriterSpeed);
  }

  _styleRow(row, tx) {
    while (row.firstChild) {
      row.removeChild(row.firstChild);
    }
    row.style.opacity = '';
    row.style.transition = '';

    const hashLink = document.createElement('a');
    hashLink.className = 'tx-hash';
    hashLink.textContent = shortHash(tx.hash);
    hashLink.href = `${CONFIG.blockscoutUrl}/tx/${tx.hash}`;
    hashLink.target = '_blank';
    hashLink.rel = 'noopener';
    row.appendChild(hashLink);

    row.appendChild(document.createTextNode('  '));

    const fromSpan = document.createElement('span');
    fromSpan.className = 'tx-from';
    fromSpan.textContent = shortAddr(tx.from);
    row.appendChild(fromSpan);

    const arrow = document.createElement('span');
    arrow.className = 'tx-arrow';
    arrow.textContent = '→';
    row.appendChild(arrow);

    const toSpan = document.createElement('span');
    toSpan.className = 'tx-to';
    toSpan.textContent = shortAddr(tx.to);
    row.appendChild(toSpan);
  }
}

// === Chain Race ===
class ChainRace {
  constructor(container, countdownEl) {
    this.container = container;
    this.countdownEl = countdownEl;
    this.lanes = Array.from(container.querySelectorAll('.race-lane'));
    this.running = false;
    this.raceDuration = 8000;
    this.holdDuration = 3000;
    this.countdownSecs = 3;
    this.chains = [
      { name: 'megaeth', latency: 10 },
      { name: 'solana', latency: 400 },
      { name: 'arbitrum', latency: 250 },
      { name: 'eth', latency: 12000 },
    ];
  }

  start() {
    this.running = true;
    setTimeout(() => this._startRace(), 1000);
  }

  stop() { this.running = false; }

  _startRace() {
    if (!this.running) return;
    this.countdownEl.textContent = 'racing...';

    // Reset rabbit
    const rabbit = document.getElementById('race-rabbit');
    if (rabbit) {
      rabbit.classList.remove('arrived', 'look-back', 'idle');
      rabbit.style.opacity = '0';
    }

    this.lanes.forEach(lane => {
      const dot = lane.querySelector('.race-dot');
      const done = lane.querySelector('.race-done');
      const ms = lane.querySelector('.race-ms');
      const trail = lane.querySelector('.race-trail');
      dot.style.transition = 'none';
      dot.style.left = '0%';
      dot.classList.remove('burst');
      done.classList.remove('visible');
      ms.classList.remove('highlight');
      if (trail) {
        trail.style.transition = 'none';
        trail.style.width = '0';
        trail.style.opacity = '0';
      }
    });

    void this.container.offsetWidth;
    let slowestDuration = 0;

    this.chains.forEach(chain => {
      const lane = this.container.querySelector(`[data-chain="${chain.name}"]`);
      const dot = lane.querySelector('.race-dot');
      const done = lane.querySelector('.race-done');
      const ms = lane.querySelector('.race-ms');
      const trail = lane.querySelector('.race-trail');

      let duration;
      if (chain.latency <= 10) {
        duration = 400;
      } else {
        const logMin = Math.log(10);
        const logMax = Math.log(12000);
        const logVal = Math.log(chain.latency);
        const t = (logVal - logMin) / (logMax - logMin);
        duration = 800 + t * (this.raceDuration - 800);
      }

      if (duration > slowestDuration) slowestDuration = duration;

      requestAnimationFrame(() => {
        const easing = chain.latency <= 10
          ? 'cubic-bezier(0.1, 0, 0.2, 1)'
          : 'cubic-bezier(0.25, 0.1, 0.25, 1)';
        dot.style.transition = `left ${duration}ms ${easing}`;
        dot.style.left = '100%';

        if (trail) {
          trail.style.transition = `width ${duration * 0.6}ms ease-out, opacity ${duration * 0.5}ms ease-out`;
          trail.style.width = '100%';
          trail.style.opacity = '0.8';
          setTimeout(() => {
            trail.style.transition = 'opacity 1.5s ease';
            trail.style.opacity = '0';
          }, duration + 300);
        }

        setTimeout(() => {
          done.classList.add('visible');
          ms.classList.add('highlight');
          if (chain.latency <= 10) {
            dot.classList.add('burst');
            setTimeout(() => dot.classList.remove('burst'), 600);

            // Rabbit animation: arrive, then look back at slower chains
            const rabbit = document.getElementById('race-rabbit');
            if (rabbit) {
              rabbit.style.opacity = '1';
              rabbit.classList.add('arrived');

              // After arriving, look back at the others
              setTimeout(() => {
                rabbit.classList.remove('arrived');
                rabbit.classList.add('look-back');

                // Then idle bob while waiting
                setTimeout(() => {
                  rabbit.classList.remove('look-back');
                  rabbit.classList.add('idle');
                }, 600);
              }, 500);
            }
          }
        }, duration);
      });
    });

    setTimeout(() => {
      if (!this.running) return;
      this._countdown(this.countdownSecs);
    }, slowestDuration + this.holdDuration);
  }

  _countdown(secs) {
    if (!this.running || secs <= 0) {
      if (this.running) this._startRace();
      return;
    }
    this.countdownEl.textContent = `next race in ${secs}...`;
    setTimeout(() => this._countdown(secs - 1), 1000);
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
    this.running = false;
    this.hue = 340;

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

  stop() { this.running = false; }

  // Push a real block time measurement
  pushReal(ms) {
    const clamped = Math.max(this.min, Math.min(this.max, ms));
    this.current = clamped;
    this.target = clamped;
  }

  _tick() {
    if (!this.running) return;

    if (Math.random() < 0.15) {
      this.target = this.min + Math.random() * (this.max - this.min);
    }
    this.current += (this.target - this.current) * 0.15;
    this.current += (Math.random() - 0.5) * 0.8;
    this.current = Math.max(this.min, Math.min(this.max, this.current));

    this.data.push(this.current);
    if (this.data.length > this.maxPoints) this.data.shift();

    this.valueEl.textContent = `${this.current.toFixed(1)}ms`;
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

    // Cycle through MegaETH brand hues
    this.hue = (this.hue + 0.5) % 360;
    const hue = this.hue;
    const lineColor = `hsl(${hue}, 80%, 70%)`;
    const glowColor = `hsla(${hue}, 80%, 70%, 0.6)`;
    const fillTop = `hsla(${hue}, 80%, 70%, 0.15)`;
    const fillBot = `hsla(${hue}, 80%, 70%, 0.01)`;
    const guideColor = `hsla(${hue}, 80%, 70%, 0.1)`;

    this.valueEl.style.color = lineColor;
    this.valueEl.style.textShadow = `0 0 8px ${glowColor}`;

    ctx.strokeStyle = guideColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    [0, 0.5, 1].forEach(frac => {
      ctx.beginPath();
      ctx.moveTo(pad, pad + drawH * frac);
      ctx.lineTo(pad + drawW, pad + drawH * frac);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    const stepX = drawW / (this.maxPoints - 1);
    const offset = this.maxPoints - this.data.length;

    const pts = [];
    for (let i = 0; i < this.data.length; i++) {
      const x = pad + (offset + i) * stepX;
      const normalized = (this.data[i] - this.min) / (this.max - this.min);
      const y = pad + drawH - normalized * drawH;
      pts.push({ x, y });
    }

    ctx.lineWidth = 2;
    for (let i = 1; i < pts.length; i++) {
      const segHue = (hue + (i / pts.length) * 360) % 360;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = `hsl(${segHue}, 80%, 70%)`;
      ctx.shadowColor = `hsla(${segHue}, 80%, 70%, 0.5)`;
      ctx.shadowBlur = 6;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    if (pts.length > 1) {
      const lastPt = pts[pts.length - 1];
      const firstPt = pts[0];

      ctx.beginPath();
      ctx.moveTo(firstPt.x, firstPt.y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.lineTo(lastPt.x, pad + drawH);
      ctx.lineTo(firstPt.x, pad + drawH);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, fillTop);
      gradient.addColorStop(1, fillBot);
      ctx.fillStyle = gradient;
      ctx.fill();

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

  playJackpot() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

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

    const baseFreqs = [1760, 2093, 2349, 2637, 2793, 3136, 3520, 3951];
    const spacing = 0.06;

    baseFreqs.forEach((freq, i) => {
      const t = now + 0.08 + (i * spacing);
      const dur = 0.2 + (i * 0.02);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + dur);

      const gain = this.ctx.createGain();
      const vol = 0.08 + (i * 0.015);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur);

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

    const finalT = now + 0.08 + (baseFreqs.length * spacing) + 0.05;
    const finalOsc = this.ctx.createOscillator();
    finalOsc.type = 'sine';
    finalOsc.frequency.setValueAtTime(4186, finalT);
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

// === Stats Display ===
function updateStats(stats) {
  const blocksEl = document.getElementById('stat-blocks');
  const addrsEl = document.getElementById('stat-addresses');
  const tpsEl = document.getElementById('stat-tps');

  if (blocksEl) blocksEl.textContent = formatCompact(stats.totalBlocks);
  if (addrsEl) addrsEl.textContent = formatCompact(stats.totalAddresses);
  if (tpsEl) {
    const txToday = parseInt(stats.txToday) || 0;
    // Estimate average TPS from today's transactions
    const now = new Date();
    const secondsToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const avgTps = secondsToday > 0 ? Math.round(txToday / secondsToday) : 0;
    tpsEl.textContent = avgTps > 0 ? avgTps.toLocaleString() : '--';
  }
}

// === App Init ===
const digitContainer = document.getElementById('digit-container');
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
const raceCountdownEl = document.getElementById('race-countdown');
const chainRace = new ChainRace(raceTracksEl, raceCountdownEl);

const feed = new LiveFeed();
const sessionCounterEl = document.getElementById('session-counter');

let lastFlash = 0;
let sessionStartTotal = 0;
let sessionTxCount = 0;

function checkMilestones(value) {
  const currentFlash = Math.floor(value / CONFIG.flashInterval) * CONFIG.flashInterval;
  if (currentFlash > lastFlash && currentFlash > 0) {
    lastFlash = currentFlash;
    sound.playJackpot();
    if (window.speedLinesBurst) window.speedLinesBurst();
  }
}

// Wire up feed callbacks
feed.onTxCount = (total) => {
  roller.update(total);
  checkMilestones(total);

  // Update session counter
  if (sessionStartTotal > 0) {
    sessionTxCount = total - sessionStartTotal;
    if (sessionCounterEl) {
      sessionCounterEl.textContent = sessionTxCount.toLocaleString();
    }
  }
};

feed.onNewTx = (tx) => {
  txLog.addTransaction(tx);
};

feed.onBlockTime = (ms) => {
  latencyGraph.pushReal(ms);
};

feed.onStats = (stats) => {
  updateStats(stats);
};

// Start on overlay click
const overlay = document.getElementById('start-overlay');
if (overlay) {
  overlay.addEventListener('click', async () => {
    sound.init();

    // Initialize with real data
    const initialTotal = await feed.init();
    sessionStartTotal = initialTotal;
    roller.update(initialTotal);
    lastFlash = Math.floor(initialTotal / CONFIG.flashInterval) * CONFIG.flashInterval;

    feed.start();
    latencyGraph.start();
    chainRace.start();

    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 500);
  });
}
