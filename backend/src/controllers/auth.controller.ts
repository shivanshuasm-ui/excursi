import type { Request, Response } from "express";
import * as authService from "../services/auth.service.js";
import { ApiError } from "../utils/ApiError.js";

export async function signup(req: Request, res: Response) {
  const result = await authService.signup(req.body);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  res.status(200).json(result);
}

export async function refresh(req: Request, res: Response) {
  const result = await authService.refresh(req.body.refreshToken);
  res.status(200).json(result);
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  const user = await authService.getMe(req.user.id);
  res.status(200).json({ user });
}
