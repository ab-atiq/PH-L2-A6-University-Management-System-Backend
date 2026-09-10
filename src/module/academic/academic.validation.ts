import z from "zod";

const id = z.string().uuid();
const date = z.coerce.date();
const positiveInt = z.number().int().positive();
const status = z.enum(["ACTIVE", "INACTIVE"]);

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .transform((value) => value.toUpperCase()),
  description: z.string().trim().max(500).nullable().optional(),
  status: status.optional(),
});
export const programSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((value) => value.toUpperCase()),
  departmentId: id,
  durationYears: positiveInt,
  totalCredits: positiveInt,
  status: status.optional(),
});
export const courseSchema = z.object({
  courseCode: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((value) => value.toUpperCase()),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  credits: positiveInt,
  departmentId: id,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});
export const prerequisiteSchema = z.object({
  courseId: id,
  prerequisiteId: id,
});
export const semesterSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    startDate: date,
    endDate: date,
    registrationStart: date,
    registrationEnd: date,
    status: z
      .enum([
        "UPCOMING",
        "REGISTRATION_OPEN",
        "CURRENT",
        "COMPLETED",
        "ARCHIVED",
      ])
      .optional(),
  })
  .refine((value) => value.startDate < value.endDate, {
    message: "endDate must be after startDate",
  })
  .refine((value) => value.registrationStart <= value.registrationEnd, {
    message: "Invalid registration window",
  });
export const sectionSchema = z.object({
  courseId: id,
  semesterId: id,
  sectionName: z.string().trim().min(1).max(30),
  capacity: positiveInt,
  room: z.string().trim().max(100).nullable().optional(),
  schedule: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "CANCELLED"]).optional(),
});
export const sectionFacultySchema = z.object({
  sectionId: id,
  facultyId: id,
  isPrimary: z.boolean().optional(),
});
export const enrollmentSchema = z.object({ sectionId: id });
export const attendanceSchema = z.object({
  enrollmentId: id,
  classDate: date,
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  remarks: z.string().trim().max(500).nullable().optional(),
});
export const examSchema = z.object({
  sectionId: id,
  examType: z.enum(["QUIZ", "ASSIGNMENT", "MIDTERM", "FINAL", "PROJECT"]),
  title: z.string().trim().max(160).nullable().optional(),
  examDate: date,
  totalMarks: z.number().positive(),
  weightage: z.number().positive().max(100).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).optional(),
});
export const resultSchema = z.object({
  examId: id,
  studentId: id,
  enrollmentId: id,
  marksObtained: z.number().nonnegative(),
});
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.string().optional(),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
