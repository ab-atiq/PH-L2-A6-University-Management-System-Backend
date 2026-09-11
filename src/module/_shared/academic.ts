import httpStatus from "http-status";
import { AuditAction, Role } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

export const publicUser = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;
export const fail = (
  message: string,
  status: number = httpStatus.BAD_REQUEST,
): never => {
  throw new AppError(status, message);
};
export const audit = async (
  actorId: string | undefined,
  action: AuditAction,
  entity: string,
  entityId?: string,
) => {
  await prisma.auditLog.create({
    data: {
      ...(actorId ? { actorId } : {}),
      action,
      entity,
      ...(entityId ? { entityId } : {}),
    },
  });
};
export const pageResult = async (query: any, where: any, include?: any) => {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 20), 100);
  const [data, total] = await Promise.all([
    query.model.findMany({
      where,
      include,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [query.sortBy || "createdAt"]: query.sortOrder || "desc" },
    }),
    query.model.count({ where }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
export const searchWhere = (query: any, fields: string[], extra: any = {}) => {
  const where: any = { deletedAt: null, ...extra };
  if (query.search)
    where.OR = fields.map((field) => ({
      [field]: { contains: query.search, mode: "insensitive" },
    }));
  if (query.status) where.status = query.status;
  return where;
};
export const studentForUser = async (userId: string) => {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) fail("Student profile not found", httpStatus.NOT_FOUND);
  return profile!;
};
export const facultyForUser = async (userId: string) => {
  const profile = await prisma.facultyProfile.findUnique({ where: { userId } });
  if (!profile) fail("Faculty profile not found", httpStatus.NOT_FOUND);
  return profile!;
};
export const ensureFacultyAssignment = async (
  sectionId: string,
  userId: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === Role.ADMIN) return undefined;
  const faculty = await facultyForUser(userId);
  const assignment = await prisma.sectionFaculty.findUnique({
    where: { sectionId_facultyId: { sectionId, facultyId: faculty.id } },
  });
  if (!assignment)
    fail("Faculty is not assigned to this section", httpStatus.FORBIDDEN);
  return faculty;
};
