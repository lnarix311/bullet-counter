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

// MegaETH full brand palette
const BRAND_COLORS = [
  { r: 255, g: 138, b: 168 }, // hot pink #FF8AA8
  { r: 245, g: 175, b: 148 }, // coral #F5AF94
  { r: 245, g: 148, b: 157 }, // pink #F5949D
  { r: 247, g: 134, b: 198 }, // magenta #F786C6
  { r: 144, g: 215, b: 159 }, // mint #90D79F
  { r: 109, g: 208, b: 169 }, // teal #6DD0A9
  { r: 126, g: 170, b: 212 }, // sky blue #7EAAD4
  { r: 112, g: 186, b: 210 }, // light blue #70BAD2
  { r: 236, g: 232, b: 232 }, // moon white #ECE8E8
];

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
    this.color = BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)];
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
    void flash.offsetWidth;
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
