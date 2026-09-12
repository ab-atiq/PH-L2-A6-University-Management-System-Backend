import type { Request } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { SectionFacultyService } from "./section-faculty.service.js";

const actor = (req: Request) => req.user!;

const assignFacultyToSection = catchAsync(async (req, res) => {
  const data = await SectionFacultyService.assignFacultyToSection(
    req.body,
    actor(req).userId,
  );
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Faculty assigned successfully",
    data: data,
  });
});

const removeFacultyFromSection = catchAsync(async (req, res) => {
  const data = await SectionFacultyService.removeFacultyFromSection(
    String(req.params.sectionId),
    String(req.params.facultyId),
    actor(req).userId,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Faculty assignment removed successfully",
    data: data,
  });
});

export const SectionFacultyController = {
  assignFacultyToSection,
  removeFacultyFromSection,
};
