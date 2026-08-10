import type { NextFunction, Request, Response } from "express";
import type { Operator } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";

// Augment Express Request with the loaded operator profile.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      operator?: Operator;
    }
  }
}

/** Loads req.user's operator profile onto req.operator. Run after authenticate. */
export async function loadOperator(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  const operator = await prisma.operator.findUnique({
    where: { userId: req.user.id },
  });
  if (!operator) {
    throw ApiError.forbidden("No operator profile for this account");
  }
  req.operator = operator;
  next();
}

/** Requires the loaded operator to be APPROVED. Run after loadOperator. */
export function requireApprovedOperator(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.operator) {
    throw ApiError.forbidden("No operator profile for this account");
  }
  if (req.operator.status !== "APPROVED") {
    throw ApiError.forbidden(
      `Operator is not approved (status: ${req.operator.status})`,
    );
  }
  next();
}
