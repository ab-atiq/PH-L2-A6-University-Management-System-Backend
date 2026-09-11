import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { SemesterController } from "./semester.controller.js";
import {
  SemesterListValidation,
  SemesterUpdateValidation,
  SemesterValidation,
} from "./semester.validation.js";
const router = Router();
router.get(
  "/",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  validateRequest(SemesterListValidation),
  SemesterController.list,
);
router.get(
  "/:id",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  SemesterController.get,
);
router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(SemesterValidation),
  SemesterController.create,
);
router.patch(
  "/:id",
  auth(Role.ADMIN),
  validateRequest(SemesterUpdateValidation),
  SemesterController.update,
);
router.delete("/:id", auth(Role.ADMIN), SemesterController.remove);
export const SemesterRoutes = router;
