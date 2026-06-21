import { BaseEngine, type Step } from "../AlgorithmEngine";

export class MergeSortEngine extends BaseEngine {
  readonly name = "Merge Sort";
  readonly pseudocode = [
    "procedure mergeSort(A):",
    "  if length(A) ≤ 1: return A",
    "  mid = length(A) / 2",
    "  left = mergeSort(A[0..mid-1])",
    "  right = mergeSort(A[mid..])",
    "  return merge(left, right)",
    "",
    "procedure merge(L, R):",
    "  result = []",
    "  while L and R not empty:",
    "    if L[0] ≤ R[0]:",
    "      result.push(L.shift())",
    "    else:",
    "      result.push(R.shift())",
    "  result.push(remaining L, R)",
    "  return result",
  ];

  generateSteps(input: number[]): Step[] {
    const arr = [...input];
    const steps: Step[] = [];
    let comparisons = 0;
    let sets = 0;

    steps.push({
      type: "reset", indices: [], array: [...arr],
      note: "Запускаем сортировку слиянием",
      explanation: "Сортировка слиянием (Merge Sort) делит массив пополам до одного элемента, затем сливает отсортированные половины. Гарантированная сложность O(n log n).",
      explanationIcon: "info", line: 1,
    });

    function merge(lo: number, mid: number, hi: number): void {
      const left = arr.slice(lo, mid + 1);
      const right = arr.slice(mid + 1, hi + 1);
      let i = 0, j = 0, k = lo;

      steps.push({
        type: "set", indices: [], array: [...arr],
        note: `Слияние [${lo}..${mid}] и [${mid + 1}..${hi}]`,
        explanation: `Сливаем два отсортированных подмассива: [${left}] и [${right}]. Будем брать меньший элемент из каждого и помещать в результат.`,
        explanationIcon: "progress",
        variables: { lo, mid, hi },
        line: 8,
      });

      while (i < left.length && j < right.length) {
        comparisons++;
        steps.push({
          type: "compare", indices: [lo + i, mid + 1 + j], array: [...arr],
          note: `Сравниваем ${left[i]} и ${right[j]}`,
          explanation: left[i] <= right[j]
            ? `${left[i]} ≤ ${right[j]} → берём ${left[i]} из левой половины.`
            : `${left[i]} > ${right[j]} → берём ${right[j]} из правой половины.`,
          explanationIcon: "compare",
          stats: { comparisons, sets },
          variables: { comparisons, sets },
          line: 10,
        });

        if (left[i] <= right[j]) {
          arr[k] = left[i];
          i++;
        } else {
          arr[k] = right[j];
          j++;
        }
        sets++;
        steps.push({
          type: "set", indices: [k], array: [...arr],
          note: `arr[${k}] = ${arr[k]}`,
          explanation: `Помещаем ${arr[k]} на позицию ${k}.`,
          explanationIcon: "insert",
          stats: { comparisons, sets },
          line: 11,
        });
        k++;
      }

      while (i < left.length) {
        arr[k] = left[i];
        sets++;
        steps.push({
          type: "set", indices: [k], array: [...arr],
          note: `Копируем остаток левой части: ${left[i]}`,
          explanation: `Добавляем оставшийся элемент ${left[i]} из левой половины.`,
          explanationIcon: "insert",
          stats: { comparisons, sets },
          line: 15,
        });
        i++; k++;
      }
      while (j < right.length) {
        arr[k] = right[j];
        sets++;
        steps.push({
          type: "set", indices: [k], array: [...arr],
          note: `Копируем остаток правой части: ${right[j]}`,
          explanation: `Добавляем оставшийся элемент ${right[j]} из правой половины.`,
          explanationIcon: "insert",
          stats: { comparisons, sets },
          line: 15,
        });
        j++; k++;
      }
    }

    function ms(lo: number, hi: number): void {
      if (lo >= hi) return;
      if (steps.length > 500) return;

      const mid = (lo + hi) >> 1;
      steps.push({
        type: "set", indices: [], array: [...arr],
        note: `Делим [${lo}..${hi}] → [${lo}..${mid}] и [${mid + 1}..${hi}]`,
        explanation: `Разделяем подмассив от ${lo} до ${hi}. Левая половина: [${lo}..${mid}], правая: [${mid + 1}..${hi}].`,
        explanationIcon: "progress",
        variables: { lo, mid, hi }, line: 2,
      });

      ms(lo, mid);
      ms(mid + 1, hi);
      merge(lo, mid, hi);
    }

    ms(0, arr.length - 1);

    if (arr.length > 0) {
      steps.push({
        type: "highlight", indices: Array.from({ length: arr.length }, (_, i) => i), array: [...arr],
        note: "Готово! Массив отсортирован",
        explanation: `Сортировка слиянием завершена! Выполнено ${comparisons} сравнений и ${sets} копирований.`,
        explanationIcon: "found",
        stats: { comparisons, sets }, line: 5,
      });
    }
    return steps;
  }
}
