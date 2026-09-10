import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
  attendanceController,
  courseController,
  departmentController,
  enrollmentController,
  examController,
  prerequisiteController,
  programController,
  resultController,
  sectionController,
  sectionFacultyController,
  semesterController,
} from "./academic.controller.js";
import {
  attendanceSchema,
  courseSchema,
  departmentSchema,
  enrollmentSchema,
  examSchema,
  listQuerySchema,
  prerequisiteSchema,
  programSchema,
  resultSchema,
  sectionFacultySchema,
  sectionSchema,
  semesterSchema,
} from "./academic.validation.js";

const admin = auth(Role.ADMIN);
const academicUsers = auth(Role.ADMIN, Role.FACULTY, Role.STUDENT);
const facultyOrAdmin = auth(Role.ADMIN, Role.FACULTY);
const validate = (schema: any) => validateRequest(schema);

export const DepartmentRoutes = Router();
DepartmentRoutes.get(
  "/",
  admin,
  validate(listQuerySchema),
  departmentController.list,
);
DepartmentRoutes.get("/:id", academicUsers, departmentController.get);
DepartmentRoutes.post(
  "/",
  admin,
  validate(departmentSchema),
  departmentController.create,
);
DepartmentRoutes.patch(
  "/:id",
  admin,
  validate(departmentSchema.partial()),
  departmentController.update,
);
DepartmentRoutes.delete("/:id", admin, departmentController.remove);

export const ProgramRoutes = Router();
ProgramRoutes.get(
  "/",
  academicUsers,
  validate(listQuerySchema),
  programController.list,
);
ProgramRoutes.get("/:id", academicUsers, programController.get);
ProgramRoutes.post(
  "/",
  admin,
  validate(programSchema),
  programController.create,
);
ProgramRoutes.patch(
  "/:id",
  admin,
  validate(programSchema.partial()),
  programController.update,
);
ProgramRoutes.delete("/:id", admin, programController.remove);

export const CourseRoutes = Router();
CourseRoutes.get(
  "/",
  academicUsers,
  validate(listQuerySchema),
  courseController.list,
);
CourseRoutes.get("/:id", academicUsers, courseController.get);
CourseRoutes.post("/", admin, validate(courseSchema), courseController.create);
CourseRoutes.patch(
  "/:id",
  admin,
  validate(courseSchema.partial()),
  courseController.update,
);
CourseRoutes.delete("/:id", admin, courseController.remove);
CourseRoutes.post(
  "/:id/prerequisites",
  admin,
  validate(prerequisiteSchema.omit({ courseId: true })),
  (req, res, next) => {
    req.body.courseId = req.params.id;
    return prerequisiteController.add(req, res, next);
  },
);
CourseRoutes.delete(
  "/:courseId/prerequisites/:prerequisiteId",
  admin,
  prerequisiteController.remove,
);

export const SemesterRoutes = Router();
SemesterRoutes.get(
  "/",
  academicUsers,
  validate(listQuerySchema),
  semesterController.list,
);
SemesterRoutes.get("/:id", academicUsers, semesterController.get);
SemesterRoutes.post(
  "/",
  admin,
  validate(semesterSchema),
  semesterController.create,
);
SemesterRoutes.patch(
  "/:id",
  admin,
  validate(semesterSchema.partial()),
  semesterController.update,
);
SemesterRoutes.delete("/:id", admin, semesterController.remove);

export const SectionRoutes = Router();
SectionRoutes.get(
  "/",
  academicUsers,
  validate(listQuerySchema),
  sectionController.list,
);
SectionRoutes.get("/:id", academicUsers, sectionController.get);
SectionRoutes.post(
  "/",
  admin,
  validate(sectionSchema),
  sectionController.create,
);
SectionRoutes.patch(
  "/:id",
  admin,
  validate(sectionSchema.partial()),
  sectionController.update,
);
SectionRoutes.delete("/:id", admin, sectionController.remove);
SectionRoutes.post(
  "/:id/faculty",
  admin,
  validate(sectionFacultySchema.omit({ sectionId: true })),
  (req, res, next) => {
    req.body.sectionId = req.params.id;
    return sectionFacultyController.assign(req, res, next);
  },
);
SectionRoutes.delete(
  "/:sectionId/faculty/:facultyId",
  admin,
  sectionFacultyController.remove,
);

export const SectionFacultyRoutes = Router();
SectionFacultyRoutes.post(
  "/",
  admin,
  validate(sectionFacultySchema),
  sectionFacultyController.assign,
);
SectionFacultyRoutes.delete(
  "/:sectionId/:facultyId",
  admin,
  sectionFacultyController.remove,
);

export const EnrollmentRoutes = Router();
EnrollmentRoutes.get(
  "/",
  academicUsers,
  validate(listQuerySchema),
  enrollmentController.list,
);
EnrollmentRoutes.post(
  "/",
  auth(Role.STUDENT),
  validate(enrollmentSchema),
  enrollmentController.create,
);
EnrollmentRoutes.delete("/:id", auth(Role.STUDENT), enrollmentController.drop);

export const AttendanceRoutes = Router();
AttendanceRoutes.get(
  "/section/:sectionId",
  academicUsers,
  attendanceController.list,
);
AttendanceRoutes.post(
  "/section/:sectionId",
  facultyOrAdmin,
  validate(attendanceSchema),
  attendanceController.create,
);
AttendanceRoutes.patch(
  "/:id",
  facultyOrAdmin,
  validate(attendanceSchema.partial()),
  attendanceController.update,
);

export const ExamRoutes = Router();
ExamRoutes.get("/", academicUsers, examController.list);
ExamRoutes.post(
  "/",
  facultyOrAdmin,
  validate(examSchema),
  examController.create,
);
ExamRoutes.patch(
  "/:id",
  facultyOrAdmin,
  validate(examSchema.partial()),
  examController.update,
);
ExamRoutes.post("/:id/publish", facultyOrAdmin, examController.publish);

export const ResultRoutes = Router();
ResultRoutes.get("/", academicUsers, resultController.list);
ResultRoutes.post(
  "/",
  facultyOrAdmin,
  validate(resultSchema),
  resultController.submit,
);
ResultRoutes.post("/:id/publish", admin, resultController.publish);
