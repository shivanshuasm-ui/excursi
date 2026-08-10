import { Router } from "express";
import * as paymentController from "../controllers/payment.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createOrderSchema,
  verifyPaymentSchema,
} from "../validators/payment.schema.js";

const router = Router();

router.post(
  "/create-order",
  authenticate,
  validateBody(createOrderSchema),
  asyncHandler(paymentController.createOrder),
);
router.post(
  "/verify",
  authenticate,
  validateBody(verifyPaymentSchema),
  asyncHandler(paymentController.verify),
);

export default router;
