import { BaseEngine, type Step } from "../AlgorithmEngine";

export class BubbleSortEngine extends BaseEngine {
  readonly name = "Bubble Sort";
  readonly pseudocode = [
    "procedure bubbleSort(A):",
    "  for i = 0 to n-2:",
    "    swapped = false",
    "    for j = 0 to n-2-i:",
    "      if A[j] > A[j+1]:",
    "        swap A[j] and A[j+1]",
    "        swapped = true",
    "    if not swapped:",
    "      break  // массив отсортирован",
    "  return A",
  ];

  generateSteps(input: number[]): Step[] {
    const arr = [...input];
    const steps: Step[] = [];
    let comparisons = 0;
    let swaps = 0;
    const n = arr.length;
    const sortedFrom = new Set<number>();

    steps.push({
      type: "reset", indices: [], array: [...arr],
      note: "Запускаем пузырьковую сортировку",
      explanation: "Будем проходиться по массиву, сравнивая соседние элементы и меняя их, если они в неправильном порядке. Самые большие элементы «всплывают» в конец как пузырьки.",
      explanationIcon: "info", line: 1,
    });

    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      steps.push({
        type: "set", indices: [], array: [...arr],
        note: `Внешний проход ${i + 1}`,
        explanation: `Начинаем проход №${i + 1}. После каждого прохода самый большой элемент «всплывает» в конец. arr[${n - 1 - i}] уже на своём месте — его не трогаем.`,
        explanationIcon: "progress",
        variables: { i }, line: 2,
      });
      for (let j = 0; j < n - 1 - i; j++) {
        comparisons++;
        const shouldSwap = arr[j] > arr[j + 1];
        steps.push({
          type: "compare",
          indices: [j, j + 1],
          array: [...arr],
          note: `Сравниваем arr[${j}]=${arr[j]} и arr[${j + 1}]=${arr[j + 1]}`,
          explanation: shouldSwap
            ? `Сравниваем соседей: ${arr[j]} и ${arr[j + 1]}. ${arr[j]} > ${arr[j + 1]} — порядок нарушен, нужно поменять их местами!`
            : `Сравниваем соседей: ${arr[j]} и ${arr[j + 1]}. ${arr[j]} ≤ ${arr[j + 1]} — порядок верный, оставляем как есть.`,
          explanationIcon: "compare",
          stats: { comparisons, swaps },
          variables: { i, j, "A[j]": arr[j], "A[j+1]": arr[j + 1], comparisons, swaps },
          line: 4,
        });
        if (shouldSwap) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          swaps++;
          swapped = true;
          steps.push({
            type: "swap",
            indices: [j, j + 1],
            array: [...arr],
            note: `Меняем arr[${j}]↔arr[${j + 1}]`,
            explanation: `Меняем местами: ${arr[j + 1]} → позиция ${j}, ${arr[j]} → позиция ${j + 1}. Больший элемент «всплывает» вправо.`,
            explanationIcon: "swap",
            stats: { comparisons, swaps },
            variables: { i, j, comparisons, swaps },
            line: 5,
          });
        }
      }
      sortedFrom.add(n - 1 - i);
      steps.push({
        type: "highlight",
        indices: [n - 1 - i],
        array: [...arr],
        note: `arr[${n - 1 - i}] = ${arr[n - 1 - i]} на своём месте`,
        explanation: `Элемент ${arr[n - 1 - i]} «всплыл» на позицию ${n - 1 - i}. Это его окончательное положение — можно исключить его из следующих проходов.`,
        explanationIcon: "info",
        stats: { comparisons, swaps },
        variables: { i, swapped, comparisons, swaps },
        line: 7,
      });
      if (!swapped) {
        for (let k = 0; k < n - 1 - i; k++) sortedFrom.add(k);
        steps.push({
          type: "set", indices: [], array: [...arr],
          note: "Нет обменов — массив отсортирован",
          explanation: "За весь проход не было ни одного обмена! Это значит, что все элементы уже на своих местах. Досрочно завершаем сортировку.",
          explanationIcon: "found",
          variables: { swapped }, line: 8,
        });
        break;
      }
    }
    if (n > 0) {
      sortedFrom.add(0);
      steps.push({
        type: "highlight", indices: Array.from({ length: n }, (_, i) => i), array: [...arr],
        note: "Готово! Массив отсортирован",
        explanation: `Сортировка завершена! Выполнено ${comparisons} сравнений и ${swaps} обменов. Массив упорядочен по возрастанию.`,
        explanationIcon: "found",
        stats: { comparisons, swaps }, line: 9,
      });
    }
    return steps;
  }
}
