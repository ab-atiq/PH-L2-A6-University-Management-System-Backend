import httpStatus from "http-status";
import { AuditAction, EntityStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { audit, fail, pageResult, searchWhere } from "../_shared/academic.js";

const list = (query: any) =>
  pageResult(
    { ...query, model: prisma.department },
    searchWhere(query, ["name", "code"]),
  );
const get = async (id: string) => {
  const item = await prisma.department.findFirst({
    where: { id, deletedAt: null },
    include: {
      programs: { where: { deletedAt: null } },
      courses: { where: { deletedAt: null } },
    },
  });
  if (!item) fail("Department not found", httpStatus.NOT_FOUND);
  return item;
};
const create = async (data: any, actorId: string) => {
  const item = await prisma.department.create({ data });
  await audit(actorId, AuditAction.CREATE, "Department", item.id);
  return item;
};
const update = async (id: string, data: any, actorId: string) => {
  const item = await prisma.department.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, "Department", id);
  return item;
};
const remove = async (id: string, actorId: string) => {
  const item = await prisma.department.update({
    where: { id },
    data: { deletedAt: new Date(), status: EntityStatus.INACTIVE },
  });
  await audit(actorId, AuditAction.DELETE, "Department", id);
  return item;
};
export const DepartmentService = { list, get, create, update, remove };
