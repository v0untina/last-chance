import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { config } from "../config/env";
import { ConflictError, UnauthorizedError } from "../utils/errors";

const SALT_ROUNDS = 12;

export class AuthService {
  async register(username: string, email: string, password: string) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      if (existing.email === email) throw new ConflictError("Email уже используется");
      throw new ConflictError("Имя пользователя уже занято");
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { username, email, password_hash },
    });

    return { user: this.sanitize(user), token: this.generateToken(user) };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedError("Неверный email или пароль");

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedError("Неверный email или пароль");

    return { user: this.sanitize(user), token: this.generateToken(user) };
  }

  async getUserById(userId: number) {
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!user) throw new UnauthorizedError("Пользователь не найден");
    return this.sanitize(user);
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, config.JWT_SECRET) as { user_id: number; username: string; email: string };
    } catch {
      throw new UnauthorizedError("Недействительный токен");
    }
  }

  private generateToken(user: { user_id: number; username: string; email: string }) {
    return jwt.sign(
      { user_id: user.user_id, username: user.username, email: user.email },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as any }
    );
  }

  private sanitize(user: { user_id: number; username: string; email: string; password_hash: string; created_at: Date; updated_at: Date }) {
    return { user_id: user.user_id, username: user.username, email: user.email, created_at: user.created_at };
  }
}
