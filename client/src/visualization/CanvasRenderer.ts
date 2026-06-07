import type { Step, ExplanationIcon } from "./AlgorithmEngine";

interface BarVisual {
  value: number;
  x: number; y: number; w: number; h: number;
  fill: string;
  textColor: string;
  opacity: number;
  scaleX: number;
  glow: number;
}

interface BarTarget {
  value: number;
  x: number; y: number; w: number; h: number;
  fill: string;
  textColor: string;
  opacity: number;
  scaleX: number;
  glow: number;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpColor(a: string, b: string, t: number): string {
  const pa = parseHex(a), pb = parseHex(b);
  if (!pa || !pb) return t < 0.5 ? a : b;
  const rr = Math.round(lerp(pa[0], pb[0], t));
  const gg = Math.round(lerp(pa[1], pb[1], t));
  const bb = Math.round(lerp(pa[2], pb[2], t));
  return `rgb(${rr},${gg},${bb})`;
}
function parseHex(c: string): [number, number, number] | null {
  const m = c.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

const COLORS = {
  idle: "#334155",
  idleText: "#94a3b8",
  compare: "#f59e0b",
  compareText: "#1c1917",
  swap: "#ef4444",
  swapText: "#ffffff",
  sorted: "#16a34a",
  sortedText: "#ffffff",
  active: "#4f46e5",
  activeText: "#ffffff",
  found: "#10b981",
  foundText: "#ffffff",
  notFound: "#dc2626",
  notFoundText: "#ffffff",
  highlight: "#0ea5e9",
  highlightText: "#ffffff",
  pivot: "#a855f7",
  pivotText: "#ffffff",
};

type BarColors = { fill: string; text: string };

function colorsFor(step: Step, index: number, sortedSet: Set<number>): BarColors {
  const { type, indices } = step;
  if (type === "found" && indices.includes(index)) return { fill: COLORS.found, text: COLORS.foundText };
  if (type === "not_found") return { fill: COLORS.idle, text: COLORS.idleText };
  if (type === "swap" && indices.includes(index)) return { fill: COLORS.swap, text: COLORS.swapText };
  if (type === "compare" && indices.includes(index)) return { fill: COLORS.compare, text: COLORS.compareText };
  if (type === "highlight" && indices.includes(index)) return { fill: COLORS.highlight, text: COLORS.highlightText };
  if (type === "set" && indices.includes(index)) return { fill: COLORS.active, text: COLORS.activeText };
  if (sortedSet.has(index)) return { fill: COLORS.sorted, text: COLORS.sortedText };
  return { fill: COLORS.idle, text: COLORS.idleText };
}

const EXPLANATION_ICONS: Record<ExplanationIcon, string> = {
  compare: "🔍",
  swap: "🔀",
  search: "🎯",
  found: "✅",
  insert: "📥",
  progress: "📊",
  info: "ℹ️",
};

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  private w = 0; private h = 0;
  private sortedSet = new Set<number>();

  private bars: BarVisual[] = [];
  private targets: BarTarget[] = [];
  private animating = false;
  private animStart = 0;
  private animDuration = 400;
  private fromState: BarTarget[] = [];

  private currentExplanation = "";
  private currentExplanationIcon: ExplanationIcon = "info";
  private explanationFade = 0;
  private explanationTarget = 0;
  private lastAnimProgress = 1;

  private statsComparisons = 0;
  private statsSwaps = 0;
  private statsTargetComparisons = 0;
  private statsTargetSwaps = 0;

  private swapPair: [number, number] | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear() {
    this.sortedSet.clear();
    this.bars = [];
    this.targets = [];
    this.fromState = [];
    this.currentExplanation = "";
    this.explanationFade = 0;
    this.swapPair = null;
  }

  private computeTargets(step: Step): BarTarget[] {
    const { array, type } = step;
    const n = array.length;
    if (n === 0) return [];
    const max = Math.max(...array, 1);
    const padX = 16;
    const padTop = 28;
    const padBottom = 80;
    const barAreaW = this.w - padX * 2;
    const barAreaH = this.h - padTop - padBottom;
    const gap = n > 50 ? 1 : n > 30 ? 2 : n > 12 ? 3 : 4;
    const barW = Math.max(4, (barAreaW - gap * (n - 1)) / n);

    return array.map((val, i) => {
      const ratio = val / max;
      const barH = Math.max(3, ratio * barAreaH);
      const x = padX + i * (barW + gap);
      const y = padTop + (barAreaH - barH);
      const colors = colorsFor(step, i, this.sortedSet);
      const isActive = step.indices.includes(i);
      return {
        value: val, x, y, w: barW, h: barH,
        fill: colors.fill, textColor: colors.text,
        opacity: 1, scaleX: 1,
        glow: isActive ? (type === "swap" ? 12 : 6) : 0,
      };
    });
  }

  draw(step: Step) {
    if (step.type === "reset") this.sortedSet.clear();
    if (step.type === "highlight" && step.indices.length === step.array.length) {
      this.sortedSet = new Set(step.indices);
    }

    this.swapPair = step.type === "swap" && step.indices.length === 2
      ? [step.indices[0], step.indices[1]]
      : null;

    this.fromState = this.targets.length > 0 && this.lastAnimProgress < 1
      ? this.targets.map(t => ({ ...t }))
      : this.bars.length > 0
        ? this.bars.map(b => ({
          value: b.value, x: b.x, y: b.y, w: b.w, h: b.h,
          fill: b.fill, textColor: b.textColor, opacity: 1, scaleX: 1, glow: 0,
        }))
        : [];

    this.targets = this.computeTargets(step);

    if (step.note || step.explanation) {
      this.currentExplanation = step.explanation || step.note || "";
      this.currentExplanationIcon = step.explanationIcon || "info";
      this.explanationTarget = 1;
    }

    if (step.stats?.comparisons !== undefined) this.statsTargetComparisons = step.stats.comparisons;
    if (step.stats?.swaps !== undefined) this.statsTargetSwaps = step.stats.swaps;

    this.animating = true;
    this.animStart = performance.now();
    this.lastAnimProgress = 0;
    if (this.fromState.length === 0) {
      this.fromState = this.targets.map(t => ({ ...t }));
      this.finishAnimation();
    }
  }

  private finishAnimation() {
    const drawTargets = this.targets.map(t => ({
      value: t.value, x: t.x, y: t.y, w: t.w, h: t.h,
      fill: t.fill, textColor: t.textColor, opacity: 1, scaleX: 1, glow: t.glow,
    }));
    this.bars = drawTargets;
    this.animating = false;
    this.lastAnimProgress = 1;
    this.statsComparisons = this.statsTargetComparisons;
    this.statsSwaps = this.statsTargetSwaps;
    this.renderFrame(1);
  }

  tick(now: number) {
    if (!this.animating) return false;
    const elapsed = now - this.animStart;
    const rawT = Math.min(1, elapsed / this.animDuration);

    if (rawT >= 1) {
      this.finishAnimation();
      if (this.explanationFade < 1) this.explanationFade = Math.min(1, this.explanationFade + 0.1);
      return true;
    }

    const t = easeInOut(rawT);

    const swapActive = this.swapPair && t < 0.85;
    let swapT = 0;
    let swapOvershoot = 1;
    if (swapActive) {
      swapT = Math.min(1, t * 1.5);
      swapOvershoot = easeOutBack(Math.min(1, swapT));
    }

    this.bars = this.targets.map((target, i) => {
      const from = this.fromState[i] || target;
      let x = lerp(from.x, target.x, t);
      let y = lerp(from.y, target.y, t);
      let h = lerp(from.h, target.h, t);
      let fill = lerpColor(from.fill, target.fill, t);
      let textColor = lerpColor(from.textColor, target.textColor, t);
      let opacity = lerp(from.opacity, target.opacity, t);
      let glow = lerp(from.glow, target.glow, t);

      if (swapActive && this.swapPair) {
        const [j, k] = this.swapPair;
        if (i === j || i === k) {
          const fromX = this.fromState[i]?.x ?? target.x;
          const toX = this.targets[i === j ? k : j]?.x ?? target.x;
          x = lerp(fromX, toX, swapOvershoot);
        }
      }

      return { value: target.value, x, y, w: target.w, h, fill, textColor, opacity, scaleX: 1, glow };
    });

    this.statsComparisons = Math.round(lerp(this.statsComparisons, this.statsTargetComparisons, t));
    this.statsSwaps = Math.round(lerp(this.statsSwaps, this.statsTargetSwaps, t));

    if (this.explanationFade < this.explanationTarget) {
      this.explanationFade = Math.min(this.explanationTarget, this.explanationFade + 0.08);
    }

    this.lastAnimProgress = t;
    this.renderFrame(t);
    return true;
  }

  private renderFrame(_t: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    this.drawBars(ctx);
    this.drawExplanation(ctx);
    this.drawStats(ctx);
  }

  private drawBars(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.bars.length; i++) {
      const bar = this.bars[i];
      if (bar.opacity < 0.01) continue;

      ctx.save();
      ctx.globalAlpha = bar.opacity;

      if (bar.glow > 0.5) {
        ctx.shadowColor = bar.fill;
        ctx.shadowBlur = bar.glow * 2;
      }

      ctx.fillStyle = bar.fill;
      const r = Math.min(4, bar.w / 3);

      ctx.beginPath();
      ctx.moveTo(bar.x + r, bar.y);
      ctx.lineTo(bar.x + bar.w - r, bar.y);
      ctx.arcTo(bar.x + bar.w, bar.y, bar.x + bar.w, bar.y + r, r);
      ctx.lineTo(bar.x + bar.w, bar.y + bar.h);
      ctx.lineTo(bar.x, bar.y + bar.h);
      ctx.lineTo(bar.x, bar.y + r);
      ctx.arcTo(bar.x, bar.y, bar.x + r, bar.y, r);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;

      if (bar.w > 16 && bar.h > 12) {
        ctx.fillStyle = bar.textColor;
        ctx.font = `600 ${Math.min(12, Math.max(9, bar.w * 0.55))}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(String(bar.value), bar.x + bar.w / 2, bar.y + 4);
      }

      ctx.restore();
    }
  }

  private drawExplanation(ctx: CanvasRenderingContext2D) {
    if (!this.currentExplanation || this.explanationFade < 0.01) return;

    const padX = 16;
    const padY = this.h - 64;
    const maxW = this.w - padX * 2;
    const icon = EXPLANATION_ICONS[this.currentExplanationIcon] || "ℹ️";

    ctx.save();
    ctx.globalAlpha = Math.min(1, this.explanationFade);

    const bgGrad = ctx.createLinearGradient(padX, padY, padX, padY + 52);
    bgGrad.addColorStop(0, "rgba(15, 23, 42, 0.92)");
    bgGrad.addColorStop(1, "rgba(30, 41, 59, 0.95)");
    ctx.fillStyle = bgGrad;

    const radius = 10;
    ctx.beginPath();
    ctx.moveTo(padX + radius, padY);
    ctx.lineTo(padX + maxW - radius, padY);
    ctx.arcTo(padX + maxW, padY, padX + maxW, padY + radius, radius);
    ctx.lineTo(padX + maxW, padY + 52);
    ctx.lineTo(padX, padY + 52);
    ctx.lineTo(padX, padY + radius);
    ctx.arcTo(padX, padY, padX + radius, padY, radius);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "16px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, padX + 12, padY + 26);

    ctx.font = "600 12px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#e2e8f0";
    const textX = padX + 40;
    const maxTextW = maxW - 52;

    const lines = this.wrapText(ctx, this.currentExplanation, maxTextW);
    lines.forEach((line, li) => {
      ctx.fillText(line, textX, padY + 16 + li * 16);
    });

    ctx.restore();
  }

  private drawStats(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.font = "600 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";

    const statsX = this.w - 16;
    const statsY = 8;

    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    const statW = 140;
    ctx.beginPath();
    ctx.roundRect(statsX - statW, statsY, statW, 24, 6);
    ctx.fill();

    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "left";
    ctx.fillText(`⚖ ${this.statsComparisons}`, statsX - statW + 8, statsY + 6);
    ctx.fillText(`🔄 ${this.statsSwaps}`, statsX - statW + 72, statsY + 6);
    ctx.restore();
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    if (ctx.measureText(text).width <= maxW) return [text];
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(" ")) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxW && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
}
