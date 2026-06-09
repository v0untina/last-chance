import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { aiFactory } from "../ai/factory";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { logger } from "../config/logger";

const QUESTIONS_TO_PASS = 3;

interface QuestionShape {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  explanations: string[];
}

function fallbackQuestion(algorithmName: string): QuestionShape {
  const qs = [
    {
      question: `Какова временная сложность алгоритма "${algorithmName}" в худшем случае?`,
      options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
      correctIndex: 1,
      explanation: "Временная сложность зависит от конкретного алгоритма. Изучите раздел 'Сложность'.",
      explanations: [
        "O(n) — линейная сложность. Это неверно, потому что алгоритмы сортировки обычно выполняют больше операций, чем количество элементов. Например, пузырьковая сортировка делает n проходов по массиву, каждый проход сравнивает соседние элементы, и в худшем случае количество сравнений равно n * (n-1) / 2, что даёт квадратичную зависимость, а не линейную.",
        "O(n²) — квадратичная сложность. Это верный ответ для большинства простых алгоритмов сортировки в худшем случае. Когда массив отсортирован в обратном порядке, каждый элемент приходится перемещать через всю последовательность, и количество операций растёт пропорционально квадрату размера массива.",
        "O(log n) — логарифмическая сложность. Это неверно, такая характеристика свойственна бинарному поиску, где на каждом шаге область поиска сокращается вдвое. Алгоритмы сортировки требуют как минимум просмотра всех элементов, поэтому их сложность не может быть логарифмической.",
        "O(1) — константная сложность. Это неверно, потому что время выполнения алгоритмов сортировки всегда зависит от размера входных данных. Даже в лучшем случае, когда массив уже отсортирован, алгоритму нужно хотя бы проверить порядок элементов, что требует линейного времени.",
      ],
    },
    {
      question: `Что из перечисленного лучше всего описывает принцип работы "${algorithmName}"?`,
      options: [
        "Разделяй и властвуй",
        "Последовательное сравнение элементов",
        "Сортировка вставками",
        "Рекурсивный обход",
      ],
      correctIndex: 0,
      explanation: "Изучите описание алгоритма в теоретическом блоке.",
      explanations: [
        "\"Разделяй и властвуй\" — верно. Этот принцип означает, что задача разбивается на несколько меньших подзадач того же типа, каждая решается независимо, а затем результаты объединяются. Например, быстрая сортировка выбирает опорный элемент, делит массив на две части относительно него и рекурсивно сортирует каждую часть.",
        "Последовательное сравнение элементов — неверно. Это описание линейного поиска или простейшей сортировки вставками, где каждый элемент поочерёдно сравнивается с соседями. Данный алгоритм использует более сложную стратегию, основанную на рекурсивном делении данных на части.",
        "Сортировка вставками — неверно. Это самостоятельный алгоритм, который строит отсортированный массив постепенно, вставляя каждый новый элемент на правильную позицию. Его сложность O(n²), но он не использует принцип разделения задачи на подзадачи, в отличие от нашего алгоритма.",
        "Рекурсивный обход — неверно. Рекурсивный обход характерен для работы с деревьями и графами, где нужно посетить каждый узел. Хотя данный алгоритм может использовать рекурсию для деления массива, его ключевая идея — не просто обход, а именно разделение данных и последующее объединение.",
      ],
    },
    {
      question: `Какую структуру данных чаще всего используют в "${algorithmName}"?`,
      options: ["Массив", "Связный список", "Дерево", "Хеш-таблица"],
      correctIndex: 0,
      explanation: "Алгоритм работает с последовательностью элементов, чаще всего с массивом.",
      explanations: [
        "Массив — верно. Массив обеспечивает произвольный доступ к любому элементу по индексу за O(1), что критически важно для алгоритма. Мы можем мгновенно получить элемент по любой позиции, менять элементы местами и сравнивать их. Без произвольного доступа эффективная реализация была бы невозможна.",
        "Связный список — неверно. В связном списке нет произвольного доступа — чтобы получить элемент по индексу, нужно пройти по всем предыдущим узлам, что даёт O(n) на каждое обращение. Это сделало бы алгоритм чрезвычайно медленным, так как алгоритму приходится часто обращаться к элементам по разным индексам.",
        "Дерево — неверно. Деревья используются для других задач, например, для бинарного поиска (двоичное дерево поиска) или представления иерархических данных. Данный алгоритм работает с плоской последовательностью элементов, где важен порядок следования, а не иерархическая структура.",
        "Хеш-таблица — неверно. Хеш-таблицы обеспечивают быстрый поиск по ключу, но не поддерживают упорядоченное хранение элементов. Для алгоритмов сортировки критически важен порядок элементов и возможность сравнивать их относительно друг друга, что хеш-таблицы не обеспечивают.",
      ],
    },
    {
      question: `Для каких задач обычно применяется "${algorithmName}"?`,
      options: ["Поиск элемента", "Сортировка данных", "Обход графа", "Сжатие данных"],
      correctIndex: 1,
      explanation: "Изучите практическое применение алгоритма в разделе 'Примеры'.",
      explanations: [
        "Поиск элемента — не основное назначение. Для поиска существуют специальные алгоритмы, такие как бинарный поиск для отсортированных массивов или поиск в глубину/ширину для графов. Данный алгоритм не предназначен для нахождения конкретного значения среди множества данных.",
        "Сортировка данных — верно. Основная задача алгоритма — упорядочивание элементов массива по возрастанию или убыванию. Сортировка применяется повсеместно: от организации списка контактов до подготовки данных для бинарного поиска и оптимизации работы баз данных.",
        "Обход графа — неверно. Обход графа выполняется алгоритмами BFS (поиск в ширину) и DFS (поиск в глубину). Эти алгоритмы используют очередь или стек для посещения узлов графа. Данный алгоритм работает только с линейными последовательностями, а не с графами.",
        "Сжатие данных — неверно. Сжатие данных — это отдельная область алгоритмов, таких как Хаффман, LZW или арифметическое кодирование. Эти алгоритмы используют статистические закономерности для уменьшения объёма данных, что совершенно не связано с упорядочиванием элементов.",
      ],
    },
  ];
  return qs[Math.floor(Math.random() * qs.length)];
}

export class TheoryController {
  generateQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const materialId = parseInt(req.params.materialId, 10);
      if (isNaN(materialId)) throw new BadRequestError("Invalid materialId");

      const material = await prisma.theoryMaterial.findUnique({
        where: { material_id: materialId },
        include: { algorithm: true },
      });
      if (!material) throw new NotFoundError("Theory material not found");

      let question: QuestionShape;

      try {
        const aiQuestion = await aiFactory.generateQuestionWithFallback({
          algorithmName: material.algorithm.name,
          topic: material.title,
          difficulty: "medium",
        });

        if (aiQuestion?.question_text && aiQuestion.options?.length) {
          const correctIdx = aiQuestion.options.findIndex((o) => o.is_correct);
          question = {
            question: aiQuestion.question_text,
            options: aiQuestion.options.map((o) => o.text),
            correctIndex: correctIdx >= 0 ? correctIdx : 0,
            explanation: aiQuestion.explanation ?? "",
            explanations: aiQuestion.options.map((o) => o.explanation ?? ""),
          };
        } else {
          question = fallbackQuestion(material.algorithm.name);
        }
      } catch (e) {
        logger.warn("[TheoryController] AI generate failed, using fallback", { error: (e as Error).message });
        question = fallbackQuestion(material.algorithm.name);
      }

      res.json({ data: question });
    } catch (e) {
      next(e);
    }
  };

  checkAnswer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const materialId = parseInt(req.params.materialId, 10);
      if (isNaN(materialId)) throw new BadRequestError("Invalid materialId");
      const userId = req.user?.user_id;
      if (!userId) throw new BadRequestError("Not authenticated");

      const material = await prisma.theoryMaterial.findUnique({
        where: { material_id: materialId },
        include: { algorithm: true },
      });
      if (!material) throw new NotFoundError("Theory material not found");

      const { is_correct, question_text, selected_answer, correct_answer, previousQuestion } = req.body as {
        is_correct: boolean;
        question_text: string;
        selected_answer: string;
        correct_answer: string;
        previousQuestion?: string;
      };

      // Save the attempt
      await prisma.quizAttempt.create({
        data: {
          user_id: userId,
          algorithm_id: material.algorithm_id,
          material_id: materialId,
          question_text,
          selected_answer,
          correct_answer,
          is_correct,
        },
      });

      // Count stats for this material
      const total = await prisma.quizAttempt.count({ where: { user_id: userId, material_id: materialId } });
      const correct = await prisma.quizAttempt.count({ where: { user_id: userId, material_id: materialId, is_correct: true } });
      const wrong = total - correct;

      const materialPassed = correct >= QUESTIONS_TO_PASS;

      if (materialPassed) {
        res.json({
          data: { passed: true, attempt: { total, correct, wrong } },
        });
        return;
      }

      // Generate next question
      let nextQuestion: object | null = null;
      try {
        const aiQuestion = await aiFactory.generateQuestionWithFallback({
          algorithmName: material.algorithm.name,
          topic: material.title,
          difficulty: "medium",
          previousQuestion,
        });

        if (aiQuestion?.question_text && aiQuestion.options?.length) {
          const correctIdx = aiQuestion.options.findIndex((o) => o.is_correct);
          nextQuestion = {
            question: aiQuestion.question_text,
            options: aiQuestion.options.map((o) => o.text),
            correctIndex: correctIdx >= 0 ? correctIdx : 0,
            explanation: aiQuestion.explanation ?? "",
            explanations: aiQuestion.options.map((o) => o.explanation ?? ""),
          };
        }
      } catch (e) {
        logger.warn("[TheoryController] AI next question failed", { error: (e as Error).message });
      }

      if (!nextQuestion) {
        const fb = fallbackQuestion(material.algorithm.name);
        nextQuestion = { ...fb };
      }

      res.json({
        data: { passed: false, attempt: { total, correct, wrong }, nextQuestion },
      });
    } catch (e) {
      next(e);
    }
  };
}
