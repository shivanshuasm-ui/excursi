import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";

/**
 * Restricts a route to the given roles. Must run after `authenticate`.
 * Usage: router.post("/", authenticate, requireRole("OPERATOR"), handler)
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden("Insufficient role");
    }
    next();
  };
}
