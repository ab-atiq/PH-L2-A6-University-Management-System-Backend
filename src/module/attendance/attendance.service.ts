import httpStatus from "http-status";
import {
  AuditAction,
  EnrollmentStatus,
  Role,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import {
  audit,
  ensureFacultyAssignment,
  fail,
  studentForUser,
} from "../_shared/academic.js";
const create = async (userId: string, data: any) => {
  await ensureFacultyAssignment(data.sectionId, userId);
  const enrollment = (await prisma.enrollment.findFirst({
    where: {
      id: data.enrollmentId,
      sectionId: data.sectionId,
      status: EnrollmentStatus.ENROLLED,
    },
  }))!;
  if (!enrollment) fail("Active enrollment not found", httpStatus.NOT_FOUND);
  const item = await prisma.attendance.create({
    data: { ...data, studentId: enrollment.studentId, markedById: userId },
  });
  await audit(userId, AuditAction.MARK_ATTENDANCE, "Attendance", item.id);
  return item;
};
const update = async (userId: string, id: string, data: any) => {
  const current = (await prisma.attendance.findUnique({ where: { id } }))!;
  if (!current) fail("Attendance not found", httpStatus.NOT_FOUND);
  await ensureFacultyAssignment(current.sectionId, userId);
  const item = await prisma.attendance.update({
    where: { id },
    data: { status: data.status, remarks: data.remarks },
  });
  await audit(userId, AuditAction.UPDATE_ATTENDANCE, "Attendance", id);
  return item;
};
const list = async (userId: string, role: Role, sectionId: string) => {
  if (role === Role.FACULTY) await ensureFacultyAssignment(sectionId, userId);
  const where: any = { sectionId, deletedAt: null };
  if (role === Role.STUDENT)
    where.studentId = (await studentForUser(userId)).id;
  return prisma.attendance.findMany({ where, orderBy: { classDate: "desc" } });
};
export const AttendanceService = { create, update, list };
