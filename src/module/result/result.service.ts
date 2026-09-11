import httpStatus from "http-status";
import {
  EnrollmentStatus,
  Grade,
  ResultStatus,
  Role,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import {
  ensureFacultyAssignment,
  fail,
  studentForUser,
} from "../_shared/academic.js";
const gradeFor = (p: number) =>
  p >= 90
    ? { grade: Grade.A_PLUS, gradePoint: 4 }
    : p >= 85
      ? { grade: Grade.A, gradePoint: 3.75 }
      : p >= 80
        ? { grade: Grade.A_MINUS, gradePoint: 3.5 }
        : p >= 75
          ? { grade: Grade.B_PLUS, gradePoint: 3.25 }
          : p >= 70
            ? { grade: Grade.B, gradePoint: 3 }
            : p >= 65
              ? { grade: Grade.B_MINUS, gradePoint: 2.75 }
              : p >= 60
                ? { grade: Grade.C_PLUS, gradePoint: 2.5 }
                : p >= 55
                  ? { grade: Grade.C, gradePoint: 2.25 }
                  : p >= 50
                    ? { grade: Grade.C_MINUS, gradePoint: 2 }
                    : p >= 45
                      ? { grade: Grade.D, gradePoint: 1 }
                      : { grade: Grade.F, gradePoint: 0 };
const submit = async (userId: string, data: any) => {
  const exam = (await prisma.exam.findUnique({ where: { id: data.examId } }))!;
  if (!exam) fail("Exam not found", httpStatus.NOT_FOUND);
  await ensureFacultyAssignment(exam.sectionId, userId);
  const enrollment = (await prisma.enrollment.findFirst({
    where: {
      id: data.enrollmentId,
      studentId: data.studentId,
      sectionId: exam.sectionId,
      status: EnrollmentStatus.ENROLLED,
    },
  }))!;
  if (!enrollment) fail("Matching active enrollment not found");
  if (data.marksObtained > exam.totalMarks)
    fail("Marks cannot exceed total marks");
  return prisma.result.upsert({
    where: {
      examId_studentId: { examId: data.examId, studentId: data.studentId },
    },
    update: {
      enrollmentId: data.enrollmentId,
      marksObtained: data.marksObtained,
      ...gradeFor((data.marksObtained / exam.totalMarks) * 100),
      enteredById: userId,
      status: ResultStatus.SUBMITTED,
    },
    create: {
      ...data,
      ...gradeFor((data.marksObtained / exam.totalMarks) * 100),
      enteredById: userId,
      status: ResultStatus.SUBMITTED,
    },
  });
};
const publish = async (userId: string, id: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role !== Role.ADMIN)
    fail("Only admins can publish results", httpStatus.FORBIDDEN);
  return prisma.result.update({
    where: { id },
    data: { status: ResultStatus.PUBLISHED, publishedAt: new Date() },
  });
};
const list = async (userId: string, role: Role, query: any) => {
  const student =
    role === Role.STUDENT ? await studentForUser(userId) : undefined;
  return prisma.result.findMany({
    where: {
      deletedAt: null,
      ...(role === Role.STUDENT ? { status: ResultStatus.PUBLISHED } : {}),
      ...(student ? { studentId: student.id } : {}),
      ...(query.examId ? { examId: query.examId } : {}),
    },
    include: {
      exam: {
        include: { section: { include: { course: true, semester: true } } },
      },
      student: true,
    },
    orderBy: { createdAt: "desc" },
  });
};
export const ResultService = { submit, publish, list };
