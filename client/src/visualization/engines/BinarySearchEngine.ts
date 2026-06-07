import { BaseEngine, type Step } from "../AlgorithmEngine";

export class BinarySearchEngine extends BaseEngine {
  readonly name = "Binary Search";
  readonly pseudocode = [
    "procedure binarySearch(A, target):",
    "  lo = 0, hi = n-1",
    "  while lo <= hi:",
    "    mid = (lo + hi) / 2",
    "    if A[mid] == target:",
    "      return mid",
    "    else if A[mid] < target:",
    "      lo = mid + 1",
    "    else:",
    "      hi = mid - 1",
    "  return -1  // не найден",
  ];

  generateSteps(input: number[], target?: number): Step[] {
    const arr = [...input].sort((a, b) => a - b);
    const steps: Step[] = [];
    let comparisons = 0;
    const t = target ?? arr[Math.floor(arr.length / 2)] ?? 0;

    steps.push({
      type: "reset", indices: [], array: [...arr],
      note: `Ищем ${t} в отсортированном массиве`,
      explanation: `Бинарный поиск: ищем число ${t} в отсортированном массиве. Делим массив пополам и сравниваем искомое значение со средним элементом. Это позволяет отбросить половину массива на каждом шаге!`,
      explanationIcon: "search",
      variables: { target: t }, line: 1,
    });

    let lo = 0;
    let hi = arr.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      comparisons++;

      const isFound = arr[mid] === t;
      const goRight = arr[mid] < t;

      steps.push({
        type: "highlight",
        indices: [mid, lo, hi],
        array: [...arr],
        note: `lo=${lo}, hi=${hi}, mid=${mid}`,
        explanation: isFound
          ? `Проверяем arr[${mid}] = ${arr[mid]} = ${t}. Нашли!`
          : `Проверяем mid = ${mid}: arr[${mid}] = ${arr[mid]} ${goRight ? "<" : ">"} ${t}. ${goRight ? "Отбрасываем левую половину [${lo}..${mid}]" : "Отбрасываем правую половину [${mid}..${hi}]"}.`,
        explanationIcon: isFound ? "found" : "compare",
        variables: { lo, mid, hi, target: t, "A[mid]": arr[mid], comparisons },
        line: 3,
      });

      if (isFound) {
        steps.push({
          type: "found", indices: [mid], array: [...arr],
          note: `Найдено! arr[${mid}] = ${t}`,
          explanation: `Элемент ${t} найден на позиции ${mid}! Понадобилось всего ${comparisons} сравнений — это сила бинарного поиска!`,
          explanationIcon: "found",
          stats: { comparisons },
          variables: { lo, mid, hi, target: t, comparisons },
          line: 4,
        });
        return steps;
      }

      if (goRight) {
        lo = mid + 1;
        steps.push({
          type: "compare", indices: [mid], array: [...arr],
          note: `${arr[mid]} < ${t} → ищем справа, lo = ${lo}`,
          explanation: `${arr[mid]} < ${t}, значит искомый элемент находится в правой половине. Сдвигаем левую границу: lo = ${mid} + 1 = ${lo}. Область поиска сузилась до [${lo}..${hi}].`,
          explanationIcon: "search",
          stats: { comparisons },
          variables: { lo, mid, hi, comparisons },
          line: 6,
        });
      } else {
        hi = mid - 1;
        steps.push({
          type: "compare", indices: [mid], array: [...arr],
          note: `${arr[mid]} > ${t} → ищем слева, hi = ${hi}`,
          explanation: `${arr[mid]} > ${t}, значит искомый элемент находится в левой половине. Сдвигаем правую границу: hi = ${mid} - 1 = ${hi}. Область поиска сузилась до [${lo}..${hi}].`,
          explanationIcon: "search",
          stats: { comparisons },
          variables: { lo, mid, hi, comparisons },
          line: 8,
        });
      }
    }

    steps.push({
      type: "not_found", indices: [], array: [...arr],
      note: `${t} не найден`,
      explanation: `Элемент ${t} не найден в массиве. После ${comparisons} сравнений область поиска стала пустой (lo > hi). Это значит, что такого числа нет в массиве.`,
      explanationIcon: "found",
      stats: { comparisons },
      line: 9,
    });
    return steps;
  }
}
