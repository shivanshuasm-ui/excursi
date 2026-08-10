import { Router } from "express";
import authRoutes from "./auth.routes.js";
import operatorRoutes from "./operator.routes.js";
import experienceRoutes from "./experience.routes.js";
import optionRoutes from "./option.routes.js";
import categoryRoutes from "./category.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/operators", operatorRoutes);
router.use("/experiences", experienceRoutes);
router.use("/options", optionRoutes);
router.use("/categories", categoryRoutes);

// Future route groups (per architecture): bookings, payments, admin.

export default router;
