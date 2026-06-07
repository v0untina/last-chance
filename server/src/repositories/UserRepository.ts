import { PrismaClient, User, UserRole, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { ConflictError, NotFoundError } from "../utils/errors";
import { config } from "../config/env";

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { user_id: id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async create(data: {
    username: string;
    email: string;
    password: string;
    role?: UserRole;
  }): Promise<User> {
    const existingEmail = await this.findByEmail(data.email);
    if (existingEmail) throw new ConflictError("Email уже зарегистрирован");
    const existingUsername = await this.findByUsername(data.username);
    if (existingUsername) throw new ConflictError("Имя пользователя занято");

    const password_hash = await bcrypt.hash(data.password, config.BCRYPT_ROUNDS);
    return this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password_hash,
        role: data.role ?? UserRole.student,
      },
    });
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async listAll(params: { page: number; limit: number; role?: UserRole; search?: string }) {
    const where: Prisma.UserWhereInput = {};
    if (params.role) where.role = params.role;
    if (params.search) {
      where.OR = [
        { username: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        select: {
          user_id: true,
          username: true,
          email: true,
          role: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: items,
      meta: { page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit) },
    };
  }

  async updateRole(id: number, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundError("Пользователь");
    return this.prisma.user.update({ where: { user_id: id }, data: { role } });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { user_id: id } });
  }
}
