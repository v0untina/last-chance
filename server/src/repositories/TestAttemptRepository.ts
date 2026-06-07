import { PrismaClient, TestAttempt, AttemptStatus, Prisma } from "@prisma/client";
import { NotFoundError } from "../utils/errors";

export interface StartAttemptInput {
  test_id: number;
  user_id: number;
}

export interface SubmitAttemptInput {
  attempt_id: number;
  user_id: number;
  answers: Array<{
    question_id: number;
    answer_text: string;
  }>;
}

export class TestAttemptRepository {
  constructor(private prisma: PrismaClient) {}

  async start({ test_id, user_id }: StartAttemptInput): Promise<TestAttempt> {
    const test = await this.prisma.test.findUnique({
      where: { test_id },
      include: { questions: { include: { options: true } } },
    });
    if (!test) throw new NotFoundError("Тест");

    const maxScore = test.questions.reduce((sum, q) => {
      if (q.question_type === "short_answer") return sum + 1;
      return sum + q.options.filter((o) => o.is_correct).length || 1;
    }, 0);

    return this.prisma.testAttempt.create({
      data: {
        test_id,
        user_id,
        status: AttemptStatus.in_progress,
        max_score: maxScore,
        score: 0,
        passed: false,
      },
    });
  }

  async submit({ attempt_id, user_id, answers }: SubmitAttemptInput): Promise<TestAttempt> {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { attempt_id },
      include: { test: { include: { questions: { include: { options: true } } } } },
    });
    if (!attempt) throw new NotFoundError("Попытка");
    if (attempt.user_id !== user_id) throw new NotFoundError("Попытка");
    if (attempt.status === AttemptStatus.completed) {
      throw new NotFoundError("Попытка уже завершена");
    }

    let score = 0;
    const userAnswerData: Prisma.UserAnswerCreateManyInput[] = [];

    for (const ans of answers) {
      const question = attempt.test.questions.find((q) => q.question_id === ans.question_id);
      if (!question) continue;

      const isCorrect = this.checkAnswer(question, ans.answer_text);
      if (isCorrect) score += 1;
      userAnswerData.push({
        attempt_id,
        question_id: ans.question_id,
        answer_text: ans.answer_text,
        is_correct: isCorrect,
      });
    }

    await this.prisma.userAnswer.createMany({ data: userAnswerData });
    const passed =
      attempt.max_score > 0 ? (score / attempt.max_score) * 100 >= attempt.test.passing_score : false;

    return this.prisma.testAttempt.update({
      where: { attempt_id },
      data: {
        score,
        passed,
        status: AttemptStatus.completed,
        completed_at: new Date(),
      },
    });
  }

  private checkAnswer(
    question: { question_type: string; options: Array<{ option_id: number; is_correct: boolean }>; correct_answer: string | null },
    answerText: string
  ): boolean {
    if (question.question_type === "short_answer") {
      return question.correct_answer
        ? answerText.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()
        : false;
    }
    const correctIds = new Set(
      question.options.filter((o) => o.is_correct).map((o) => o.option_id)
    );
    const selectedIds = new Set(answerText.split(",").map((s) => parseInt(s.trim(), 10)).filter(Boolean));
    if (correctIds.size !== selectedIds.size) return false;
    for (const id of correctIds) if (!selectedIds.has(id)) return false;
    return true;
  }

  async findById(id: number) {
    return this.prisma.testAttempt.findUnique({
      where: { attempt_id: id },
      include: {
        test: { select: { title: true, passing_score: true } },
        answers: { include: { question: { include: { options: true } } } },
      },
    });
  }

  async findByUser(userId: number, limit = 20) {
    return this.prisma.testAttempt.findMany({
      where: { user_id: userId },
      include: { test: { select: { title: true, algorithm_id: true } } },
      orderBy: { started_at: "desc" },
      take: limit,
    });
  }
}
