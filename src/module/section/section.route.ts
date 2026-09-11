import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { SectionController } from "./section.controller.js";
import {
  SectionListValidation,
  SectionValidation,
} from "./section.validation.js";
const router = Router();
router.get(
  "/",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  validateRequest(SectionListValidation),
  SectionController.list,
);
router.get(
  "/:id",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  SectionController.get,
);
router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(SectionValidation),
  SectionController.create,
);
router.patch(
  "/:id",
  auth(Role.ADMIN),
  validateRequest(SectionValidation.partial()),
  SectionController.update,
);
router.delete("/:id", auth(Role.ADMIN), SectionController.remove);
export const SectionRoutes = router;
