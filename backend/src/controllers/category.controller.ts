import type { Request, Response } from "express";
import * as categoryService from "../services/category.service.js";

export async function list(_req: Request, res: Response) {
  const categories = await categoryService.listCategories();
  res.status(200).json({ categories });
}
