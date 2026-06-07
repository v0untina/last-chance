import { PrismaClient, UserSolution, Prisma } from "@prisma/client";
import { NotFoundError } from "../utils/errors";

export interface SubmitSolutionInput {
  user_id: number;
  task_id: number;
  code: string;
  language: string;
  execution_time?: number;
  result?: string;
  score?: number;
  is_correct?: boolean;
}

export class UserSolutionRepository {
  constructor(private prisma: PrismaClient) {}

  async submit(input: SubmitSolutionInput): Promise<UserSolution> {
    return this.prisma.userSolution.create({ data: input });
  }

  async findById(id: number): Promise<UserSolution | null> {
    return this.prisma.userSolution.findUnique({
      where: { solution_id: id },
      include: {
        task: { include: { algorithm: { select: { name: true, slug: true } } } },
        user: { select: { username: true, email: true } },
        ai_feedbacks: { orderBy: { created_at: "desc" }, take: 1 },
      },
    });
  }

  async findByUserAndTask(userId: number, taskId: number) {
    return this.prisma.userSolution.findMany({
      where: { user_id: userId, task_id: taskId },
      orderBy: { submission_date: "desc" },
      take: 10,
    });
  }

  async listByUser(userId: number, limit = 20) {
    return this.prisma.userSolution.findMany({
      where: { user_id: userId },
      include: { task: { include: { algorithm: { select: { name: true } } } } },
      orderBy: { submission_date: "desc" },
      take: limit,
    });
  }

  async listByTask(taskId: number, limit = 20) {
    return this.prisma.userSolution.findMany({
      where: { task_id: taskId },
      include: { user: { select: { username: true } } },
      orderBy: { submission_date: "desc" },
      take: limit,
    });
  }
}
