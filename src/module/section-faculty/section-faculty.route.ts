import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { SectionFacultyController } from "./section-faculty.controller.js";
import { SectionFacultyValidation } from "./section-faculty.validation.js";

const router = Router();

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(SectionFacultyValidation),
  SectionFacultyController.assignFacultyToSection,
);

router.delete(
  "/:sectionId/:facultyId",
  auth(Role.ADMIN),
  SectionFacultyController.removeFacultyFromSection,
);

export const SectionFacultyRoutes = router;
