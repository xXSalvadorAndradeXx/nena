(function () {
  'use strict';

  class InteractionController {
    constructor(canvas, universe, flowers, onFlowerSelect) {
      this.canvas = canvas;
      this.universe = universe;
      this.flowers = flowers;
      this.onFlowerSelect = onFlowerSelect;
      this.pointers = new Map();
      this.lastSingle = null;
      this.pinchDistance = 0;
      this.start = null;
      this.moved = false;
      this.enabled = true;
      this.bindings = [];
      this.bind();
    }

    on(target, name, handler, options) {
      target.addEventListener(name, handler, options);
      this.bindings.push(() => target.removeEventListener(name, handler, options));
    }

    bind() {
      this.on(this.canvas, 'pointerdown', this.handleDown.bind(this));
      this.on(this.canvas, 'pointermove', this.handleMove.bind(this));
      this.on(this.canvas, 'pointerup', this.handleUp.bind(this));
      this.on(this.canvas, 'pointercancel', this.handleUp.bind(this));
      this.on(this.canvas, 'wheel', this.handleWheel.bind(this), { passive: false });
      this.on(this.canvas, 'contextmenu', e => e.preventDefault());
    }

    handleDown(e) {
      if (!this.enabled) return;
      this.canvas.setPointerCapture?.(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.canvas.classList.add('is-dragging');
      if (this.pointers.size === 1) {
        this.lastSingle = { x: e.clientX, y: e.clientY };
        this.start = { x: e.clientX, y: e.clientY, t: performance.now() };
        this.moved = false;
      } else if (this.pointers.size === 2) {
        this.pinchDistance = this.distanceBetweenPointers();
        this.moved = true;
      }
    }

    handleMove(e) {
      if (!this.enabled || !this.pointers.has(e.pointerId)) return;
      const prev = this.pointers.get(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1 && this.lastSingle) {
        const dx = e.clientX - this.lastSingle.x;
        const dy = e.clientY - this.lastSingle.y;
        if (Math.abs(e.clientX - this.start.x) + Math.abs(e.clientY - this.start.y) > 7) this.moved = true;
        this.universe.nudgeCamera(dx, dy);
        this.lastSingle = { x: e.clientX, y: e.clientY };
      } else if (this.pointers.size === 2) {
        const nextDistance = this.distanceBetweenPointers();
        if (this.pinchDistance > 0) this.universe.nudgeZoom((nextDistance - this.pinchDistance) * .0035);
        this.pinchDistance = nextDistance;
      } else if (prev) {
        this.moved = true;
      }
    }

    handleUp(e) {
      if (!this.enabled) return;
      const wasSingle = this.pointers.size === 1;
      const elapsed = this.start ? performance.now() - this.start.t : 999;
      if (wasSingle && !this.moved && elapsed < 450) {
        const rect = this.canvas.getBoundingClientRect();
        const flower = this.flowers.hitTest(e.clientX - rect.left, e.clientY - rect.top);
        if (flower) {
          this.flowers.select(flower);
          this.universe.burst(flower.screen.x, flower.screen.y, 1.15);
          this.onFlowerSelect?.(flower);
        }
      }
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) {
        this.canvas.classList.remove('is-dragging');
        this.lastSingle = null;
        this.pinchDistance = 0;
      } else if (this.pointers.size === 1) {
        const p = [...this.pointers.values()][0];
        this.lastSingle = { x: p.x, y: p.y };
      }
    }

    handleWheel(e) {
      if (!this.enabled) return;
      e.preventDefault();
      this.universe.nudgeZoom(-e.deltaY * .0007);
    }

    distanceBetweenPointers() {
      const pts = [...this.pointers.values()];
      if (pts.length < 2) return 0;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }

    setEnabled(value) { this.enabled = Boolean(value); }
    destroy() { this.bindings.forEach(off => off()); this.bindings = []; this.pointers.clear(); }
  }

  window.FlowersUniverse = window.FlowersUniverse || {};
  window.FlowersUniverse.InteractionController = InteractionController;
})();
