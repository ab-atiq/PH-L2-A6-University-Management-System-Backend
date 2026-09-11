import httpStatus from "http-status";
import {
  AuditAction,
  EnrollmentStatus,
  SectionStatus,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import {
  audit,
  fail,
  pageResult,
  publicUser,
  searchWhere,
} from "../_shared/academic.js";
const list = (query: any) =>
  pageResult(
    { ...query, model: prisma.section },
    searchWhere(query, ["sectionName"], {
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
    }),
    {
      course: true,
      semester: true,
      facultyAssignments: {
        include: { faculty: { include: { user: { select: publicUser } } } },
      },
    },
  );
const get = async (id: string) => {
  const item = await prisma.section.findFirst({
    where: { id, deletedAt: null },
    include: {
      course: true,
      semester: true,
      facultyAssignments: {
        include: { faculty: { include: { user: { select: publicUser } } } },
      },
      enrollments: {
        where: { status: EnrollmentStatus.ENROLLED },
        include: { student: { include: { user: { select: publicUser } } } },
      },
    },
  });
  if (!item) fail("Section not found", httpStatus.NOT_FOUND);
  return item;
};
const create = async (data: any, actorId: string) => {
  const [course, semester] = await Promise.all([
    prisma.course.findFirst({ where: { id: data.courseId, deletedAt: null } }),
    prisma.semester.findFirst({
      where: { id: data.semesterId, deletedAt: null },
    }),
  ]);
  if (!course || !semester)
    fail("Course or semester not found", httpStatus.NOT_FOUND);
  const item = await prisma.section.create({ data });
  await audit(actorId, AuditAction.CREATE, "Section", item.id);
  return item;
};
const update = async (id: string, data: any, actorId: string) => {
  const item = await prisma.section.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, "Section", id);
  return item;
};
const remove = async (id: string, actorId: string) => {
  const item = await prisma.section.update({
    where: { id },
    data: { deletedAt: new Date(), status: SectionStatus.CANCELLED },
  });
  await audit(actorId, AuditAction.DELETE, "Section", id);
  return item;
};
export const SectionService = { list, get, create, update, remove };
