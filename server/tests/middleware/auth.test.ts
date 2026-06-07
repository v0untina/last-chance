import { describe, it, expect, beforeAll } from "vitest";
import jwt from "jsonwebtoken";
import { signToken, verifyToken } from "../../src/middleware/auth";
import { config } from "../../src/config/env";

describe("JWT auth", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret-for-jest-at-least-32-chars-long";
  });

  it("signs and verifies a valid token", () => {
    const payload = { user_id: 1, username: "alice", email: "a@b.c", role: "student" as const };
    const token = signToken(payload);
    expect(typeof token).toBe("string");
    const decoded = verifyToken(token);
    expect(decoded.user_id).toBe(payload.user_id);
    expect(decoded.email).toBe(payload.email);
  });

  it("rejects invalid token", () => {
    expect(() => verifyToken("invalid.token.here")).toThrow();
  });

  it("rejects expired token", async () => {
    const expiredToken = jwt.sign(
      { user_id: 1, username: "x", email: "x@x.x", role: "student" },
      config.JWT_SECRET,
      { expiresIn: "-1s" }
    );
    expect(() => verifyToken(expiredToken)).toThrow(jwt.TokenExpiredError);
  });
});
