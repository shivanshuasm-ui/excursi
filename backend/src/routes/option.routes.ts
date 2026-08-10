import { Router } from "express";
import * as optionController from "../controllers/option.controller.js";
import { authenticate } from "../middleware/auth.js";
import {
  loadOperator,
  requireApprovedOperator,
} from "../middleware/operator.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createSlotSchema,
  updateOptionSchema,
} from "../validators/option.schema.js";

const router = Router();

// Public read: slots for an option (used by the traveler detail page).
router.get("/:id/slots", asyncHandler(optionController.listSlots));

// Operator writes.
router.put(
  "/:id",
  authenticate,
  asyncHandler(loadOperator),
  requireApprovedOperator,
  validateBody(updateOptionSchema),
  asyncHandler(optionController.update),
);
router.post(
  "/:id/slots",
  authenticate,
  asyncHandler(loadOperator),
  requireApprovedOperator,
  validateBody(createSlotSchema),
  asyncHandler(optionController.createSlot),
);

export default router;
