import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { EnrollmentController } from "./enrollment.controller.js";
import {
  EnrollmentListValidation,
  EnrollmentValidation,
} from "./enrollment.validation.js";
const router = Router();
router.get(
  "/",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  validateRequest(EnrollmentListValidation),
  EnrollmentController.list,
);
router.post(
  "/",
  auth(Role.STUDENT),
  validateRequest(EnrollmentValidation),
  EnrollmentController.create,
);
router.delete("/:id", auth(Role.STUDENT), EnrollmentController.drop);
export const EnrollmentRoutes = router;
