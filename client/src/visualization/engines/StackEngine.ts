import { BaseEngine, type Step } from "../AlgorithmEngine";

export class StackEngine extends BaseEngine {
  readonly name = "Stack (Стек)";
  readonly pseudocode = [
    "class Stack:",
    "  function push(x):",
    "    items.push(x)        // O(1)",
    "  function pop():",
    "    return items.pop()   // O(1)",
    "  function peek():",
    "    return items[last]   // O(1)",
    "  function isEmpty():",
    "    return items.length == 0",
  ];

  generateSteps(input: number[]): Step[] {
    const stack: number[] = [];
    const steps: Step[] = [];
    const display: number[] = [];

    steps.push({
      type: "reset", indices: [], array: [],
      note: "Демонстрация работы стека (LIFO)",
      explanation: "Стек работает по принципу LIFO (Last In, First Out). Элементы добавляются на вершину (push) и удаляются с вершины (pop). Покажем последовательность операций push(1), push(2), push(3), pop(), pop(), push(4), pop(), pop().",
      explanationIcon: "info", line: 1,
    });

    const ops: Array<{ op: "push"; val: number } | { op: "pop" }> = [
      { op: "push", val: 1 },
      { op: "push", val: 2 },
      { op: "push", val: 3 },
      { op: "pop" },
      { op: "pop" },
      { op: "push", val: 4 },
      { op: "pop" },
      { op: "pop" },
    ];

    for (const op of ops) {
      if (op.op === "push") {
        stack.push(op.val);
        display.push(op.val);
        steps.push({
          type: "set", indices: [display.length - 1], array: [...display],
          note: `push(${op.val}) → стек: [${stack.join(", ")}]`,
          explanation: `Добавляем ${op.val} на вершину стека. Теперь на вершине — ${op.val}. Размер стека: ${stack.length}.`,
          explanationIcon: "insert",
          variables: { top: op.val, size: stack.length },
          line: 2,
        });
      } else {
        const val = stack.pop();
        display.pop();
        steps.push({
          type: "splice", indices: [display.length], array: [...display],
          note: `pop() → ${val}, стек: [${stack.join(", ")}]`,
          explanation: `Извлекаем ${val} с вершины стека. Теперь на вершине — ${stack.length > 0 ? stack[stack.length - 1] : "пусто"}. Размер стека: ${stack.length}.`,
          explanationIcon: "swap",
          variables: { popped: val, top: stack.length > 0 ? stack[stack.length - 1] : "null", size: stack.length },
          line: 4,
        });
      }
    }

    steps.push({
      type: "highlight", indices: [], array: [...display],
      note: "Демонстрация завершена",
      explanation: "Стек пуст. Принцип LIFO: последний добавленный (4) был извлечён первым. Всего выполнено 4 push и 4 pop операций.",
      explanationIcon: "found",
      line: 7,
    });
    return steps;
  }
}
