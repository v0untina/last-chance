export type StepType = "compare" | "swap" | "set" | "found" | "not_found" | "highlight" | "reset" | "splice" | "shift";

export type ExplanationIcon = "compare" | "swap" | "search" | "found" | "insert" | "progress" | "info";

export interface Step {
  type: StepType;
  indices: number[];
  array: number[];
  note?: string;
  explanation?: string;
  explanationIcon?: ExplanationIcon;
  stats?: { comparisons?: number; swaps?: number };
  variables?: Record<string, number | string>;
  line?: number;
}

export interface EngineStats {
  comparisons: number;
  swaps: number;
  elapsed: number;
}

export interface AlgorithmEngine {
  readonly name: string;
  readonly pseudocode: string[];
  generateSteps(input: number[], target?: number): Step[];
}

export abstract class BaseEngine implements AlgorithmEngine {
  abstract readonly name: string;
  abstract readonly pseudocode: string[];
  abstract generateSteps(input: number[], target?: number): Step[];
}
