import { describe, it, expect, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { generateToken } from "../token";
import type { IUser } from "../../models/User";

describe("generateToken", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it("signs a token containing the user's id and role", () => {
    const fakeUser = {
      _id: { toString: () => "507f1f77bcf86cd799439011" },
      role: "admin",
    } as unknown as IUser;

    const token = generateToken(fakeUser);
    const decoded = jwt.verify(token, "test-secret") as { id: string; role: string };

    expect(decoded.id).toBe("507f1f77bcf86cd799439011");
    expect(decoded.role).toBe("admin");
  });

  it("sets a 7 day expiry", () => {
    const fakeUser = {
      _id: { toString: () => "507f1f77bcf86cd799439011" },
      role: "adjuster",
    } as unknown as IUser;

    const token = generateToken(fakeUser);
    const decoded = jwt.verify(token, "test-secret") as { iat: number; exp: number };

    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
  });

  it("throws when JWT_SECRET is not configured", () => {
    delete process.env.JWT_SECRET;
    const fakeUser = {
      _id: { toString: () => "507f1f77bcf86cd799439011" },
      role: "adjuster",
    } as unknown as IUser;

    expect(() => generateToken(fakeUser)).toThrow("Missing JWT_SECRET");
  });
});
