export interface CollectibleStats {
  comparisons: number;
  swaps: number;
  elapsed: number;
}

export class StatsCollector {
  private startTime = 0;
  private stats: CollectibleStats = { comparisons: 0, swaps: 0, elapsed: 0 };

  start() {
    this.startTime = performance.now();
    this.stats = { comparisons: 0, swaps: 0, elapsed: 0 };
  }

  update(p: { comparisons?: number; swaps?: number }) {
    if (typeof p.comparisons === "number") this.stats.comparisons = p.comparisons;
    if (typeof p.swaps === "number") this.stats.swaps = p.swaps;
    this.stats.elapsed = Math.round(performance.now() - this.startTime);
  }

  reset() { this.stats = { comparisons: 0, swaps: 0, elapsed: 0 }; }

  get(): CollectibleStats { return { ...this.stats }; }
}
