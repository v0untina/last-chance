import { BaseEngine, type Step } from "../AlgorithmEngine";

export class InsertionSortEngine extends BaseEngine {
  readonly name = "Insertion Sort";
  readonly pseudocode = [
    "procedure insertionSort(A):",
    "  for i = 1 to n-1:",
    "    key = A[i]",
    "    j = i - 1",
    "    while j >= 0 and A[j] > key:",
    "      A[j+1] = A[j]   // сдвиг вправо",
    "      j = j - 1",
    "    A[j+1] = key      // вставка",
    "  return A",
  ];

  generateSteps(input: number[]): Step[] {
    const arr = [...input];
    const steps: Step[] = [];
    let comparisons = 0;
    let shifts = 0;

    steps.push({
      type: "reset", indices: [], array: [...arr],
      note: "Запускаем сортировку вставками",
      explanation: "Сортировка вставками работает как упорядочивание карт в руке: берём очередной элемент и вставляем его в правильную позицию среди уже отсортированных элементов слева.",
      explanationIcon: "info", line: 1,
    });

    for (let i = 1; i < arr.length; i++) {
      const key = arr[i];
      let j = i - 1;

      steps.push({
        type: "highlight",
        indices: [i],
        array: [...arr],
        note: `Берём key = arr[${i}] = ${key}`,
        explanation: `Достаём элемент ${key} (индекс ${i}) — его нужно вставить в правильное место среди элементов слева, которые уже отсортированы между собой.`,
        explanationIcon: "insert",
        variables: { i, key, j, comparisons },
        line: 2,
      });

      while (j >= 0) {
        comparisons++;
        const shouldShift = arr[j] > key;
        steps.push({
          type: "compare",
          indices: [j, i],
          array: [...arr],
          note: `arr[${j}]=${arr[j]} > key=${key}?`,
          explanation: shouldShift
            ? `Сравниваем: ${arr[j]} > ${key}. Да, arr[${j}] = ${arr[j]} больше чем key = ${key}. Значит сдвигаем ${arr[j]} вправо на освободившееся место.`
            : `Сравниваем: ${arr[j]} ≤ ${key}. Стоп! Нашли правильную позицию для key = ${key}: сразу после индекса ${j}.`,
          explanationIcon: "compare",
          stats: { comparisons, shifts },
          variables: { i, j, key, "A[j]": arr[j], comparisons, shifts },
          line: 4,
        });

        if (!shouldShift) {
          steps.push({
            type: "set", indices: [], array: [...arr],
            note: `arr[${j}] ≤ key — место найдено`,
            explanation: `arr[${j}] = ${arr[j]} ≤ key = ${key}, значит key должна быть после arr[${j}]. Вставляем key на позицию ${j + 1}.`,
            explanationIcon: "info",
            variables: { j, key }, line: 4,
          });
          break;
        }

        arr[j + 1] = arr[j];
        shifts++;
        steps.push({
          type: "set",
          indices: [j + 1],
          array: [...arr],
          note: `Сдвигаем arr[${j}] = ${arr[j + 1]} вправо`,
          explanation: `Элемент ${arr[j + 1]} сдвигаем на одну позицию вправо (${j} → ${j + 1}), освобождая место для вставки key. Продолжаем проверять следующие элементы левее.`,
          explanationIcon: "swap",
          stats: { comparisons, shifts },
          variables: { j, key, shifts },
          line: 5,
        });
        j--;
      }

      if (j + 1 !== i) {
        arr[j + 1] = key;
        steps.push({
          type: "set",
          indices: [j + 1],
          array: [...arr],
          note: `Вставляем key = ${key} в arr[${j + 1}]`,
          explanation: `Вставляем key = ${key} на позицию ${j + 1}. Теперь левая часть массива до индекса ${i} включительно отсортирована!`,
          explanationIcon: "insert",
          stats: { comparisons, shifts },
          variables: { i, j, key },
          line: 7,
        });
      } else {
        steps.push({
          type: "set",
          indices: [i],
          array: [...arr],
          note: `${key} уже на правильном месте`,
          explanation: `key = ${key} уже больше всех элементов слева — оставляем его на месте. Левая часть массива расширяется.`,
          explanationIcon: "info",
          variables: { i, key },
          line: 7,
        });
      }
    }

    steps.push({
      type: "highlight", indices: Array.from({ length: arr.length }, (_, i) => i), array: [...arr],
      note: "Готово! Массив отсортирован",
      explanation: `Сортировка вставками завершена! Выполнено ${comparisons} сравнений и ${shifts} сдвигов. Каждый элемент был вставлен на правильную позицию.`,
      explanationIcon: "found",
      stats: { comparisons, shifts }, line: 8,
    });
    return steps;
  }
}
