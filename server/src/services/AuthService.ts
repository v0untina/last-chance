import { UserRepository } from "../repositories/UserRepository";
import { signToken } from "../middleware/auth";
import { UnauthorizedError } from "../utils/errors";
import { AuthResponse, LoginRequest, RegisterRequest } from "../types";

export class AuthService {
  constructor(private users: UserRepository) {}

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const user = await this.users.create({
      username: data.username,
      email: data.email,
      password: data.password,
    });

    const token = signToken({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    };
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const user = await this.users.findByEmail(data.email);
    if (!user) throw new UnauthorizedError("Неверный email или пароль");

    const valid = await this.users.verifyPassword(data.password, user.password_hash);
    if (!valid) throw new UnauthorizedError("Неверный email или пароль");

    const token = signToken({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    };
  }

  async me(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedError();
    return {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }
}
