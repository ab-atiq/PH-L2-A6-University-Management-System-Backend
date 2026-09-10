import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { PaymentController } from "./payment.controller.js";
import { initiatePaymentSchema, webhookSchema } from "./payment.validation.js";

const router = Router();
router.post(
  "/initiate",
  auth(Role.STUDENT),
  validateRequest(initiatePaymentSchema),
  PaymentController.initiate,
);
router.post(
  "/webhook",
  validateRequest(webhookSchema),
  PaymentController.webhook,
);
router.get("/:id", auth(Role.ADMIN, Role.STUDENT), PaymentController.getById);
export const PaymentRoutes = router;
