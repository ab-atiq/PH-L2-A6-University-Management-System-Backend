import httpStatus from "http-status";
import {
  AuditAction,
  EnrollmentStatus,
  ExamStatus,
  Role,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import {
  audit,
  ensureFacultyAssignment,
  facultyForUser,
  fail,
  studentForUser,
} from "../_shared/academic.js";
const create = async (userId: string, data: any) => {
  await ensureFacultyAssignment(data.sectionId, userId);
  if (
    !(await prisma.section.findFirst({
      where: { id: data.sectionId, deletedAt: null },
    }))
  )
    fail("Section not found", httpStatus.NOT_FOUND);
  const item = await prisma.exam.create({ data });
  await audit(userId, AuditAction.CREATE_EXAM, "Exam", item.id);
  return item;
};
const update = async (userId: string, id: string, data: any) => {
  const exam = (await prisma.exam.findUnique({ where: { id } }))!;
  if (!exam) fail("Exam not found", httpStatus.NOT_FOUND);
  await ensureFacultyAssignment(exam.sectionId, userId);
  const item = await prisma.exam.update({ where: { id }, data });
  await audit(userId, AuditAction.UPDATE_EXAM, "Exam", id);
  return item;
};
const publish = async (userId: string, id: string) => {
  const exam = (await prisma.exam.findUnique({ where: { id } }))!;
  if (!exam) fail("Exam not found", httpStatus.NOT_FOUND);
  await ensureFacultyAssignment(exam.sectionId, userId);
  return prisma.exam.update({
    where: { id },
    data: { status: ExamStatus.PUBLISHED },
  });
};
const list = async (userId: string, role: Role, query: any) => {
  const student =
    role === Role.STUDENT ? await studentForUser(userId) : undefined;
  const faculty =
    role === Role.FACULTY ? await facultyForUser(userId) : undefined;
  const where: any = {
    deletedAt: null,
    ...(query.sectionId ? { sectionId: query.sectionId } : {}),
  };
  if (faculty)
    where.section = { facultyAssignments: { some: { facultyId: faculty.id } } };
  if (student)
    where.section = {
      enrollments: {
        some: { studentId: student.id, status: EnrollmentStatus.ENROLLED },
      },
    };
  return prisma.exam.findMany({
    where,
    include: { section: { include: { course: true, semester: true } } },
    orderBy: { examDate: "asc" },
  });
};
export const ExamService = { create, update, publish, list };
