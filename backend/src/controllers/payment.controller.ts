import type { Request, Response } from "express";
import * as paymentService from "../services/payment.service.js";
import { ApiError } from "../utils/ApiError.js";

function userId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.id;
}

export async function createOrder(req: Request, res: Response) {
  const result = await paymentService.createOrder(userId(req), req.body);
  res.status(201).json(result);
}

export async function verify(req: Request, res: Response) {
  const result = await paymentService.verifyPayment(userId(req), req.body);
  res.status(200).json(result);
}
