import { PrismaClient, UserProgress, Prisma } from "@prisma/client";

export class ProgressRepository {
  constructor(private prisma: PrismaClient) {}

  async getUserProgress(userId: number) {
    return this.prisma.userProgress.findMany({
      where: { user_id: userId },
      include: { algorithm: { select: { name: true, slug: true, category: true } } },
      orderBy: { updated_at: "desc" },
    });
  }

  async upsert(
    userId: number,
    algorithmId: number,
    data: Partial<{
      theory_completed: boolean;
      test_completed: boolean;
      practice_completed: boolean;
      score_percent: number;
    }>
  ): Promise<UserProgress> {
    return this.prisma.userProgress.upsert({
      where: { user_id_algorithm_id: { user_id: userId, algorithm_id: algorithmId } },
      create: {
        user_id: userId,
        algorithm_id: algorithmId,
        ...data,
        completed_at: this.isFullyCompleted(data) ? new Date() : null,
      },
      update: {
        ...data,
        updated_at: new Date(),
        completed_at: this.isFullyCompleted(data) ? new Date() : undefined,
      },
    });
  }

  private isFullyCompleted(data: { theory_completed?: boolean; test_completed?: boolean; practice_completed?: boolean }): boolean {
    return Boolean(data.theory_completed && data.test_completed && data.practice_completed);
  }
}
