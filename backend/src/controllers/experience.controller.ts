import type { Request, Response } from "express";
import * as experienceService from "../services/experience.service.js";
import { ApiError } from "../utils/ApiError.js";
import { experienceQuerySchema } from "../validators/experience.query.js";

function operatorId(req: Request): string {
  if (!req.operator) throw ApiError.forbidden("Operator context required");
  return req.operator.id;
}

// ─── Public (traveler-facing) ───────────────────────────────────────────────

export async function listPublic(req: Request, res: Response) {
  const query = experienceQuerySchema.parse(req.query);
  const result = await experienceService.listPublicExperiences(query);
  res.status(200).json(result);
}

export async function getBySlug(req: Request, res: Response) {
  const experience = await experienceService.getPublicExperienceBySlug(
    req.params.slug,
    new Date(),
  );
  res.status(200).json({ experience });
}

export async function create(req: Request, res: Response) {
  const experience = await experienceService.createExperience(
    operatorId(req),
    req.body,
  );
  res.status(201).json({ experience });
}

export async function listMine(req: Request, res: Response) {
  const experiences = await experienceService.listOperatorExperiences(
    operatorId(req),
  );
  res.status(200).json({ experiences });
}

export async function getOne(req: Request, res: Response) {
  const experience = await experienceService.getOperatorExperience(
    req.params.id,
    operatorId(req),
  );
  res.status(200).json({ experience });
}

export async function update(req: Request, res: Response) {
  const experience = await experienceService.updateExperience(
    req.params.id,
    operatorId(req),
    req.body,
  );
  res.status(200).json({ experience });
}

export async function remove(req: Request, res: Response) {
  await experienceService.deleteExperience(req.params.id, operatorId(req));
  res.status(204).send();
}
