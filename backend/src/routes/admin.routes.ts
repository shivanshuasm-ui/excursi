import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createCategorySchema,
  updateCategorySchema,
  verifyOperatorSchema,
} from "../validators/admin.schema.js";

const router = Router();

// Every admin route requires an authenticated ADMIN.
router.use(authenticate, requireRole("ADMIN"));

// Operator verification queue.
router.get(
  "/operators/pending",
  asyncHandler(adminController.pendingOperators),
);
router.patch(
  "/operators/:id/verify",
  validateBody(verifyOperatorSchema),
  asyncHandler(adminController.verifyOperator),
);

// Platform-wide bookings and stats.
router.get("/bookings", asyncHandler(adminController.bookings));
router.get("/stats", asyncHandler(adminController.stats));

// Category management.
router.post(
  "/categories",
  validateBody(createCategorySchema),
  asyncHandler(adminController.createCategory),
);
router.put(
  "/categories/:id",
  validateBody(updateCategorySchema),
  asyncHandler(adminController.updateCategory),
);
router.delete("/categories/:id", asyncHandler(adminController.deleteCategory));

export default router;
