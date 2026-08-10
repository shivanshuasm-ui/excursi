import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
  issueTokens,
  verifyRefreshToken,
  type JwtPayload,
} from "../utils/jwt.js";
import type { LoginInput, SignupInput } from "../validators/auth.schema.js";

/** Strip the password hash before returning a user to clients. */
export function toPublicUser(user: User) {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export async function signup(input: SignupInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw ApiError.conflict("Email already registered");
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      name: input.name,
      phone: input.phone,
      role: "TRAVELER",
    },
  });

  const tokens = issueTokens({ sub: user.id, role: user.role });
  return { user: toPublicUser(user), ...tokens };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const tokens = issueTokens({ sub: user.id, role: user.role });
  return { user: toPublicUser(user), ...tokens };
}

export async function refresh(token: string) {
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  // Re-read the user so a role change or deletion is reflected immediately.
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw ApiError.unauthorized("User no longer exists");
  }

  return issueTokens({ sub: user.id, role: user.role });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { operator: true },
  });
  if (!user) {
    throw ApiError.notFound("User not found");
  }
  return toPublicUser(user);
}
