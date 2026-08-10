import { Router } from "express";
import * as operatorController from "../controllers/operator.controller.js";
import { authenticate } from "../middleware/auth.js";
import { loadOperator } from "../middleware/operator.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  operatorSignupSchema,
  operatorUpdateSchema,
} from "../validators/operator.schema.js";

const router = Router();

router.post(
  "/signup",
  validateBody(operatorSignupSchema),
  asyncHandler(operatorController.signup),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(loadOperator),
  asyncHandler(operatorController.me),
);

router.put(
  "/me",
  authenticate,
  asyncHandler(loadOperator),
  validateBody(operatorUpdateSchema),
  asyncHandler(operatorController.update),
);

export default router;
