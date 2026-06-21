import { BubbleSortEngine } from "./engines/BubbleSortEngine";
import { InsertionSortEngine } from "./engines/InsertionSortEngine";
import { SelectionSortEngine } from "./engines/SelectionSortEngine";
import { BinarySearchEngine } from "./engines/BinarySearchEngine";
import { QuickSortEngine } from "./engines/QuickSortEngine";
import { MergeSortEngine } from "./engines/MergeSortEngine";
import { HeapSortEngine } from "./engines/HeapSortEngine";
import { StackEngine } from "./engines/StackEngine";
import { QueueEngine } from "./engines/QueueEngine";
import type { AlgorithmEngine } from "./AlgorithmEngine";

export const engines = {
  bubble: new BubbleSortEngine(),
  insertion: new InsertionSortEngine(),
  selection: new SelectionSortEngine(),
  binary: new BinarySearchEngine(),
  quick: new QuickSortEngine(),
  merge: new MergeSortEngine(),
  heap: new HeapSortEngine(),
  stack: new StackEngine(),
  queue: new QueueEngine(),
} as const satisfies Record<string, AlgorithmEngine>;

export type EngineKey = keyof typeof engines;
