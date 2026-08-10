import { Router } from "express";
import * as bookingController from "../controllers/booking.controller.js";
import { authenticate } from "../middleware/auth.js";
import { loadOperator } from "../middleware/operator.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createBookingSchema,
  updateBookingStatusSchema,
} from "../validators/booking.schema.js";

const router = Router();

// Traveler: create a booking (reserves capacity) and list own bookings.
router.post(
  "/",
  authenticate,
  validateBody(createBookingSchema),
  asyncHandler(bookingController.create),
);
router.get("/me", authenticate, asyncHandler(bookingController.listMine));

// Operator: incoming bookings across their experiences.
router.get(
  "/operator",
  authenticate,
  asyncHandler(loadOperator),
  asyncHandler(bookingController.listOperator),
);

// Status change: traveler cancels own; operator completes/cancels theirs.
router.patch(
  "/:id/status",
  authenticate,
  validateBody(updateBookingStatusSchema),
  asyncHandler(bookingController.updateStatus),
);

export default router;
