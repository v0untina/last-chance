import { BaseEngine, type Step } from "../AlgorithmEngine";

export class HeapSortEngine extends BaseEngine {
  readonly name = "Heap Sort";
  readonly pseudocode = [
    "procedure heapSort(A):",
    "  n = length(A)",
    "  for i = n/2-1 downto 0:",
    "    heapify(A, n, i)   // Build max-heap",
    "  for i = n-1 downto 1:",
    "    swap A[0] and A[i]",
    "    heapify(A, i, 0)   // Restore heap",
    "",
    "procedure heapify(A, n, i):",
    "  largest = i",
    "  left = 2*i + 1",
    "  right = 2*i + 2",
    "  if left < n and A[left] > A[largest]:",
    "    largest = left",
    "  if right < n and A[right] > A[largest]:",
    "    largest = right",
    "  if largest ≠ i:",
    "    swap A[i] and A[largest]",
    "    heapify(A, n, largest)",
  ];

  generateSteps(input: number[]): Step[] {
    const arr = [...input];
    const steps: Step[] = [];
    let comparisons = 0;
    let swaps = 0;

    steps.push({
      type: "reset", indices: [], array: [...arr],
      note: "Запускаем пирамидальную сортировку",
      explanation: "Пирамидальная сортировка (Heap Sort) сначала строит max-кучу из массива, затем извлекает максимальные элементы по одному, помещая их в конец.",
      explanationIcon: "info", line: 1,
    });

    function heapify(n: number, i: number): void {
      let largest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      if (left < n) {
        comparisons++;
        steps.push({
          type: "compare", indices: [left, largest], array: [...arr],
          note: `arr[${left}]=${arr[left]} > arr[${largest}]=${arr[largest]}?`,
          explanation: arr[left] > arr[largest]
            ? `Левый потомок ${arr[left]} > текущего максимума ${arr[largest]} → обновляем largest = ${left}.`
            : `Левый потомок ${arr[left]} ≤ текущего максимума ${arr[largest]} → не меняем.`,
          explanationIcon: "compare",
          stats: { comparisons, swaps },
          variables: { n, i, left, right, largest, comparisons, swaps },
          line: 11,
        });
        if (arr[left] > arr[largest]) largest = left;
      }

      if (right < n) {
        comparisons++;
        steps.push({
          type: "compare", indices: [right, largest], array: [...arr],
          note: `arr[${right}]=${arr[right]} > arr[${largest}]=${arr[largest]}?`,
          explanation: arr[right] > arr[largest]
            ? `Правый потомок ${arr[right]} > текущего максимума ${arr[largest]} → обновляем largest = ${right}.`
            : `Правый потомок ${arr[right]} ≤ текущего максимума ${arr[largest]} → не меняем.`,
          explanationIcon: "compare",
          stats: { comparisons, swaps },
          variables: { n, i, left, right, largest, comparisons, swaps },
          line: 13,
        });
        if (arr[right] > arr[largest]) largest = right;
      }

      if (largest !== i) {
        [arr[i], arr[largest]] = [arr[largest], arr[i]];
        swaps++;
        steps.push({
          type: "swap", indices: [i, largest], array: [...arr],
          note: `Меняем arr[${i}]↔arr[${largest}] (${arr[i]}↔${arr[largest]})`,
          explanation: `Меняем местами родителя ${arr[i]} и потомка ${arr[largest]}. ${arr[largest]} «всплывает» вверх по куче.`,
          explanationIcon: "swap",
          stats: { comparisons, swaps },
          variables: { i, largest, comparisons, swaps },
          line: 15,
        });
        heapify(n, largest);
      }
    }

    steps.push({
      type: "set", indices: [], array: [...arr],
      note: "Фаза 1: Построение max-кучи",
      explanation: "Начинаем построение max-кучи. Каждый родитель должен быть больше своих потомков. Обрабатываем все внутренние узлы снизу вверх.",
      explanationIcon: "progress",
      line: 3,
    });

    const n = arr.length;
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      heapify(n, i);
    }

    steps.push({
      type: "set", indices: [], array: [...arr],
      note: "Куча построена! Фаза 2: Сортировка",
      explanation: `Max-куча построена. Корень arr[0] = ${arr[0]} — максимальный элемент. Теперь будем извлекать максимумы.`,
      explanationIcon: "found",
      line: 5,
    });

    for (let i = n - 1; i > 0; i--) {
      [arr[0], arr[i]] = [arr[i], arr[0]];
      swaps++;
      steps.push({
        type: "swap", indices: [0, i], array: [...arr],
        note: `Меняем корень arr[0]=${arr[0]} с arr[${i}]=${arr[i]}`,
        explanation: `Перемещаем максимальный элемент ${arr[0]} на его финальную позицию arr[${i}]. Уменьшаем размер кучи и восстанавливаем свойство кучи для корня.`,
        explanationIcon: "swap",
        stats: { comparisons, swaps },
        variables: { i, comparisons, swaps },
        line: 6,
      });
      heapify(i, 0);
    }

    if (arr.length > 0) {
      steps.push({
        type: "highlight", indices: Array.from({ length: arr.length }, (_, i) => i), array: [...arr],
        note: "Готово! Массив отсортирован",
        explanation: `Пирамидальная сортировка завершена! Выполнено ${comparisons} сравнений и ${swaps} обменов.`,
        explanationIcon: "found",
        stats: { comparisons, swaps }, line: 7,
      });
    }
    return steps;
  }
}
