import { PrismaClient, Algorithm, UserProgress, DifficultyLevel, Prisma } from "@prisma/client";
import { PaginatedResponse, PaginationParams } from "../types";

export interface AlgorithmFilters {
  category?: string;
  difficulty?: DifficultyLevel;
  search?: string;
}

export class AlgorithmRepository {
  constructor(private prisma: PrismaClient) {}

  async findMany(
    filters: AlgorithmFilters,
    pagination: PaginationParams,
    userId?: number
  ): Promise<PaginatedResponse<Algorithm & { progress?: UserProgress | null }>> {
    const where: Prisma.AlgorithmWhereInput = {};
    if (filters.category) where.category = filters.category;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.algorithm.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { name: "asc" },
        include: userId
          ? { progress: { where: { user_id: userId } } }
          : undefined,
      }),
      this.prisma.algorithm.count({ where }),
    ]);

    return {
      data: items as any,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findById(id: number, userId?: number) {
    return this.prisma.algorithm.findUnique({
      where: { algorithm_id: id },
      include: {
        theory_materials: { orderBy: { order_num: "asc" } },
        tests: {
          include: { questions: { include: { options: true }, orderBy: { order_num: "asc" } } },
        },
        tasks: { orderBy: { order_num: "asc" } },
        progress: userId ? { where: { user_id: userId } } : false,
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.algorithm.findUnique({ where: { slug } });
  }

  async create(data: Prisma.AlgorithmCreateInput): Promise<Algorithm> {
    return this.prisma.algorithm.create({ data });
  }

  async update(id: number, data: Prisma.AlgorithmUpdateInput): Promise<Algorithm> {
    return this.prisma.algorithm.update({ where: { algorithm_id: id }, data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.algorithm.delete({ where: { algorithm_id: id } });
  }
}
