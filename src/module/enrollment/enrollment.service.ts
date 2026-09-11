import httpStatus from "http-status";
import {
  AuditAction,
  EnrollmentStatus,
  Role,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import {
  audit,
  facultyForUser,
  fail,
  pageResult,
  publicUser,
  studentForUser,
} from "../_shared/academic.js";
const SEMESTER_CREDIT_LIMIT = 24;
const create = async (userId: string, sectionId: string) =>
  prisma.$transaction(async (tx) => {
    const student = (await tx.studentProfile.findUnique({
      where: { userId },
      include: {
        enrollments: {
          include: { section: { include: { course: true, semester: true } } },
        },
      },
    }))!;
    if (!student) fail("Student profile not found", httpStatus.NOT_FOUND);
    const section = (await tx.section.findFirst({
      where: { id: sectionId, deletedAt: null },
      include: {
        course: true,
        semester: true,
        enrollments: { where: { status: EnrollmentStatus.ENROLLED } },
      },
    }))!;
    if (!section) fail("Section not found", httpStatus.NOT_FOUND);
    const now = new Date();
    if (section.status !== "PUBLISHED" || section.course.status !== "PUBLISHED")
      fail("Section or course is not available");
    if (
      section.semester.status !== "REGISTRATION_OPEN" ||
      now < section.semester.registrationStart ||
      now > section.semester.registrationEnd
    )
      fail("Registration is not open");
    if (section.enrollments.length >= section.capacity)
      fail("Section capacity has been reached");
    const existing = await tx.enrollment.findUnique({
      where: { studentId_sectionId: { studentId: student.id, sectionId } },
    });
    if (existing?.status === EnrollmentStatus.ENROLLED)
      fail("Already enrolled in this section", httpStatus.CONFLICT);
    const completed = student.enrollments
      .filter((item) => item.status === EnrollmentStatus.COMPLETED)
      .map((item) => item.section.courseId);
    if (completed.includes(section.courseId))
      fail("Course has already been completed");
    const credits = student.enrollments
      .filter(
        (item) =>
          item.status === EnrollmentStatus.ENROLLED &&
          item.section.semesterId === section.semesterId,
      )
      .reduce((sum, item) => sum + item.section.course.credits, 0);
    if (credits + section.course.credits > SEMESTER_CREDIT_LIMIT)
      fail(`Semester credit limit is ${SEMESTER_CREDIT_LIMIT}`);
    const prerequisites = await tx.coursePrerequisite.findMany({
      where: { courseId: section.courseId },
    });
    if (prerequisites.some((item) => !completed.includes(item.prerequisiteId)))
      fail("Course prerequisites are not completed");
    const item = existing
      ? await tx.enrollment.update({
          where: { id: existing.id },
          data: {
            status: EnrollmentStatus.ENROLLED,
            enrolledAt: now,
            droppedAt: null,
            deletedAt: null,
          },
        })
      : await tx.enrollment.create({
          data: { studentId: student.id, sectionId },
        });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: AuditAction.ENROLL,
        entity: "Enrollment",
        entityId: item.id,
      },
    });
    return item;
  });
const drop = async (userId: string, id: string) => {
  const student = await studentForUser(userId);
  const item = await prisma.enrollment.findFirst({
    where: { id, studentId: student.id, status: EnrollmentStatus.ENROLLED },
  });
  if (!item) fail("Enrollment not found", httpStatus.NOT_FOUND);
  const result = await prisma.enrollment.update({
    where: { id },
    data: { status: EnrollmentStatus.DROPPED, droppedAt: new Date() },
  });
  await audit(userId, AuditAction.DROP_ENROLLMENT, "Enrollment", id);
  return result;
};
const list = async (userId: string, role: Role, query: any) => {
  const student =
    role === Role.STUDENT ? await studentForUser(userId) : undefined;
  const faculty =
    role === Role.FACULTY ? await facultyForUser(userId) : undefined;
  return pageResult(
    { ...query, model: prisma.enrollment },
    {
      ...(student ? { studentId: student.id } : {}),
      ...(faculty
        ? {
            section: {
              facultyAssignments: { some: { facultyId: faculty.id } },
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
    },
    {
      student: { include: { user: { select: publicUser } } },
      section: { include: { course: true, semester: true } },
    },
  );
};
export const EnrollmentService = { create, drop, list };
