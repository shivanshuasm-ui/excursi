import { Router } from "express";
import * as categoryController from "../controllers/category.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Public. Admin write endpoints land in Phase 5.
router.get("/", asyncHandler(categoryController.list));

export default router;
