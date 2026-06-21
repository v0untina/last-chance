import { BaseEngine, type Step } from "../AlgorithmEngine";

export class QuickSortEngine extends BaseEngine {
  readonly name = "Quick Sort";
  readonly pseudocode = [
    "procedure quickSort(A, lo, hi):",
    "  if lo >= hi: return",
    "  pivot = partition(A, lo, hi)",
    "  quickSort(A, lo, pivot - 1)",
    "  quickSort(A, pivot + 1, hi)",
    "",
    "procedure partition(A, lo, hi):",
    "  pivot = A[hi]",
    "  i = lo - 1",
    "  for j = lo to hi - 1:",
    "    if A[j] <= pivot:",
    "      i = i + 1",
    "      swap A[i] and A[j]",
    "  swap A[i + 1] and A[hi]",
    "  return i + 1",
  ];

  generateSteps(input: number[]): Step[] {
    const arr = [...input];
    const steps: Step[] = [];
    let comparisons = 0;
    let swaps = 0;

    steps.push({
      type: "reset", indices: [], array: [...arr],
      note: "Запускаем быструю сортировку",
      explanation: "Быстрая сортировка (Quick Sort) использует принцип «разделяй и властвуй»: выбирает опорный элемент (pivot) и разделяет массив на две части относительно него, затем рекурсивно сортирует каждую часть.",
      explanationIcon: "info", line: 1,
    });

    function partition(lo: number, hi: number): number {
      const pivot = arr[hi];
      let i = lo - 1;

      steps.push({
        type: "highlight", indices: [hi], array: [...arr],
        note: `Pivot = arr[${hi}] = ${pivot}`,
        explanation: `Выбираем опорный элемент (pivot) = ${pivot} (индекс ${hi}). Все элементы меньше pivot уйдут влево, больше — вправо.`,
        explanationIcon: "search",
        variables: { lo, hi, pivot }, line: 7,
      });

      for (let j = lo; j < hi; j++) {
        comparisons++;
        steps.push({
          type: "compare", indices: [j, hi], array: [...arr],
          note: `arr[${j}]=${arr[j]} ≤ pivot=${pivot}?`,
            explanation: arr[j] <= pivot
              ? `arr[${j}] = ${arr[j]} ≤ ${pivot} → перемещаем ${arr[j]} в левую часть (i=${i + 1}).`
              : `arr[${j}] = ${arr[j]} > ${pivot} → оставляем ${arr[j]} в правой части.`,
          explanationIcon: "compare",
          stats: { comparisons, swaps },
          variables: { lo, hi, i, j, pivot, comparisons, swaps },
          line: 9,
        });
        if (arr[j] <= pivot) {
          i++;
          [arr[i], arr[j]] = [arr[j], arr[i]];
          swaps++;
          steps.push({
            type: "swap", indices: [i, j], array: [...arr],
            note: `Меняем arr[${i}]↔arr[${j}]`,
            explanation: `Меняем местами arr[${i}] = ${arr[i]} и arr[${j}] = ${arr[j]}. Элемент ${arr[i]} теперь в левой части.`,
            explanationIcon: "swap",
            stats: { comparisons, swaps },
            variables: { i, j, pivot, comparisons, swaps },
            line: 10,
          });
        }
      }

      if (i + 1 !== hi) {
        [arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]];
        swaps++;
        steps.push({
          type: "swap", indices: [i + 1, hi], array: [...arr],
          note: `Ставим pivot на место: arr[${i + 1}]↔arr[${hi}]`,
          explanation: `Ставим pivot = ${pivot} на его финальную позицию arr[${i + 1}]. Все элементы слева ≤ ${pivot}, все справа > ${pivot}.`,
          explanationIcon: "found",
          stats: { comparisons, swaps },
          variables: { i, pivot, comparisons, swaps },
          line: 12,
        });
      }

      return i + 1;
    }

    function qs(lo: number, hi: number): void {
      if (lo >= hi) return;
      if (steps.length > 500) return;

      steps.push({
        type: "set", indices: [], array: [...arr],
        note: `quickSort(arr, ${lo}, ${hi})`,
        explanation: `Рекурсивно сортируем подмассив от arr[${lo}] до arr[${hi}].`,
        explanationIcon: "progress",
        variables: { lo, hi }, line: 2,
      });

      const pivotIdx = partition(lo, hi);
      qs(lo, pivotIdx - 1);
      qs(pivotIdx + 1, hi);
    }

    qs(0, arr.length - 1);

    if (arr.length > 0) {
      steps.push({
        type: "highlight", indices: Array.from({ length: arr.length }, (_, i) => i), array: [...arr],
        note: "Готово! Массив отсортирован",
        explanation: `Быстрая сортировка завершена! Выполнено ${comparisons} сравнений и ${swaps} обменов.`,
        explanationIcon: "found",
        stats: { comparisons, swaps }, line: 3,
      });
    }
    return steps;
  }
}
