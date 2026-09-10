import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { prerequisiteController } from "../academic/academic.controller.js";
import { prerequisiteSchema } from "../academic/academic.validation.js";

const router = Router();
router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(prerequisiteSchema),
  prerequisiteController.add,
);
router.delete(
  "/:courseId/:prerequisiteId",
  auth(Role.ADMIN),
  prerequisiteController.remove,
);

export const CoursePrerequisiteRoutes = router;
