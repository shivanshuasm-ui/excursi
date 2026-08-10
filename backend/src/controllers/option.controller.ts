import type { Request, Response } from "express";
import * as optionService from "../services/option.service.js";
import { ApiError } from "../utils/ApiError.js";
import { listSlotsQuerySchema } from "../validators/option.schema.js";

function operatorId(req: Request): string {
  if (!req.operator) throw ApiError.forbidden("Operator context required");
  return req.operator.id;
}

export async function create(req: Request, res: Response) {
  const option = await optionService.createOption(
    req.params.id, // experience id
    operatorId(req),
    req.body,
  );
  res.status(201).json({ option });
}

export async function update(req: Request, res: Response) {
  const option = await optionService.updateOption(
    req.params.id, // option id
    operatorId(req),
    req.body,
  );
  res.status(200).json({ option });
}

export async function createSlot(req: Request, res: Response) {
  const slot = await optionService.createSlot(
    req.params.id, // option id
    operatorId(req),
    req.body,
  );
  res.status(201).json({ slot });
}

export async function listSlots(req: Request, res: Response) {
  const query = listSlotsQuerySchema.parse(req.query);
  const slots = await optionService.listSlots(req.params.id, query);
  res.status(200).json({ slots });
}
