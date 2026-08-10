import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  loginSchema,
  refreshSchema,
  signupSchema,
} from "../validators/auth.schema.js";

const router = Router();

router.post(
  "/signup",
  validateBody(signupSchema),
  asyncHandler(authController.signup),
);
router.post("/login", validateBody(loginSchema), asyncHandler(authController.login));
router.post(
  "/refresh",
  validateBody(refreshSchema),
  asyncHandler(authController.refresh),
);
router.get("/me", authenticate, asyncHandler(authController.me));

export default router;
