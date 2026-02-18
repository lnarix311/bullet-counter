# V2: Transaction Log + New Effects - Design

## Summary
Add a live transaction log below the counter with matrix-style typewriter animation. Replace the glitch explosion with a tiered milestone system: casino ding every 50th tx, screen flash + speed lines every 200th tx. Remove particle burst.

## Layout
- Transaction log container below taglines
- Shows latest ~8 transactions, oldest fade out
- Each row: `[tx hash]  [from] → [to]` (mock random hex)
- Typewriter animation: characters type in left-to-right ~5ms per char
- Container has overflow:hidden, no scrollbar

## Milestone System
| Trigger | Sound | Visual |
|---------|-------|--------|
| Every 50th tx | Casino ding (synthesized bell ~880Hz, 0.3s decay) | None |
| Every 200th tx | Casino ding (louder) | Screen flash + radial speed lines |

## Removed
- Old 100th-tx glitch explosion
- Particle burst system
- Glitch sound

## Screen Flash + Speed Lines (200th)
1. Flash (~150ms): full-screen white overlay at 50% opacity, fades to 0
2. Speed lines (~500ms): 12-16 radial lines from counter center, drawn on canvas, fade out

## Files Modified
- index.html: add #tx-log container
- style.css: tx log styles, typewriter animation, speed line flash, remove unused glitch CSS
- app.js: new milestone tiers, tx log manager, typewriter renderer, ding sound, mock tx generator
- effects.js: replace particle burst with speed lines + flash
