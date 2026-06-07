import { UserRole, DifficultyLevel, QuestionType } from "@prisma/client";

export type { UserRole, DifficultyLevel, QuestionType };

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export interface JwtPayload {
  user_id: number;
  username: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    user_id: number;
    username: string;
    email: string;
    role: UserRole;
  };
  token: string;
  expiresIn: string;
}
