import httpStatus from "http-status";
import {
  AuditAction,
  SemesterStatus,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { audit, fail, pageResult, searchWhere } from "../_shared/academic.js";
const list = (query: any) =>
  pageResult(
    { ...query, model: prisma.semester },
    searchWhere(query, ["name"]),
  );
const get = async (id: string) => {
  const item = await prisma.semester.findFirst({
    where: { id, deletedAt: null },
    include: {
      sections: { where: { deletedAt: null }, include: { course: true } },
    },
  });
  if (!item) fail("Semester not found", httpStatus.NOT_FOUND);
  return item;
};
const create = async (data: any, actorId: string) => {
  if (data.status === SemesterStatus.CURRENT)
    await prisma.semester.updateMany({
      where: { status: SemesterStatus.CURRENT },
      data: { status: SemesterStatus.COMPLETED },
    });
  const item = await prisma.semester.create({ data });
  await audit(actorId, AuditAction.CREATE, "Semester", item.id);
  return item;
};
const update = async (id: string, data: any, actorId: string) => {
  if (data.status === SemesterStatus.CURRENT)
    await prisma.semester.updateMany({
      where: { id: { not: id }, status: SemesterStatus.CURRENT },
      data: { status: SemesterStatus.COMPLETED },
    });
  const item = await prisma.semester.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, "Semester", id);
  return item;
};
const remove = async (id: string, actorId: string) => {
  const item = await prisma.semester.update({
    where: { id },
    data: { deletedAt: new Date(), status: SemesterStatus.ARCHIVED },
  });
  await audit(actorId, AuditAction.DELETE, "Semester", id);
  return item;
};
export const SemesterService = { list, get, create, update, remove };
