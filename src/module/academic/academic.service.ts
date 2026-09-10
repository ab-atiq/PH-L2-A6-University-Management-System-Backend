import httpStatus from "http-status";
import {
  AuditAction,
  EnrollmentStatus,
  EntityStatus,
  ExamStatus,
  Grade,
  ResultStatus,
  Role,
  SectionStatus,
  SemesterStatus,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

const SEMESTER_CREDIT_LIMIT = 24;
const publicUser = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

const fail = (
  message: string,
  status: number = httpStatus.BAD_REQUEST,
): never => {
  throw new AppError(status, message);
};
const audit = async (
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
const pageResult = async (query: any, where: any, include?: any) => {
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
const searchWhere = (query: any, fields: string[], extra: any = {}) => {
  const where: any = { deletedAt: null, ...extra };
  if (query.search)
    where.OR = fields.map((field) => ({
      [field]: { contains: query.search, mode: "insensitive" },
    }));
  if (query.status) where.status = query.status;
  return where;
};

const listDepartments = (query: any) =>
  pageResult(
    { ...query, model: prisma.department },
    searchWhere(query, ["name", "code"]),
  );
const getDepartment = async (id: string) => {
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
const createDepartment = async (data: any, actorId: string) => {
  const item = await prisma.department.create({ data });
  await audit(actorId, AuditAction.CREATE, "Department", item.id);
  return item;
};
const updateDepartment = async (id: string, data: any, actorId: string) => {
  const item = await prisma.department.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, "Department", id);
  return item;
};
const deleteDepartment = async (id: string, actorId: string) => {
  const item = await prisma.department.update({
    where: { id },
    data: { deletedAt: new Date(), status: EntityStatus.INACTIVE },
  });
  await audit(actorId, AuditAction.DELETE, "Department", id);
  return item;
};

const listPrograms = (query: any) =>
  pageResult(
    { ...query, model: prisma.program },
    searchWhere(
      query,
      ["name", "code"],
      query.departmentId ? { departmentId: query.departmentId } : {},
    ),
    { department: true },
  );
const getProgram = async (id: string) => {
  const item = await prisma.program.findFirst({
    where: { id, deletedAt: null },
    include: { department: true },
  });
  if (!item) fail("Program not found", httpStatus.NOT_FOUND);
  return item;
};
const createProgram = async (data: any, actorId: string) => {
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
const updateProgram = async (id: string, data: any, actorId: string) => {
  const item = await prisma.program.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, "Program", id);
  return item;
};
const deleteProgram = async (id: string, actorId: string) => {
  const item = await prisma.program.update({
    where: { id },
    data: { deletedAt: new Date(), status: EntityStatus.INACTIVE },
  });
  await audit(actorId, AuditAction.DELETE, "Program", id);
  return item;
};

const listCourses = (query: any) =>
  pageResult(
    { ...query, model: prisma.course },
    searchWhere(
      query,
      ["courseCode", "title"],
      query.departmentId ? { departmentId: query.departmentId } : {},
    ),
    { department: true, prerequisitesFor: { include: { prerequisite: true } } },
  );
const getCourse = async (id: string) => {
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
const createCourse = async (data: any, actorId: string) => {
  const department = await prisma.department.findFirst({
    where: { id: data.departmentId, deletedAt: null },
  });
  if (!department) fail("Department not found", httpStatus.NOT_FOUND);
  const item = await prisma.course.create({ data });
  await audit(actorId, AuditAction.CREATE, "Course", item.id);
  return item;
};
const updateCourse = async (id: string, data: any, actorId: string) => {
  const item = await prisma.course.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, "Course", id);
  return item;
};
const deleteCourse = async (id: string, actorId: string) => {
  const item = await prisma.course.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await audit(actorId, AuditAction.DELETE, "Course", id);
  return item;
};
const addPrerequisite = async (
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
const removePrerequisite = async (
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

const listSemesters = (query: any) =>
  pageResult(
    { ...query, model: prisma.semester },
    searchWhere(query, ["name"]),
  );
const getSemester = async (id: string) => {
  const item = await prisma.semester.findFirst({
    where: { id, deletedAt: null },
    include: {
      sections: { where: { deletedAt: null }, include: { course: true } },
    },
  });
  if (!item) fail("Semester not found", httpStatus.NOT_FOUND);
  return item;
};
const createSemester = async (data: any, actorId: string) => {
  if (data.status === SemesterStatus.CURRENT)
    await prisma.semester.updateMany({
      where: { status: SemesterStatus.CURRENT },
      data: { status: SemesterStatus.COMPLETED },
    });
  const item = await prisma.semester.create({ data });
  await audit(actorId, AuditAction.CREATE, "Semester", item.id);
  return item;
};
const updateSemester = async (id: string, data: any, actorId: string) => {
  if (data.status === SemesterStatus.CURRENT)
    await prisma.semester.updateMany({
      where: { id: { not: id }, status: SemesterStatus.CURRENT },
      data: { status: SemesterStatus.COMPLETED },
    });
  const item = await prisma.semester.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, "Semester", id);
  return item;
};
const deleteSemester = async (id: string, actorId: string) => {
  const item = await prisma.semester.update({
    where: { id },
    data: { deletedAt: new Date(), status: SemesterStatus.ARCHIVED },
  });
  await audit(actorId, AuditAction.DELETE, "Semester", id);
  return item;
};

const listSections = (query: any) =>
  pageResult(
    { ...query, model: prisma.section },
    searchWhere(query, ["sectionName"], {
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
    }),
    {
      course: true,
      semester: true,
      facultyAssignments: {
        include: { faculty: { include: { user: { select: publicUser } } } },
      },
    },
  );
const getSection = async (id: string) => {
  const item = await prisma.section.findFirst({
    where: { id, deletedAt: null },
    include: {
      course: true,
      semester: true,
      facultyAssignments: {
        include: { faculty: { include: { user: { select: publicUser } } } },
      },
      enrollments: {
        where: { status: EnrollmentStatus.ENROLLED },
        include: { student: { include: { user: { select: publicUser } } } },
      },
    },
  });
  if (!item) fail("Section not found", httpStatus.NOT_FOUND);
  return item;
};
const createSection = async (data: any, actorId: string) => {
  const [course, semester] = await Promise.all([
    prisma.course.findFirst({ where: { id: data.courseId, deletedAt: null } }),
    prisma.semester.findFirst({
      where: { id: data.semesterId, deletedAt: null },
    }),
  ]);
  if (!course || !semester)
    fail("Course or semester not found", httpStatus.NOT_FOUND);
  const item = await prisma.section.create({ data });
  await audit(actorId, AuditAction.CREATE, "Section", item.id);
  return item;
};
const updateSection = async (id: string, data: any, actorId: string) => {
  const item = await prisma.section.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, "Section", id);
  return item;
};
const deleteSection = async (id: string, actorId: string) => {
  const item = await prisma.section.update({
    where: { id },
    data: { deletedAt: new Date(), status: SectionStatus.CANCELLED },
  });
  await audit(actorId, AuditAction.DELETE, "Section", id);
  return item;
};
const assignFaculty = async (
  data: { sectionId: string; facultyId: string; isPrimary?: boolean },
  actorId: string,
) => {
  const section = await prisma.section.findFirst({
    where: { id: data.sectionId, deletedAt: null },
  });
  const faculty = await prisma.facultyProfile.findFirst({
    where: { id: data.facultyId, deletedAt: null },
  });
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
const removeFaculty = async (
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

const studentForUser = async (userId: string) => {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) fail("Student profile not found", httpStatus.NOT_FOUND);
  return profile!;
};
const facultyForUser = async (userId: string) => {
  const profile = await prisma.facultyProfile.findUnique({ where: { userId } });
  if (!profile) fail("Faculty profile not found", httpStatus.NOT_FOUND);
  return profile!;
};
const ensureFacultyAssignment = async (sectionId: string, userId: string) => {
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

const enroll = async (userId: string, sectionId: string) =>
  prisma.$transaction(async (tx) => {
    const student = (await tx.studentProfile.findUnique({
      where: { userId },
      include: {
        enrollments: {
          include: { section: { include: { course: true, semester: true } } },
        },
      },
    }))!;
    if (!student) fail("Student profile not found", httpStatus.NOT_FOUND);
    const section = (await tx.section.findFirst({
      where: { id: sectionId, deletedAt: null },
      include: {
        course: true,
        semester: true,
        enrollments: { where: { status: EnrollmentStatus.ENROLLED } },
      },
    }))!;
    if (!section) fail("Section not found", httpStatus.NOT_FOUND);
    const now = new Date();
    if (
      section.status !== SectionStatus.PUBLISHED ||
      section.course.status !== "PUBLISHED"
    )
      fail("Section or course is not available");
    if (
      section.semester.status !== SemesterStatus.REGISTRATION_OPEN ||
      now < section.semester.registrationStart ||
      now > section.semester.registrationEnd
    )
      fail("Registration is not open");
    if (section.enrollments.length >= section.capacity)
      fail("Section capacity has been reached");
    const existing = await tx.enrollment.findUnique({
      where: { studentId_sectionId: { studentId: student.id, sectionId } },
    });
    if (existing?.status === EnrollmentStatus.ENROLLED)
      fail("Already enrolled in this section", httpStatus.CONFLICT);
    const completedCourses = student.enrollments
      .filter((item) => item.status === EnrollmentStatus.COMPLETED)
      .map((item) => item.section.courseId);
    if (completedCourses.includes(section.courseId))
      fail("Course has already been completed");
    const activeEnrollments = student.enrollments.filter(
      (item) =>
        item.status === EnrollmentStatus.ENROLLED &&
        item.section.semesterId === section.semesterId,
    );
    const currentCredits = activeEnrollments.reduce(
      (sum, item) => sum + item.section.course.credits,
      0,
    );
    if (currentCredits + section.course.credits > SEMESTER_CREDIT_LIMIT)
      fail(`Semester credit limit is ${SEMESTER_CREDIT_LIMIT}`);
    const prerequisites = await tx.coursePrerequisite.findMany({
      where: { courseId: section.courseId },
    });
    const passed = new Set(completedCourses);
    if (prerequisites.some((item) => !passed.has(item.prerequisiteId)))
      fail("Course prerequisites are not completed");
    const item = existing
      ? await tx.enrollment.update({
          where: { id: existing.id },
          data: {
            status: EnrollmentStatus.ENROLLED,
            enrolledAt: now,
            droppedAt: null,
            deletedAt: null,
          },
        })
      : await tx.enrollment.create({
          data: { studentId: student.id, sectionId },
        });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: AuditAction.ENROLL,
        entity: "Enrollment",
        entityId: item.id,
      },
    });
    return item;
  });
const dropEnrollment = async (userId: string, enrollmentId: string) => {
  const student = await studentForUser(userId);
  const item = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      studentId: student.id,
      status: EnrollmentStatus.ENROLLED,
    },
  });
  if (!item) fail("Enrollment not found", httpStatus.NOT_FOUND);
  const result = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: EnrollmentStatus.DROPPED, droppedAt: new Date() },
  });
  await audit(userId, AuditAction.DROP_ENROLLMENT, "Enrollment", enrollmentId);
  return result;
};
const listEnrollments = async (userId: string, role: Role, query: any) => {
  const student =
    role === Role.STUDENT ? await studentForUser(userId) : undefined;
  const faculty =
    role === Role.FACULTY ? await facultyForUser(userId) : undefined;
  return pageResult(
    { ...query, model: prisma.enrollment },
    {
      ...(student ? { studentId: student.id } : {}),
      ...(faculty
        ? {
            section: {
              facultyAssignments: { some: { facultyId: faculty.id } },
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
    },
    {
      student: { include: { user: { select: publicUser } } },
      section: { include: { course: true, semester: true } },
    },
  );
};

const createAttendance = async (userId: string, data: any) => {
  await ensureFacultyAssignment(data.sectionId, userId);
  const enrollment = (await prisma.enrollment.findFirst({
    where: {
      id: data.enrollmentId,
      sectionId: data.sectionId,
      status: EnrollmentStatus.ENROLLED,
    },
  }))!;
  if (!enrollment) fail("Active enrollment not found", httpStatus.NOT_FOUND);
  const item = await prisma.attendance.create({
    data: {
      ...data,
      studentId: enrollment.studentId,
      sectionId: data.sectionId,
      markedById: userId,
    },
  });
  await audit(userId, AuditAction.MARK_ATTENDANCE, "Attendance", item.id);
  return item;
};
const updateAttendance = async (userId: string, id: string, data: any) => {
  const current = (await prisma.attendance.findUnique({ where: { id } }))!;
  if (!current) fail("Attendance not found", httpStatus.NOT_FOUND);
  await ensureFacultyAssignment(current.sectionId, userId);
  const item = await prisma.attendance.update({
    where: { id },
    data: { status: data.status, remarks: data.remarks },
  });
  await audit(userId, AuditAction.UPDATE_ATTENDANCE, "Attendance", id);
  return item;
};
const listAttendance = async (
  userId: string,
  role: Role,
  sectionId: string,
) => {
  if (role === Role.FACULTY) await ensureFacultyAssignment(sectionId, userId);
  const where: any = { sectionId, deletedAt: null };
  if (role === Role.STUDENT) {
    const student = await studentForUser(userId);
    where.studentId = student.id;
  }
  return prisma.attendance.findMany({ where, orderBy: { classDate: "desc" } });
};

const createExam = async (userId: string, data: any) => {
  await ensureFacultyAssignment(data.sectionId, userId);
  const section = await prisma.section.findFirst({
    where: { id: data.sectionId, deletedAt: null },
  });
  if (!section) fail("Section not found", httpStatus.NOT_FOUND);
  const item = await prisma.exam.create({ data });
  await audit(userId, AuditAction.CREATE_EXAM, "Exam", item.id);
  return item;
};
const updateExam = async (userId: string, id: string, data: any) => {
  const exam = (await prisma.exam.findUnique({ where: { id } }))!;
  if (!exam) fail("Exam not found", httpStatus.NOT_FOUND);
  await ensureFacultyAssignment(exam.sectionId, userId);
  const item = await prisma.exam.update({ where: { id }, data });
  await audit(userId, AuditAction.UPDATE_EXAM, "Exam", id);
  return item;
};
const publishExam = async (userId: string, id: string) => {
  const exam = (await prisma.exam.findUnique({ where: { id } }))!;
  if (!exam) fail("Exam not found", httpStatus.NOT_FOUND);
  await ensureFacultyAssignment(exam.sectionId, userId);
  return prisma.exam.update({
    where: { id },
    data: { status: ExamStatus.PUBLISHED },
  });
};
const listExams = async (userId: string, role: Role, query: any) => {
  if (role === Role.FACULTY && query.sectionId)
    await ensureFacultyAssignment(query.sectionId, userId);
  const student =
    role === Role.STUDENT ? await studentForUser(userId) : undefined;
  const faculty =
    role === Role.FACULTY ? await facultyForUser(userId) : undefined;
  const where: any = {
    deletedAt: null,
    ...(query.sectionId ? { sectionId: query.sectionId } : {}),
  };
  if (faculty)
    where.section = { facultyAssignments: { some: { facultyId: faculty.id } } };
  if (student)
    where.section = {
      enrollments: {
        some: { studentId: student.id, status: EnrollmentStatus.ENROLLED },
      },
    };
  return prisma.exam.findMany({
    where,
    include: { section: { include: { course: true, semester: true } } },
    orderBy: { examDate: "asc" },
  });
};

const gradeFor = (percentage: number): { grade: Grade; gradePoint: number } => {
  if (percentage >= 90) return { grade: Grade.A_PLUS, gradePoint: 4 };
  if (percentage >= 85) return { grade: Grade.A, gradePoint: 3.75 };
  if (percentage >= 80) return { grade: Grade.A_MINUS, gradePoint: 3.5 };
  if (percentage >= 75) return { grade: Grade.B_PLUS, gradePoint: 3.25 };
  if (percentage >= 70) return { grade: Grade.B, gradePoint: 3 };
  if (percentage >= 65) return { grade: Grade.B_MINUS, gradePoint: 2.75 };
  if (percentage >= 60) return { grade: Grade.C_PLUS, gradePoint: 2.5 };
  if (percentage >= 55) return { grade: Grade.C, gradePoint: 2.25 };
  if (percentage >= 50) return { grade: Grade.C_MINUS, gradePoint: 2 };
  if (percentage >= 45) return { grade: Grade.D, gradePoint: 1 };
  return { grade: Grade.F, gradePoint: 0 };
};
const upsertResult = async (userId: string, data: any) => {
  const exam = (await prisma.exam.findUnique({ where: { id: data.examId } }))!;
  if (!exam) fail("Exam not found", httpStatus.NOT_FOUND);
  await ensureFacultyAssignment(exam.sectionId, userId);
  const enrollment = (await prisma.enrollment.findFirst({
    where: {
      id: data.enrollmentId,
      studentId: data.studentId,
      sectionId: exam.sectionId,
      status: EnrollmentStatus.ENROLLED,
    },
    include: { section: { include: { course: true } } },
  }))!;
  if (!enrollment) fail("Matching active enrollment not found");
  if (data.marksObtained > exam.totalMarks)
    fail("Marks cannot exceed total marks");
  const result = gradeFor((data.marksObtained / exam.totalMarks) * 100);
  return prisma.result.upsert({
    where: {
      examId_studentId: { examId: data.examId, studentId: data.studentId },
    },
    update: {
      enrollmentId: data.enrollmentId,
      marksObtained: data.marksObtained,
      grade: result.grade,
      gradePoint: result.gradePoint,
      enteredById: userId,
      status: ResultStatus.SUBMITTED,
    },
    create: {
      ...data,
      ...result,
      enteredById: userId,
      status: ResultStatus.SUBMITTED,
    },
  });
};
const publishResult = async (userId: string, id: string) => {
  const current = (await prisma.result.findUnique({
    where: { id },
    include: { exam: true },
  }))!;
  if (!current) fail("Result not found", httpStatus.NOT_FOUND);
  if (!current.exam) fail("Exam not found");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role !== Role.ADMIN)
    fail("Only admins can publish results", httpStatus.FORBIDDEN);
  return prisma.result.update({
    where: { id },
    data: { status: ResultStatus.PUBLISHED, publishedAt: new Date() },
  });
};
const listResults = async (userId: string, role: Role, query: any) => {
  const student =
    role === Role.STUDENT ? await studentForUser(userId) : undefined;
  const where: any = {
    deletedAt: null,
    ...(role === Role.STUDENT ? { status: ResultStatus.PUBLISHED } : {}),
    ...(student ? { studentId: student.id } : {}),
    ...(query.examId ? { examId: query.examId } : {}),
  };
  return prisma.result.findMany({
    where,
    include: {
      exam: {
        include: { section: { include: { course: true, semester: true } } },
      },
      student: { include: { user: { select: publicUser } } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const AcademicService = {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  addPrerequisite,
  removePrerequisite,
  listSemesters,
  getSemester,
  createSemester,
  updateSemester,
  deleteSemester,
  listSections,
  getSection,
  createSection,
  updateSection,
  deleteSection,
  assignFaculty,
  removeFaculty,
  enroll,
  dropEnrollment,
  listEnrollments,
  createAttendance,
  updateAttendance,
  listAttendance,
  createExam,
  updateExam,
  publishExam,
  listExams,
  upsertResult,
  publishResult,
  listResults,
};
