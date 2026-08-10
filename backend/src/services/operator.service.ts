import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { hashPassword } from "../utils/password.js";
import { issueTokens } from "../utils/jwt.js";
import { toPublicUser } from "./auth.service.js";
import type {
  OperatorSignupInput,
  OperatorUpdateInput,
} from "../validators/operator.schema.js";

/**
 * Registers an operator: creates a User (role OPERATOR) and a PENDING Operator
 * profile in one transaction. The account can log in immediately but cannot
 * publish experiences until an admin approves it.
 */
export async function signupOperator(input: OperatorSignupInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw ApiError.conflict("Email already registered");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      phone: input.phone,
      role: "OPERATOR",
      operator: {
        create: {
          businessName: input.businessName,
          description: input.description,
          status: "PENDING",
        },
      },
    },
    include: { operator: true },
  });

  const tokens = issueTokens({ sub: user.id, role: user.role });
  return { user: toPublicUser(user), operator: user.operator, ...tokens };
}

export async function getOperatorByUserId(userId: string) {
  const operator = await prisma.operator.findUnique({
    where: { userId },
  });
  if (!operator) {
    throw ApiError.notFound("Operator profile not found");
  }
  return operator;
}

export async function updateOperator(
  operatorId: string,
  input: OperatorUpdateInput,
) {
  return prisma.operator.update({
    where: { id: operatorId },
    data: input,
  });
}
