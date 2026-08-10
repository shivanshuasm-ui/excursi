import type { Request, Response } from "express";
import * as adminService from "../services/admin.service.js";
import * as categoryService from "../services/category.service.js";
import {
  adminBookingsQuerySchema,
} from "../validators/admin.schema.js";

export async function pendingOperators(_req: Request, res: Response) {
  const operators = await adminService.listPendingOperators();
  res.status(200).json({ operators });
}

export async function verifyOperator(req: Request, res: Response) {
  const operator = await adminService.verifyOperator(req.params.id, req.body);
  res.status(200).json({ operator });
}

export async function bookings(req: Request, res: Response) {
  const query = adminBookingsQuerySchema.parse(req.query);
  const result = await adminService.listAllBookings(query);
  res.status(200).json(result);
}

export async function stats(_req: Request, res: Response) {
  const result = await adminService.getStats();
  res.status(200).json(result);
}

// ── Category management ──────────────────────────────────────────────────────

export async function createCategory(req: Request, res: Response) {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ category });
}

export async function updateCategory(req: Request, res: Response) {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  res.status(200).json({ category });
}

export async function deleteCategory(req: Request, res: Response) {
  await categoryService.deleteCategory(req.params.id);
  res.status(204).send();
}
