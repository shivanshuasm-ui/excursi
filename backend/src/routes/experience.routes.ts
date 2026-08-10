import { Router } from "express";
import * as experienceController from "../controllers/experience.controller.js";
import * as optionController from "../controllers/option.controller.js";
import { authenticate } from "../middleware/auth.js";
import {
  loadOperator,
  requireApprovedOperator,
} from "../middleware/operator.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createExperienceSchema,
  updateExperienceSchema,
} from "../validators/experience.schema.js";
import { createOptionSchema } from "../validators/option.schema.js";

const router = Router();

// Middleware chains. Reads need an operator profile; writes need it APPROVED.
const asOperator = [authenticate, asyncHandler(loadOperator)];
const asApprovedOperator = [...asOperator, requireApprovedOperator];

// ── Public (traveler) ───────────────────────────────────────────────────────
// GET "/" is exact; GET "/:slug" is registered LAST so the literal operator
// routes ("/mine", "/mine/:id") and all writes take precedence.
router.get("/", asyncHandler(experienceController.listPublic));

// ── Operator: reads ──────────────────────────────────────────────────────────
router.get(
  "/mine",
  ...asOperator,
  asyncHandler(experienceController.listMine),
);
router.get(
  "/mine/:id",
  ...asOperator,
  asyncHandler(experienceController.getOne),
);

// ── Operator: writes (require APPROVED) ──────────────────────────────────────
router.post(
  "/",
  ...asApprovedOperator,
  validateBody(createExperienceSchema),
  asyncHandler(experienceController.create),
);
router.put(
  "/:id",
  ...asApprovedOperator,
  validateBody(updateExperienceSchema),
  asyncHandler(experienceController.update),
);
router.delete(
  "/:id",
  ...asApprovedOperator,
  asyncHandler(experienceController.remove),
);
router.post(
  "/:id/options",
  ...asApprovedOperator,
  validateBody(createOptionSchema),
  asyncHandler(optionController.create),
);

// ── Public detail (must be last: single-segment GET catch-all) ───────────────
router.get("/:slug", asyncHandler(experienceController.getBySlug));

export default router;
