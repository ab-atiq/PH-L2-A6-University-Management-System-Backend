import httpStatus from "http-status";
import { AuditAction } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { audit, fail, pageResult, searchWhere } from "../_shared/academic.js";
const list = (query: any) =>
  pageResult(
    { ...query, model: prisma.course },
    searchWhere(
      query,
      ["courseCode", "title"],
      query.departmentId ? { departmentId: query.departmentId } : {},
    ),
    { department: true, prerequisitesFor: { include: { prerequisite: true } } },
  );
const get = async (id: string) => {
  const item = await prisma.course.findFirst({
    where: { id, deletedAt: null },
    include: {
      department: true,
      prerequisitesFor: { include: { prerequisite: true } },
      sections: { where: { deletedAt: null }, include: { semester: true } },
    },
  });
  if (!item) fail("Course not found", httpStatus.NOT_FOUND);
  return item;
};
const create = async (data: any, actorId: string) => {
  if (
    !(await prisma.department.findFirst({
      where: { id: data.departmentId, deletedAt: null },
    }))
  )
    fail("Department not found", httpStatus.NOT_FOUND);
  const item = await prisma.course.create({ data });
  await audit(actorId, AuditAction.CREATE, "Course", item.id);
  return item;
};
const update = async (id: string, data: any, actorId: string) => {
  const item = await prisma.course.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, "Course", id);
  return item;
};
const remove = async (id: string, actorId: string) => {
  const item = await prisma.course.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await audit(actorId, AuditAction.DELETE, "Course", id);
  return item;
};
export const CourseService = { list, get, create, update, remove };
