import httpStatus from "http-status";
import { AuditAction } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { SectionFacultyData } from "./section-faculty.interface.js";

const assignFacultyToSection = async (
  data: SectionFacultyData,
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

  if (!section) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Active section profile not found",
    );
  } else if (!faculty) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Active faculty profile not found",
    );
  }

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

  await prisma.auditLog.create({
    data: {
      actorId,
      action: AuditAction.UPDATE,
      entity: "SectionFaculty",
      entityId: item.id,
    },
  });

  return item;
};

const removeFacultyFromSection = async (
  sectionId: string,
  facultyId: string,
  actorId: string,
) => {
  const item = await prisma.sectionFaculty.delete({
    where: { sectionId_facultyId: { sectionId, facultyId } },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: AuditAction.DELETE,
      entity: "SectionFaculty",
      entityId: item.id,
    },
  });

  return item;
};

export const SectionFacultyService = {
  assignFacultyToSection,
  removeFacultyFromSection,
};
