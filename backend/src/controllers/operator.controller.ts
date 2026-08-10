import type { Request, Response } from "express";
import * as operatorService from "../services/operator.service.js";
import { ApiError } from "../utils/ApiError.js";

export async function signup(req: Request, res: Response) {
  const result = await operatorService.signupOperator(req.body);
  res.status(201).json(result);
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const operator = await operatorService.getOperatorByUserId(req.user.id);
  res.status(200).json({ operator });
}

export async function update(req: Request, res: Response) {
  if (!req.operator) throw ApiError.forbidden();
  const operator = await operatorService.updateOperator(
    req.operator.id,
    req.body,
  );
  res.status(200).json({ operator });
}
