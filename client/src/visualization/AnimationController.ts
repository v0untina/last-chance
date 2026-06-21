import type { Step } from "./AlgorithmEngine";
import { CanvasRenderer } from "./CanvasRenderer";

export class AnimationController {
  private steps: Step[] = [];
  private index = 0;
  private playing = false;
  private speed = 1;
  private renderer: CanvasRenderer;
  private onChange: (step: Step, index: number) => void;
  private onFinish: () => void;
  private rafId: number | null = null;
  private lastTick = 0;
  private cooldown = 0;
  private finished = false;

  constructor(
    renderer: CanvasRenderer,
    onChange: (step: Step, index: number) => void,
    onFinish: () => void
  ) {
    this.renderer = renderer;
    this.onChange = onChange;
    this.onFinish = onFinish;
  }

  load(steps: Step[]) {
    this.stop();
    this.steps = steps;
    this.index = 0;
    this.finished = false;
    if (steps[0]) {
      this.renderer.draw(steps[0]);
      this.onChange(steps[0], 0);
    }
  }

  play() {
    if (this.playing || this.steps.length === 0 || this.finished) return;
    this.playing = true;
    this.lastTick = performance.now();
    this.cooldown = 0;
    this.loop(this.lastTick);
  }

  pause() {
    this.playing = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  stop() {
    this.pause();
    this.index = 0;
    this.finished = false;
    if (this.steps[0]) {
      this.renderer.draw(this.steps[0]);
      this.onChange(this.steps[0], 0);
    }
  }

  isPlaying() { return this.playing; }
  totalSteps() { return this.steps.length; }
  currentIndex() { return this.index; }
  currentStep() { return this.steps[this.index] ?? null; }

  /** Repaint the current step at the renderer's current size (e.g. after a resize). */
  redraw() {
    const step = this.steps[this.index];
    if (!step) return;
    this.renderer.draw(step);
    this.renderer.finishCurrentAnimation();
  }

  stepForward() {
    if (this.finished) return;
    this.pause();
    if (this.index < this.steps.length - 1) {
      this.index++;
      this.renderer.draw(this.steps[this.index]);
      this.renderer.finishCurrentAnimation();
      this.onChange(this.steps[this.index], this.index);
    } else {
      this.finished = true;
      this.onFinish();
    }
  }

  stepBackward() {
    this.pause();
    this.finished = false;
    if (this.index > 0) {
      this.index--;
      this.renderer.draw(this.steps[this.index]);
      this.renderer.finishCurrentAnimation();
      this.onChange(this.steps[this.index], this.index);
    }
  }

  seekTo(index: number) {
    if (this.steps.length === 0) return;
    const clamped = Math.max(0, Math.min(this.steps.length - 1, Math.floor(index)));
    this.pause();
    this.finished = clamped >= this.steps.length - 1;
    this.index = clamped;
    this.renderer.draw(this.steps[this.index]);
    this.renderer.finishCurrentAnimation();
    this.onChange(this.steps[this.index], this.index);
  }

  setSpeed(s: number) {
    this.speed = Math.max(0.25, Math.min(4, s));
  }

  private loop = (now: number) => {
    if (!this.playing) return;
    this.rafId = requestAnimationFrame(this.loop);

    const delta = now - this.lastTick;
    this.lastTick = now;

    const stillAnimating = this.renderer.tick(now);

    const stepMs = 500 / this.speed;
    this.cooldown += delta;

    if (!stillAnimating && this.cooldown >= stepMs) {
      this.cooldown = 0;
      if (this.index < this.steps.length - 1) {
        this.index++;
        this.renderer.draw(this.steps[this.index]);
        this.onChange(this.steps[this.index], this.index);
      } else {
        this.playing = false;
        this.finished = true;
        this.onFinish();
        return;
      }
    }

    if (!stillAnimating && this.cooldown < stepMs) {
      this.renderer.tick(now);
    }
  };
}
