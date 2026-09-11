import httpStatus from "http-status";
import { AuditAction, EntityStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { audit, fail, pageResult, searchWhere } from "../_shared/academic.js";
const list = (query: any) =>
  pageResult(
    { ...query, model: prisma.program },
    searchWhere(
      query,
      ["name", "code"],
      query.departmentId ? { departmentId: query.departmentId } : {},
    ),
    { department: true },
  );
const get = async (id: string) => {
  const item = await prisma.program.findFirst({
    where: { id, deletedAt: null },
    include: { department: true },
  });
  if (!item) fail("Program not found", httpStatus.NOT_FOUND);
  return item;
};
const create = async (data: any, actorId: string) => {
  const department = await prisma.department.findFirst({
    where: {
      id: data.departmentId,
      deletedAt: null,
      status: EntityStatus.ACTIVE,
    },
  });
  if (!department) fail("Active department not found", httpStatus.NOT_FOUND);
  const item = await prisma.program.create({ data });
  await audit(actorId, AuditAction.CREATE, "Program", item.id);
  return item;
};
const update = async (id: string, data: any, actorId: string) => {
  const item = await prisma.program.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, "Program", id);
  return item;
};
const remove = async (id: string, actorId: string) => {
  const item = await prisma.program.update({
    where: { id },
    data: { deletedAt: new Date(), status: EntityStatus.INACTIVE },
  });
  await audit(actorId, AuditAction.DELETE, "Program", id);
  return item;
};
export const ProgramService = { list, get, create, update, remove };
