import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, infer as zInfer } from "zod";

/** Validates and replaces req.body with the parsed result. */
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body) as zInfer<T>;
    next();
  };
}
