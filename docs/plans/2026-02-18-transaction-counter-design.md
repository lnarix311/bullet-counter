# Bullet Transaction Counter - Design

## Purpose
Single-page showcase website displaying a live transaction counter for Bullet exchange. Designed to impress visitors with how fast transactions are processed (sub-1ms latency). Cyberpunk/futuristic aesthetic.

## Architecture
Vanilla HTML/CSS/JS. No build tools, no frameworks. Single folder, deploy anywhere.

### File Structure
```
bullet-counter/
  index.html        — markup + critical structure
  style.css         — cyberpunk theme, animations, responsive layout
  app.js            — counter logic, milestone detection, data feed interface
  effects.js        — glitch animation, canvas particle burst
  sounds/
    glitch.mp3      — digital glitch sound for milestones
  assets/
    bullet-logo.svg — Bullet wordmark (user-provided)
```

## Visual Design
- Background: dark (#0a0a0f) with subtle animated grid/scanlines
- Counter: large monospace font (JetBrains Mono), neon cyan glow, center screen
- Digits roll individually (slot-machine style) for smooth animation
- Number formatted with commas (e.g. 1,247,893)
- Bullet logo above counter, "transactions processed" + "sub-1ms latency" below
- CRT scanline overlay for cyberpunk feel

## Counter Behavior
- Configurable TPS (default 50), configurable start value (default 0)
- Uses requestAnimationFrame for smooth visual updates
- DataFeed interface: MockFeed class now, swap in WebSocketFeed/BlockchainFeed later

## Milestone Effect (every 100 transactions)
1. Glitch phase (~300ms): RGB channel shift, skew, flicker via CSS
2. Shatter phase (~200ms): Number fragments scatter as canvas particles
3. Reform phase (~300ms): Particles snap back, brightness bloom
4. Sound: short digital glitch/distortion (~0.5s) via Web Audio API
- Total: ~800ms

## Responsive Design
- Desktop: counter ~60% viewport width
- Tablet: proportional scale-down
- Mobile: counter ~90% width, smaller logo/tagline
- CSS clamp() and media queries, no layout shifts

## Data Feed Interface
```js
class DataFeed {
  onTransaction(callback) {}
  start() {}
  stop() {}
}
```
MockFeed generates transactions at configurable rate. Real feed plugs in later.
