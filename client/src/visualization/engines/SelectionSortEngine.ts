import { BaseEngine, type Step } from "../AlgorithmEngine";

export class SelectionSortEngine extends BaseEngine {
  readonly name = "Selection Sort";
  readonly pseudocode = [
    "procedure selectionSort(A):",
    "  for i = 0 to n-2:",
    "    minIdx = i",
    "    for j = i+1 to n-1:",
    "      if A[j] < A[minIdx]:",
    "        minIdx = j",
    "    if minIdx != i:",
    "      swap A[i] and A[minIdx]",
    "  return A",
  ];

  generateSteps(input: number[]): Step[] {
    const arr = [...input];
    const steps: Step[] = [];
    let comparisons = 0;
    let swaps = 0;
    const n = arr.length;

    steps.push({
      type: "reset", indices: [], array: [...arr],
      note: "Запускаем сортировку выбором",
      explanation: "Сортировка выбором на каждом шаге находит самый маленький элемент в неотсортированной части и ставит его в начало. Массив делится на отсортированную (слева) и неотсортированную (справа) части.",
      explanationIcon: "info", line: 1,
    });

    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;

      steps.push({
        type: "highlight",
        indices: [i],
        array: [...arr],
        note: `i=${i}: ищем минимум среди arr[${i}..${n - 1}]`,
        explanation: `Позиция ${i} — следующая для заполнения. Ищем самый маленький элемент в оставшейся части массива (индексы ${i}–${n - 1}), чтобы поставить его на место arr[${i}].`,
        explanationIcon: "search",
        variables: { i, minIdx, comparisons, swaps },
        line: 2,
      });

      for (let j = i + 1; j < n; j++) {
        comparisons++;
        const isNewMin = arr[j] < arr[minIdx];
        steps.push({
          type: "compare",
          indices: [j, minIdx],
          array: [...arr],
          note: `arr[${j}]=${arr[j]} vs min arr[${minIdx}]=${arr[minIdx]}`,
          explanation: isNewMin
            ? `Сравниваем: arr[${j}] = ${arr[j]} < текущего минимума ${arr[minIdx]}. Нашли новый минимальный элемент на позиции ${j}!`
            : `Сравниваем: arr[${j}] = ${arr[j]} ≥ текущего минимума ${arr[minIdx]}. Продолжаем поиск.`,
          explanationIcon: "compare",
          stats: { comparisons, swaps },
          variables: { i, j, minIdx, "A[j]": arr[j], "A[min]": arr[minIdx], comparisons, swaps },
          line: 4,
        });
        if (isNewMin) {
          minIdx = j;
          steps.push({
            type: "highlight",
            indices: [j],
            array: [...arr],
            note: `Новый минимум: arr[${j}]=${arr[j]}`,
            explanation: `Запомнили новый минимум: arr[${j}] = ${arr[j]}. Продолжаем проверять остальные элементы — вдруг найдётся ещё меньше?`,
            explanationIcon: "search",
            stats: { comparisons, swaps },
            variables: { i, j, minIdx, comparisons, swaps },
            line: 5,
          });
        }
      }

      if (minIdx !== i) {
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
        swaps++;
        steps.push({
          type: "swap",
          indices: [i, minIdx],
          array: [...arr],
          note: `Меняем arr[${i}]↔arr[${minIdx}]`,
          explanation: `Ставим минимальный элемент ${arr[i]} на позицию ${i}, а бывший arr[${i}] = ${arr[minIdx]} отправляется на позицию ${minIdx}. Теперь arr[${i}] на своём месте!`,
          explanationIcon: "swap",
          stats: { comparisons, swaps },
          variables: { i, minIdx, comparisons, swaps },
          line: 7,
        });
      } else {
        steps.push({
          type: "set",
          indices: [i],
          array: [...arr],
          note: `arr[${i}] уже на своём месте`,
          explanation: `arr[${i}] = ${arr[i]} уже является минимальным среди arr[${i}..${n - 1}]. Оставляем его на месте.`,
          explanationIcon: "info",
          variables: { i, minIdx },
          line: 6,
        });
      }
    }

    steps.push({
      type: "highlight", indices: Array.from({ length: n }, (_, i) => i), array: [...arr],
      note: "Готово! Массив отсортирован",
      explanation: `Сортировка выбором завершена! Выполнено ${comparisons} сравнений и ${swaps} обменов. Каждый элемент был поставлен на свою позицию за один обмен.`,
      explanationIcon: "found",
      stats: { comparisons, swaps }, line: 8,
    });
    return steps;
  }
}
