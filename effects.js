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
