(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const rand = (min, max) => min + Math.random() * (max - min);

  const MESSAGES = [
    'Hay personas que hacen que todo parezca más bonito.',
    'Si el universo tuviera un lugar favorito, quizá sería donde estás tú.',
    'Algunas flores florecen en la tierra… otras florecen en el corazón.',
    'Entre millones de estrellas, yo siempre encontraría la tuya.',
    'Quizá hoy no haya flores en mis manos, pero sí hay un universo pensando en ti.',
    'Hay detalles que no necesitan explicación.',
    'Tu sonrisa podría iluminar este universo entero.'
  ];

  class FlowerSystem {
    constructor() {
      this.flowers = [];
      this.selected = null;
      this.orbits = [];
      this.trailParticles = [];
      this.build();
    }

    build() {
      const specs = [
        { radius: 142, tiltX: .29, tiltZ: -.18, speed: .16, size: 19 },
        { radius: 194, tiltX: -.22, tiltZ: .31, speed: -.115, size: 21 },
        { radius: 249, tiltX: .38, tiltZ: .14, speed: .088, size: 23 },
        { radius: 307, tiltX: -.34, tiltZ: -.25, speed: -.072, size: 22 },
        { radius: 366, tiltX: .15, tiltZ: .42, speed: .055, size: 25 },
        { radius: 425, tiltX: -.24, tiltZ: .18, speed: -.045, size: 24 },
        { radius: 485, tiltX: .30, tiltZ: -.36, speed: .038, size: 26 }
      ];
      this.orbits = specs;
      this.flowers = specs.map((spec, i) => ({
        id: i,
        ...spec,
        phase: i * .91 + rand(-.25, .25),
        message: MESSAGES[i % MESSAGES.length],
        selected: 0,
        screen: { x: 0, y: 0, radius: 0, z: 0 },
        shimmer: rand(0, TAU),
        petalCount: i % 3 === 0 ? 10 : 8,
        petalRoundness: rand(.88, 1.15)
      }));
    }

    getOrbitSpecs() { return this.orbits; }
    onResize() { this.trailParticles.length = 0; }

    position3D(flower, time, universe) {
      const angle = flower.phase + time * flower.speed;
      return universe.orbitPoint(flower.radius, angle, flower.tiltX, flower.tiltZ);
    }

    updateAndDraw(ctx, universe, dt, time) {
      const projected = [];
      for (const flower of this.flowers) {
        flower.selected += ((this.selected === flower ? 1 : 0) - flower.selected) * Math.min(1, dt * 6);
        const p3 = this.position3D(flower, time, universe);
        const p = universe.project(p3.x, p3.y, p3.z);
        const breathing = 1 + Math.sin(time * 1.25 + flower.shimmer) * .035;
        const r = flower.size * p.scale * breathing * (1 + flower.selected * .22);
        flower.screen = { x: p.x, y: p.y, radius: Math.max(12, r * 1.3), z: p.z, scale: p.scale };
        projected.push({ flower, p, r });
        if (Math.random() < dt * (universe.performance.compact ? .9 : 1.6)) {
          this.trailParticles.push({ x: p.x + rand(-r*.35,r*.35), y: p.y + rand(-r*.35,r*.35), life: 1, r: rand(.5,1.4), vy: rand(-5,2) });
        }
      }

      projected.sort((a, b) => a.p.z - b.p.z);
      for (const item of projected) this.drawFlower(ctx, item.flower, item.p.x, item.p.y, item.r, time, item.p.perspective);
      this.drawTrails(ctx, dt);
    }

    drawFlower(ctx, flower, x, y, r, time, perspective) {
      if (r < 4 || x < -80 || x > ctx.canvas.clientWidth + 80 || y < -80 || y > ctx.canvas.clientHeight + 80) return;
      const sel = flower.selected;
      const glow = .26 + Math.sin(time * 2.1 + flower.shimmer) * .05 + sel * .24;
      const rotation = time * .08 * (flower.id % 2 ? -1 : 1) + flower.phase;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rotation);
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.35);
      halo.addColorStop(0, `rgba(255,241,161,${.16 + sel*.12})`);
      halo.addColorStop(.38, `rgba(255,208,49,${glow * .22})`);
      halo.addColorStop(1, 'rgba(255,186,23,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0,0,r*2.35,0,TAU); ctx.fill();

      const petals = flower.petalCount;
      for (let i = 0; i < petals; i++) {
        const a = i / petals * TAU;
        const wobble = Math.sin(time * .7 + i * 1.7 + flower.shimmer) * .02;
        ctx.save(); ctx.rotate(a + wobble); ctx.translate(0, -r * .68);
        const pw = r * .56 * flower.petalRoundness;
        const ph = r * .95;
        const grad = ctx.createLinearGradient(0, -ph*.52, 0, ph*.48);
        grad.addColorStop(0, `rgba(255,250,205,${.30 + sel*.14})`);
        grad.addColorStop(.45, `rgba(255,218,69,${.19 + sel*.12})`);
        grad.addColorStop(1, 'rgba(222,147,13,.035)');
        ctx.fillStyle = grad;
        ctx.strokeStyle = `rgba(255,239,157,${.52 + sel*.18})`;
        ctx.lineWidth = Math.max(.55, r * .025);
        ctx.shadowColor = 'rgba(255,204,44,.48)'; ctx.shadowBlur = Math.max(3, r * .25);
        ctx.beginPath();
        ctx.moveTo(0, ph * .5);
        ctx.bezierCurveTo(-pw*.8, ph*.22, -pw*.62, -ph*.42, 0, -ph*.52);
        ctx.bezierCurveTo(pw*.62, -ph*.42, pw*.8, ph*.22, 0, ph*.5);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      const core = ctx.createRadialGradient(-r*.12,-r*.12,0,0,0,r*.54);
      core.addColorStop(0,'rgba(255,255,227,.92)');
      core.addColorStop(.22,'rgba(255,225,73,.86)');
      core.addColorStop(.7,'rgba(212,125,12,.42)');
      core.addColorStop(1,'rgba(255,181,18,0)');
      ctx.fillStyle = core; ctx.shadowColor = '#ffd53d'; ctx.shadowBlur = r * .5; ctx.beginPath(); ctx.arc(0,0,r*.55,0,TAU); ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = .16 + sel * .1;
      ctx.strokeStyle = '#fff0a7'; ctx.lineWidth = Math.max(.35, r * .018);
      const scanY = ((time * 18 + flower.id * 11) % Math.max(8, r * 1.8)) - r * .9;
      ctx.beginPath(); ctx.moveTo(-r*.76, scanY); ctx.lineTo(r*.76, scanY); ctx.stroke();
      ctx.globalAlpha = .08;
      for (let yy = -r*.55; yy < r*.6; yy += Math.max(4, r*.21)) {
        ctx.beginPath(); ctx.moveTo(-r*.72, yy); ctx.lineTo(r*.72, yy); ctx.stroke();
      }
      ctx.restore();

      if (sel > .04) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,231,129,${sel*.24})`; ctx.lineWidth = .7;
        ctx.beginPath(); ctx.arc(x,y,r*(1.65+Math.sin(time*2)*.06),0,TAU); ctx.stroke(); ctx.restore();
      }
    }

    drawTrails(ctx, dt) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = this.trailParticles.length - 1; i >= 0; i--) {
        const p = this.trailParticles[i]; p.life -= dt * .7; p.y += p.vy * dt;
        if (p.life <= 0) { this.trailParticles.splice(i,1); continue; }
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*p.life,0,TAU); ctx.fillStyle = `rgba(255,217,76,${p.life*.25})`; ctx.fill();
      }
      if (this.trailParticles.length > 65) this.trailParticles.splice(0, this.trailParticles.length - 65);
      ctx.restore();
    }

    hitTest(x, y) {
      let best = null; let bestDist = Infinity;
      for (const flower of this.flowers) {
        const dx = x - flower.screen.x, dy = y - flower.screen.y;
        const d = Math.hypot(dx, dy);
        const threshold = Math.max(26, flower.screen.radius * 1.55);
        if (d < threshold && d < bestDist) { best = flower; bestDist = d; }
      }
      return best;
    }

    select(flower) { this.selected = flower || null; }
  }

  window.FlowersUniverse = window.FlowersUniverse || {};
  window.FlowersUniverse.FlowerSystem = FlowerSystem;
})();
