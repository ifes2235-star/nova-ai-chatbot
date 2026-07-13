/* =========================================================
   NOVA AI — particles.js
   Lightweight canvas particle network for ambient atmosphere.
   Respects prefers-reduced-motion and pauses off-screen.
========================================================= */

const NovaParticles = (() => {
  let canvas, ctx, particles = [], raf = null, running = false;
  const COLORS = ['rgba(108,92,231,', 'rgba(0,217,255,', 'rgba(255,108,171,'];

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function makeParticles() {
    const count = Math.min(60, Math.floor((window.innerWidth * window.innerHeight) / 28000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 0.6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
  }

  function step() {
    if (!running) return;
    const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.fillStyle = p.color + '0.8)';
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Connect nearby particles with faint lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 130) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(108,92,231,${0.12 * (1 - d / 130)})`;
          ctx.lineWidth = 1;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    makeParticles();
    running = true;
    step();
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  }

  function init() {
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // Respect accessibility preference — skip animation entirely.
    start();
    window.addEventListener('resize', () => { resize(); makeParticles(); });
    document.addEventListener('visibilitychange', () => {
      document.hidden ? stop() : start();
    });
  }

  return { init };
})();
