import { Router } from "express";
import authRoutes from "./auth.routes.js";

const router = Router();

router.use("/auth", authRoutes);

// Future route groups (per architecture): experiences, options, bookings,
// payments, operators, admin.

export default router;
