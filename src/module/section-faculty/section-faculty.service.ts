import httpStatus from "http-status";
import { AuditAction } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { audit, fail } from "../_shared/academic.js";
const assign = async (
  data: { sectionId: string; facultyId: string; isPrimary?: boolean },
  actorId: string,
) => {
  const [section, faculty] = await Promise.all([
    prisma.section.findFirst({
      where: { id: data.sectionId, deletedAt: null },
    }),
    prisma.facultyProfile.findFirst({
      where: { id: data.facultyId, deletedAt: null },
    }),
  ]);
  if (!section || !faculty)
    fail("Section or faculty profile not found", httpStatus.NOT_FOUND);
  if (data.isPrimary)
    await prisma.sectionFaculty.updateMany({
      where: { sectionId: data.sectionId },
      data: { isPrimary: false },
    });
  const item = await prisma.sectionFaculty.upsert({
    where: {
      sectionId_facultyId: {
        sectionId: data.sectionId,
        facultyId: data.facultyId,
      },
    },
    update: { isPrimary: data.isPrimary ?? true },
    create: { ...data, isPrimary: data.isPrimary ?? true },
  });
  await audit(actorId, AuditAction.UPDATE, "SectionFaculty", item.id);
  return item;
};
const remove = async (
  sectionId: string,
  facultyId: string,
  actorId: string,
) => {
  const item = await prisma.sectionFaculty.delete({
    where: { sectionId_facultyId: { sectionId, facultyId } },
  });
  await audit(actorId, AuditAction.DELETE, "SectionFaculty", item.id);
  return item;
};
export const SectionFacultyService = { assign, remove };
