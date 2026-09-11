import z from "zod";
export const SectionFacultyValidation = z.object({
  sectionId: z.string().uuid(),
  facultyId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
});
