(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const rand = (min, max) => min + Math.random() * (max - min);

  class Universe {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.time = 0;
      this.running = false;
      this.lastFrame = 0;
      this.frameRequest = 0;
      this.flowers = null;
      this.camera = {
        rotX: -0.12,
        rotY: 0.08,
        targetRotX: -0.12,
        targetRotY: 0.08,
        zoom: 1,
        targetZoom: 1
      };
      this.stars = [];
      this.dust = [];
      this.comets = [];
      this.bursts = [];
      this.nebulas = [];
      this.performance = { compact: false, starCount: 150, dustCount: 40 };
      this.resize = this.resize.bind(this);
      this.loop = this.loop.bind(this);
      window.addEventListener('resize', this.resize, { passive: true });
      this.resize();
    }

    attachFlowers(flowers) { this.flowers = flowers; }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, rect.width || window.innerWidth);
      this.height = Math.max(1, rect.height || window.innerHeight);
      this.performance.compact = Math.min(this.width, this.height) < 560;
      this.performance.starCount = this.performance.compact ? 95 : 190;
      this.performance.dustCount = this.performance.compact ? 24 : 54;
      this.dpr = Math.min(window.devicePixelRatio || 1, this.performance.compact ? 1.5 : 2);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.createField();
      if (this.flowers && typeof this.flowers.onResize === 'function') this.flowers.onResize();
    }

    createField() {
      this.stars = Array.from({ length: this.performance.starCount }, () => ({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: rand(.35, 1.45),
        a: rand(.16, .75),
        phase: rand(0, TAU),
        speed: rand(.35, 1.2),
        gold: Math.random() < .16
      }));
      this.dust = Array.from({ length: this.performance.dustCount }, () => ({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: rand(.6, 1.8),
        a: rand(.025, .14),
        drift: rand(2, 8),
        phase: rand(0, TAU)
      }));
      this.nebulas = [
        { x: .21, y: .28, r: .34, hue: '17, 45, 71', a: .065 },
        { x: .78, y: .66, r: .42, hue: '111, 77, 24', a: .04 },
        { x: .55, y: .18, r: .28, hue: '64, 44, 13', a: .05 }
      ];
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastFrame = performance.now();
      this.frameRequest = requestAnimationFrame(this.loop);
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.frameRequest);
    }

    destroy() {
      this.stop();
      window.removeEventListener('resize', this.resize);
    }

    setCameraRotation(rotX, rotY) {
      this.camera.targetRotX = Math.max(-.68, Math.min(.62, rotX));
      this.camera.targetRotY = rotY;
    }

    nudgeCamera(dx, dy) {
      this.setCameraRotation(this.camera.targetRotX + dy * .006, this.camera.targetRotY + dx * .006);
    }

    setZoom(value) {
      this.camera.targetZoom = Math.max(.68, Math.min(1.62, value));
    }

    nudgeZoom(delta) {
      this.setZoom(this.camera.targetZoom + delta);
    }

    focusCenter() {
      this.camera.targetRotX *= .25;
      this.camera.targetRotY *= .25;
      this.camera.targetZoom = 1.36;
    }

    releaseFocus() { this.camera.targetZoom = 1; }

    burst(x, y, intensity = 1) {
      const count = this.performance.compact ? 8 : 14;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * TAU;
        const speed = rand(18, 55) * intensity;
        this.bursts.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          size: rand(.8, 2.2)
        });
      }
      if (this.bursts.length > 90) this.bursts.splice(0, this.bursts.length - 90);
    }

    rotatePoint(x, y, z) {
      const cy = Math.cos(this.camera.rotY), sy = Math.sin(this.camera.rotY);
      let rx = x * cy + z * sy;
      let rz = -x * sy + z * cy;
      const cx = Math.cos(this.camera.rotX), sx = Math.sin(this.camera.rotX);
      const ry = y * cx - rz * sx;
      rz = y * sx + rz * cx;
      return { x: rx, y: ry, z: rz };
    }

    project(x, y, z) {
      const p = this.rotatePoint(x, y, z);
      const base = Math.min(this.width, this.height) / 760;
      const perspective = 900 / Math.max(460, 900 + p.z * .72);
      const scale = base * this.camera.zoom * perspective;
      return {
        x: this.width * .5 + p.x * scale,
        y: this.height * .5 + p.y * scale,
        z: p.z,
        scale,
        perspective,
        visible: perspective > .42 && perspective < 2.2
      };
    }

    loop(now) {
      if (!this.running) return;
      const dt = Math.min(.033, Math.max(.001, (now - this.lastFrame) / 1000));
      this.lastFrame = now;
      this.time += dt;
      this.camera.rotX += (this.camera.targetRotX - this.camera.rotX) * Math.min(1, dt * 5.5);
      this.camera.rotY += (this.camera.targetRotY - this.camera.rotY) * Math.min(1, dt * 5.5);
      this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * Math.min(1, dt * 4.5);
      this.render(dt);
      this.frameRequest = requestAnimationFrame(this.loop);
    }

    render(dt) {
      const ctx = this.ctx;
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = '#02050b';
      ctx.fillRect(0, 0, this.width, this.height);
      this.drawNebulas(ctx);
      this.drawStars(ctx);
      this.drawDust(ctx);
      this.drawComets(ctx, dt);
      this.drawOrbits(ctx);
      this.drawCore(ctx);
      if (this.flowers) this.flowers.updateAndDraw(ctx, this, dt, this.time);
      this.drawBursts(ctx, dt);
      ctx.restore();
    }

    drawNebulas(ctx) {
      const shiftX = Math.sin(this.time * .035) * 18;
      const shiftY = Math.cos(this.time * .028) * 12;
      for (const n of this.nebulas) {
        const x = this.width * n.x + shiftX;
        const y = this.height * n.y + shiftY;
        const r = Math.max(this.width, this.height) * n.r;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${n.hue},${n.a})`);
        g.addColorStop(.42, `rgba(${n.hue},${n.a * .32})`);
        g.addColorStop(1, `rgba(${n.hue},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.width, this.height);
      }
    }

    drawStars(ctx) {
      for (const s of this.stars) {
        const alpha = s.a * (.7 + Math.sin(this.time * s.speed + s.phase) * .3);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fillStyle = s.gold ? `rgba(255,225,139,${alpha})` : `rgba(226,238,255,${alpha})`;
        ctx.fill();
        if (s.r > 1.15 && alpha > .5) {
          ctx.fillStyle = `rgba(255,245,207,${alpha * .18})`;
          ctx.fillRect(s.x - 4, s.y - .25, 8, .5);
          ctx.fillRect(s.x - .25, s.y - 4, .5, 8);
        }
      }
    }

    drawDust(ctx) {
      for (const p of this.dust) {
        const y = (p.y + this.time * p.drift) % (this.height + 20) - 10;
        const x = p.x + Math.sin(this.time * .2 + p.phase) * 5;
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, TAU);
        ctx.fillStyle = `rgba(255,202,66,${p.a})`; ctx.fill();
      }
    }

    drawComets(ctx, dt) {
      if (this.comets.length < 2 && Math.random() < dt * .055) {
        this.comets.push({ x: rand(-80, this.width * .65), y: rand(20, this.height * .38), vx: rand(110, 190), vy: rand(45, 90), life: 1 });
      }
      for (let i = this.comets.length - 1; i >= 0; i--) {
        const c = this.comets[i];
        c.x += c.vx * dt; c.y += c.vy * dt; c.life -= dt * .28;
        const grad = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * .22, c.y - c.vy * .22);
        grad.addColorStop(0, `rgba(255,246,205,${Math.max(0,c.life) * .55})`);
        grad.addColorStop(1, 'rgba(255,199,45,0)');
        ctx.strokeStyle = grad; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x - c.vx * .22, c.y - c.vy * .22); ctx.stroke();
        if (c.life <= 0 || c.x > this.width + 120 || c.y > this.height + 80) this.comets.splice(i, 1);
      }
    }

    orbitPoint(radius, angle, tiltX, tiltZ) {
      let x = Math.cos(angle) * radius;
      let y = 0;
      let z = Math.sin(angle) * radius;
      const cx = Math.cos(tiltX), sx = Math.sin(tiltX);
      let y1 = y * cx - z * sx;
      let z1 = y * sx + z * cx;
      const cz = Math.cos(tiltZ), sz = Math.sin(tiltZ);
      const x2 = x * cz - y1 * sz;
      const y2 = x * sz + y1 * cz;
      return { x: x2, y: y2, z: z1 };
    }

    drawOrbits(ctx) {
      const orbits = this.flowers ? this.flowers.getOrbitSpecs() : [];
      ctx.save();
      ctx.lineWidth = .72;
      for (let o = 0; o < orbits.length; o++) {
        const spec = orbits[o];
        ctx.beginPath();
        for (let i = 0; i <= 96; i++) {
          const p3 = this.orbitPoint(spec.radius, i / 96 * TAU, spec.tiltX, spec.tiltZ);
          const p = this.project(p3.x, p3.y, p3.z);
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        const pulse = .55 + Math.sin(this.time * .3 + o) * .14;
        ctx.strokeStyle = `rgba(255,220,112,${.08 * pulse})`;
        ctx.shadowColor = 'rgba(255,204,64,.18)';
        ctx.shadowBlur = 5;
        ctx.stroke();
      }
      ctx.restore();
    }

    drawCore(ctx) {
      const c = this.project(0, 0, 0);
      const pulse = 1 + Math.sin(this.time * 1.15) * .035;
      const radius = Math.max(26, Math.min(52, Math.min(this.width, this.height) * .072)) * this.camera.zoom * pulse;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      let g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius * 2.5);
      g.addColorStop(0, 'rgba(255,252,214,.96)');
      g.addColorStop(.14, 'rgba(255,224,94,.9)');
      g.addColorStop(.35, 'rgba(255,173,27,.24)');
      g.addColorStop(1, 'rgba(255,169,24,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, radius * 2.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,233,145,${.13 + Math.sin(this.time*.8)*.03})`;
      ctx.lineWidth = .7;
      for (let i = 0; i < 3; i++) {
        const rr = radius * (1.45 + i * .38) + ((this.time * 9 + i * 17) % 16);
        ctx.globalAlpha = Math.max(0, .2 - ((this.time * 9 + i * 17) % 16) / 90);
        ctx.beginPath(); ctx.arc(c.x, c.y, rr, 0, TAU); ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 8;
      const small = Math.max(9, Math.min(12, this.width * .027));
      ctx.font = `500 ${small}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,.56)';
      ctx.fillText('Para mi niña 💛', c.x, c.y + radius + 29);
      ctx.font = `600 ${small * 1.55}px "Cormorant Garamond", Georgia, serif`;
      ctx.fillStyle = 'rgba(255,235,157,.9)';
      ctx.fillText('Verónica', c.x, c.y + radius + 49);
      ctx.restore();
    }

    drawBursts(ctx, dt) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = this.bursts.length - 1; i >= 0; i--) {
        const p = this.bursts[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985; p.vy *= .985; p.life -= dt * .85;
        if (p.life <= 0) { this.bursts.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
        ctx.fillStyle = `rgba(255,221,94,${p.life * .65})`; ctx.shadowColor = '#ffd74a'; ctx.shadowBlur = 8; ctx.fill();
      }
      ctx.restore();
    }
  }

  window.FlowersUniverse = window.FlowersUniverse || {};
  window.FlowersUniverse.Universe = Universe;
})();
