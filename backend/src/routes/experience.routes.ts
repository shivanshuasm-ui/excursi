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

// All routes here are operator-scoped. Operator reads only need a profile;
// writes additionally require an APPROVED operator.
router.use(authenticate, asyncHandler(loadOperator));

// Reads (own experiences). Literal `/mine` is declared before `/:id`-style
// public routes that Phase 2 will add.
router.get("/mine", asyncHandler(experienceController.listMine));
router.get("/mine/:id", asyncHandler(experienceController.getOne));

// Writes.
router.post(
  "/",
  requireApprovedOperator,
  validateBody(createExperienceSchema),
  asyncHandler(experienceController.create),
);
router.put(
  "/:id",
  requireApprovedOperator,
  validateBody(updateExperienceSchema),
  asyncHandler(experienceController.update),
);
router.delete(
  "/:id",
  requireApprovedOperator,
  asyncHandler(experienceController.remove),
);

// Options nested under an experience.
router.post(
  "/:id/options",
  requireApprovedOperator,
  validateBody(createOptionSchema),
  asyncHandler(optionController.create),
);

export default router;
