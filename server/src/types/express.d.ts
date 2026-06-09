import "express";

declare global {
  namespace Express {
    interface UserContext {
      user_id: number;
      username: string;
      email: string;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
