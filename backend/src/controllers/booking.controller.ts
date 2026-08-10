import type { Request, Response } from "express";
import * as bookingService from "../services/booking.service.js";
import { ApiError } from "../utils/ApiError.js";
import { operatorBookingsQuerySchema } from "../validators/booking.schema.js";

function userId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.id;
}

export async function create(req: Request, res: Response) {
  const result = await bookingService.createBooking(
    userId(req),
    req.body,
    new Date(),
  );
  res.status(201).json(result);
}

export async function listMine(req: Request, res: Response) {
  const bookings = await bookingService.listMyBookings(userId(req));
  res.status(200).json({ bookings });
}

export async function listOperator(req: Request, res: Response) {
  if (!req.operator) throw ApiError.forbidden("Operator context required");
  const query = operatorBookingsQuerySchema.parse(req.query);
  const bookings = await bookingService.listOperatorBookings(
    req.operator.id,
    query,
  );
  res.status(200).json({ bookings });
}

export async function updateStatus(req: Request, res: Response) {
  const booking = await bookingService.updateBookingStatus(
    userId(req),
    req.params.id,
    req.body,
  );
  res.status(200).json({ booking });
}
