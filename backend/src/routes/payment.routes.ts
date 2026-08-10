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

// Dev-only: simulate payment success in mock mode (no Razorpay keys).
router.post(
  "/mock-confirm",
  authenticate,
  validateBody(createOrderSchema),
  asyncHandler(paymentController.mockConfirm),
);

export default router;
