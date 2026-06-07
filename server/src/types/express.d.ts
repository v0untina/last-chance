export interface AuthenticatedUser {
  user_id: number;
  username: string;
  email: string;
  role: "student" | "teacher" | "admin";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

export {};
