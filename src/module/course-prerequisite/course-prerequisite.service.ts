import httpStatus from "http-status";
import { AuditAction } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { audit, fail } from "../_shared/academic.js";
const add = async (
  data: { courseId: string; prerequisiteId: string },
  actorId: string,
) => {
  if (data.courseId === data.prerequisiteId)
    fail("A course cannot be its own prerequisite");
  const courses = await prisma.course.findMany({
    where: {
      id: { in: [data.courseId, data.prerequisiteId] },
      deletedAt: null,
    },
    select: { id: true },
  });
  if (courses.length !== 2) fail("Course not found", httpStatus.NOT_FOUND);
  const item = await prisma.coursePrerequisite.create({ data });
  await audit(actorId, AuditAction.CREATE, "CoursePrerequisite", item.id);
  return item;
};
const remove = async (
  courseId: string,
  prerequisiteId: string,
  actorId: string,
) => {
  const item = await prisma.coursePrerequisite.delete({
    where: { courseId_prerequisiteId: { courseId, prerequisiteId } },
  });
  await audit(actorId, AuditAction.DELETE, "CoursePrerequisite", item.id);
  return item;
};
export const CoursePrerequisiteService = { add, remove };
