import { BaseEngine, type Step } from "../AlgorithmEngine";

export class QueueEngine extends BaseEngine {
  readonly name = "Queue (Очередь)";
  readonly pseudocode = [
    "class Queue:",
    "  function enqueue(x):",
    "    items.push(x)         // O(1)",
    "  function dequeue():",
    "    return items.shift()  // O(1) с LinkedList",
    "  function front():",
    "    return items[0]       // O(1)",
    "  function isEmpty():",
    "    return items.length == 0",
  ];

  generateSteps(input: number[]): Step[] {
    const queue: number[] = [];
    const steps: Step[] = [];
    const display: number[] = [];

    steps.push({
      type: "reset", indices: [], array: [],
      note: "Демонстрация работы очереди (FIFO)",
      explanation: "Очередь работает по принципу FIFO (First In, First Out). Элементы добавляются в конец (enqueue) и извлекаются из начала (dequeue). Покажем: enqueue(1), enqueue(2), enqueue(3), dequeue(), dequeue(), enqueue(4), dequeue(), dequeue().",
      explanationIcon: "info", line: 1,
    });

    interface QueueOp { op: "enqueue" | "dequeue"; val?: number }
    const ops: QueueOp[] = [
      { op: "enqueue", val: 1 },
      { op: "enqueue", val: 2 },
      { op: "enqueue", val: 3 },
      { op: "dequeue" },
      { op: "dequeue" },
      { op: "enqueue", val: 4 },
      { op: "dequeue" },
      { op: "dequeue" },
    ];

    for (const op of ops) {
      if (op.op === "enqueue") {
        queue.push(op.val!);
        display.push(op.val!);
        steps.push({
          type: "set", indices: [], array: [...display],
          note: `enqueue(${op.val}) → очередь: [${queue.join(", ")}]`,
          explanation: `Добавляем ${op.val} в конец очереди. Первый в очереди: ${queue[0]}, последний: ${queue[queue.length - 1]}. Размер: ${queue.length}.`,
          explanationIcon: "insert",
          variables: { last: op.val, first: queue[0], size: queue.length },
          line: 2,
        });
      } else {
        const val = queue.shift()!;
        display.shift();
        steps.push({
          type: "splice", indices: [0], array: [...display],
          note: `dequeue() → ${val}, очередь: [${queue.join(", ")}]`,
          explanation: `Извлекаем ${val} из начала очереди. Первый в очереди: ${queue.length > 0 ? queue[0] : "пусто"}. Размер: ${queue.length}.`,
          explanationIcon: "swap",
          variables: { removed: val, first: queue.length > 0 ? queue[0] : "null", size: queue.length },
          line: 4,
        });
      }
    }

    steps.push({
      type: "highlight", indices: [], array: [...display],
      note: "Демонстрация завершена",
      explanation: "Очередь пуста. Принцип FIFO: первый добавленный (1) был извлечён первым. Всего выполнено 4 enqueue и 4 dequeue операции.",
      explanationIcon: "found",
      line: 7,
    });
    return steps;
  }
}
