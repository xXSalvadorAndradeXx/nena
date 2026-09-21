(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class AmbientSound {
    constructor(button) {
      this.button = button;
      this.ctx = null;
      this.master = null;
      this.nodes = [];
      this.active = false;
    }

    async toggle() {
      if (this.active) { this.stop(); return; }
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = this.ctx || new AudioContext();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.start();
    }

    start() {
      if (this.active || !this.ctx) return;
      this.active = true;
      this.button.setAttribute('aria-pressed', 'true');
      this.button.setAttribute('aria-label', 'Desactivar música ambiental');
      this.master = this.ctx.createGain();
      this.master.gain.setValueAtTime(.0001, this.ctx.currentTime);
      this.master.gain.exponentialRampToValueAtTime(.028, this.ctx.currentTime + 1.8);
      this.master.connect(this.ctx.destination);

      [196, 246.94, 293.66].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq / 2;
        osc.detune.value = i * 3 - 3;
        gain.gain.value = i === 0 ? .58 : .23;
        filter.type = 'lowpass'; filter.frequency.value = 720; filter.Q.value = .6;
        osc.connect(gain); gain.connect(filter); filter.connect(this.master); osc.start();
        this.nodes.push(osc, gain, filter);
      });
    }

    stop() {
      if (!this.active) return;
      this.active = false;
      this.button.setAttribute('aria-pressed', 'false');
      this.button.setAttribute('aria-label', 'Activar música ambiental');
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(Math.max(.0001, this.master.gain.value), t);
      this.master.gain.exponentialRampToValueAtTime(.0001, t + .5);
      const nodes = this.nodes.filter(n => typeof n.stop === 'function');
      setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (_) {} }), 650);
      this.nodes = [];
    }
  }

  class App {
    constructor() {
      this.intro = $('#intro');
      this.introCanvas = $('#intro-stars');
      this.enterButton = $('#enter-universe');
      this.screen = $('#universe-screen');
      this.canvas = $('#universe-canvas');
      this.hint = $('#controls-hint');
      this.message = $('#flower-message');
      this.messageText = $('#flower-message-text');
      this.finalTrigger = $('#final-trigger');
      this.finale = $('#finale');
      this.finaleCopy = $('#finale-copy');
      this.finalBloom = $('#final-bloom');
      this.returnButton = $('#return-universe');
      this.sound = new AmbientSound($('#sound-toggle'));
      this.universe = null;
      this.flowers = null;
      this.interaction = null;
      this.messageTimer = 0;
      this.introFrame = 0;
      this.introStart = performance.now();
      this.runIntroStars = this.runIntroStars.bind(this);
      this.init();
    }

    init() {
      this.runIntroSequence();
      this.runIntroStars(performance.now());
      this.enterButton.addEventListener('click', () => this.enterUniverse());
      this.finalTrigger.addEventListener('click', () => this.beginFinale());
      this.returnButton.addEventListener('click', () => this.returnToUniverse());
      $('#sound-toggle').addEventListener('click', () => this.sound.toggle());
    }

    runIntroSequence() {
      const lines = [...document.querySelectorAll('.intro-line')];
      if (reducedMotion) {
        lines.forEach((line, i) => line.classList.toggle('is-visible', i === lines.length - 1));
        this.enterButton.classList.add('is-visible');
        return;
      }
      const show = (index, at, duration) => {
        setTimeout(() => {
          lines.forEach((line, i) => {
            line.classList.toggle('is-visible', i === index);
            if (i < index) line.classList.add('is-past');
          });
        }, at);
        if (duration) setTimeout(() => lines[index].classList.remove('is-visible'), at + duration);
      };
      show(0, 450, 2300);
      show(1, 3150, 2100);
      show(2, 5600, 0);
      setTimeout(() => this.enterButton.classList.add('is-visible'), 7350);
    }

    runIntroStars(now) {
      if (!this.intro || this.intro.classList.contains('is-leaving')) return;
      const ctx = this.introCanvas.getContext('2d');
      const rect = this.introCanvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      if (this.introCanvas.width !== Math.round(rect.width * dpr) || this.introCanvas.height !== Math.round(rect.height * dpr)) {
        this.introCanvas.width = Math.round(rect.width * dpr); this.introCanvas.height = Math.round(rect.height * dpr);
      }
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,rect.width,rect.height);
      const t = (now - this.introStart) / 1000;
      const count = Math.min(120, Math.floor(rect.width * rect.height / 7000));
      for (let i = 0; i < count; i++) {
        const seed = i * 997.31;
        const x = ((seed * 19.17) % rect.width + Math.sin(t*.05+i)*3 + rect.width) % rect.width;
        const y = ((seed * 7.13) % rect.height + Math.cos(t*.04+i)*2 + rect.height) % rect.height;
        const a = .15 + ((Math.sin(t*(.45+(i%5)*.09)+i)*.5+.5) * .42);
        const r = .35 + (i % 4) * .22;
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle = i%11===0 ? `rgba(255,221,111,${a})` : `rgba(230,240,255,${a})`; ctx.fill();
      }
      this.introFrame = requestAnimationFrame(this.runIntroStars);
    }

    ensureUniverse() {
      if (this.universe) return;
      const ns = window.FlowersUniverse;
      this.universe = new ns.Universe(this.canvas);
      this.flowers = new ns.FlowerSystem();
      this.universe.attachFlowers(this.flowers);
      this.interaction = new ns.InteractionController(this.canvas, this.universe, this.flowers, flower => this.showFlowerMessage(flower));
    }

    enterUniverse() {
      this.ensureUniverse();
      cancelAnimationFrame(this.introFrame);
      this.screen.setAttribute('aria-hidden', 'false');
      this.screen.classList.add('is-active');
      this.universe.start();
      this.intro.classList.add('is-leaving');
      setTimeout(() => { this.intro.style.display = 'none'; }, 1300);
      setTimeout(() => this.hint.classList.add('is-hidden'), 7200);
    }

    showFlowerMessage(flower) {
      clearTimeout(this.messageTimer);
      this.messageText.textContent = flower.message;
      this.message.classList.remove('is-visible');
      requestAnimationFrame(() => requestAnimationFrame(() => this.message.classList.add('is-visible')));
      this.hint.classList.add('is-hidden');
      this.messageTimer = setTimeout(() => this.message.classList.remove('is-visible'), 5200);
    }

    beginFinale() {
      if (!this.universe) return;
      this.interaction.setEnabled(false);
      this.message.classList.remove('is-visible');
      this.universe.focusCenter();
      this.finale.setAttribute('aria-hidden', 'false');
      setTimeout(() => this.finale.classList.add('is-active'), 450);
      const lines = [...this.finale.querySelectorAll('.finale-line')];
      lines.forEach(line => line.classList.remove('is-visible','is-past'));
      this.finaleCopy.classList.remove('is-done');
      this.finalBloom.classList.remove('is-visible');
      const gap = reducedMotion ? 300 : 2500;
      const base = reducedMotion ? 100 : 950;
      lines.forEach((line, index) => {
        setTimeout(() => {
          lines.forEach((other, i) => {
            other.classList.toggle('is-visible', i === index);
            if (i < index) other.classList.add('is-past');
          });
        }, base + index * gap);
      });
      const bloomAt = base + lines.length * gap + (reducedMotion ? 100 : 600);
      setTimeout(() => {
        this.finaleCopy.classList.add('is-done');
        this.finalBloom.classList.add('is-visible');
      }, bloomAt);
    }

    returnToUniverse() {
      this.finalBloom.classList.remove('is-visible');
      this.finale.classList.remove('is-active');
      this.finale.setAttribute('aria-hidden', 'true');
      this.universe.releaseFocus();
      this.interaction.setEnabled(true);
      this.flowers.select(null);
    }
  }

  window.addEventListener('DOMContentLoaded', () => new App(), { once: true });
})();
