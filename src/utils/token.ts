import jwt from "jsonwebtoken";
import type { IUser } from "../models/User";

const JWT_EXPIRES_IN = "7d";

export function generateToken(user: IUser): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("Missing JWT_SECRET environment variable");
  }

  return jwt.sign({ id: user._id.toString(), role: user.role }, jwtSecret, {
    expiresIn: JWT_EXPIRES_IN,
  });
}
