import { BubbleSortEngine } from "./engines/BubbleSortEngine";
import { InsertionSortEngine } from "./engines/InsertionSortEngine";
import { SelectionSortEngine } from "./engines/SelectionSortEngine";
import { BinarySearchEngine } from "./engines/BinarySearchEngine";
import type { AlgorithmEngine } from "./AlgorithmEngine";

export const engines = {
  bubble: new BubbleSortEngine(),
  insertion: new InsertionSortEngine(),
  selection: new SelectionSortEngine(),
  binary: new BinarySearchEngine(),
} as const satisfies Record<string, AlgorithmEngine>;

export type EngineKey = keyof typeof engines;
