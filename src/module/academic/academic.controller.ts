import type { Request, Response } from "express";
import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums.js";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { AcademicService } from "./academic.service.js";

const actor = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user;
};
const ok = (
  res: Response,
  message: string,
  data: unknown,
  statusCode: number = httpStatus.OK,
) => sendResponse(res, { statusCode, success: true, message, data });
const crud = (list: any, get: any, create: any, update: any, remove: any) => ({
  list: catchAsync(async (req, res) =>
    ok(res, "Records fetched successfully", await list(req.query)),
  ),
  get: catchAsync(async (req, res) =>
    ok(res, "Record fetched successfully", await get(req.params.id)),
  ),
  create: catchAsync(async (req, res) =>
    ok(
      res,
      "Record created successfully",
      await create(req.body, actor(req).userId),
      httpStatus.CREATED,
    ),
  ),
  update: catchAsync(async (req, res) =>
    ok(
      res,
      "Record updated successfully",
      await update(req.params.id, req.body, actor(req).userId),
    ),
  ),
  remove: catchAsync(async (req, res) =>
    ok(
      res,
      "Record deleted successfully",
      await remove(req.params.id, actor(req).userId),
    ),
  ),
});

export const departmentController = crud(
  AcademicService.listDepartments,
  AcademicService.getDepartment,
  AcademicService.createDepartment,
  AcademicService.updateDepartment,
  AcademicService.deleteDepartment,
);
export const programController = crud(
  AcademicService.listPrograms,
  AcademicService.getProgram,
  AcademicService.createProgram,
  AcademicService.updateProgram,
  AcademicService.deleteProgram,
);
export const courseController = crud(
  AcademicService.listCourses,
  AcademicService.getCourse,
  AcademicService.createCourse,
  AcademicService.updateCourse,
  AcademicService.deleteCourse,
);
export const semesterController = crud(
  AcademicService.listSemesters,
  AcademicService.getSemester,
  AcademicService.createSemester,
  AcademicService.updateSemester,
  AcademicService.deleteSemester,
);
export const sectionController = crud(
  AcademicService.listSections,
  AcademicService.getSection,
  AcademicService.createSection,
  AcademicService.updateSection,
  AcademicService.deleteSection,
);

export const prerequisiteController = {
  add: catchAsync(async (req, res) =>
    ok(
      res,
      "Prerequisite added successfully",
      await AcademicService.addPrerequisite(req.body, actor(req).userId),
      httpStatus.CREATED,
    ),
  ),
  remove: catchAsync(async (req, res) =>
    ok(
      res,
      "Prerequisite removed successfully",
      await AcademicService.removePrerequisite(
        String(req.params.courseId),
        String(req.params.prerequisiteId),
        actor(req).userId,
      ),
    ),
  ),
};
export const sectionFacultyController = {
  assign: catchAsync(async (req, res) =>
    ok(
      res,
      "Faculty assigned successfully",
      await AcademicService.assignFaculty(req.body, actor(req).userId),
      httpStatus.CREATED,
    ),
  ),
  remove: catchAsync(async (req, res) =>
    ok(
      res,
      "Faculty assignment removed successfully",
      await AcademicService.removeFaculty(
        String(req.params.sectionId),
        String(req.params.facultyId),
        actor(req).userId,
      ),
    ),
  ),
};
export const enrollmentController = {
  list: catchAsync(async (req, res) => {
    const user = actor(req);
    ok(
      res,
      "Enrollments fetched successfully",
      await AcademicService.listEnrollments(user.userId, user.role, req.query),
    );
  }),
  create: catchAsync(async (req, res) =>
    ok(
      res,
      "Enrollment created successfully",
      await AcademicService.enroll(actor(req).userId, req.body.sectionId),
      httpStatus.CREATED,
    ),
  ),
  drop: catchAsync(async (req, res) =>
    ok(
      res,
      "Enrollment dropped successfully",
      await AcademicService.dropEnrollment(
        actor(req).userId,
        String(req.params.id),
      ),
    ),
  ),
};
export const attendanceController = {
  list: catchAsync(async (req, res) => {
    const user = actor(req);
    ok(
      res,
      "Attendance fetched successfully",
      await AcademicService.listAttendance(
        user.userId,
        user.role,
        String(req.params.sectionId),
      ),
    );
  }),
  create: catchAsync(async (req, res) =>
    ok(
      res,
      "Attendance marked successfully",
      await AcademicService.createAttendance(actor(req).userId, {
        ...req.body,
        sectionId: String(req.params.sectionId),
      }),
      httpStatus.CREATED,
    ),
  ),
  update: catchAsync(async (req, res) =>
    ok(
      res,
      "Attendance updated successfully",
      await AcademicService.updateAttendance(
        actor(req).userId,
        String(req.params.id),
        req.body,
      ),
    ),
  ),
};
export const examController = {
  list: catchAsync(async (req, res) => {
    const user = actor(req);
    ok(
      res,
      "Exams fetched successfully",
      await AcademicService.listExams(user.userId, user.role, req.query),
    );
  }),
  create: catchAsync(async (req, res) =>
    ok(
      res,
      "Exam created successfully",
      await AcademicService.createExam(actor(req).userId, req.body),
      httpStatus.CREATED,
    ),
  ),
  update: catchAsync(async (req, res) =>
    ok(
      res,
      "Exam updated successfully",
      await AcademicService.updateExam(
        actor(req).userId,
        String(req.params.id),
        req.body,
      ),
    ),
  ),
  publish: catchAsync(async (req, res) =>
    ok(
      res,
      "Exam published successfully",
      await AcademicService.publishExam(
        actor(req).userId,
        String(req.params.id),
      ),
    ),
  ),
};
export const resultController = {
  list: catchAsync(async (req, res) => {
    const user = actor(req);
    ok(
      res,
      "Results fetched successfully",
      await AcademicService.listResults(user.userId, user.role, req.query),
    );
  }),
  submit: catchAsync(async (req, res) =>
    ok(
      res,
      "Result submitted successfully",
      await AcademicService.upsertResult(actor(req).userId, req.body),
      httpStatus.CREATED,
    ),
  ),
  publish: catchAsync(async (req, res) =>
    ok(
      res,
      "Result published successfully",
      await AcademicService.publishResult(
        actor(req).userId,
        String(req.params.id),
      ),
    ),
  ),
};

export { Role };
