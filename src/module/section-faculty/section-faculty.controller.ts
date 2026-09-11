import type { Request } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { SectionFacultyService } from "./section-faculty.service.js";
const actor = (req: Request) => req.user!;
export const SectionFacultyController = {
  assign: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Faculty assigned successfully",
      data: await SectionFacultyService.assign(req.body, actor(req).userId),
    }),
  ),
  remove: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Faculty assignment removed successfully",
      data: await SectionFacultyService.remove(
        String(req.params.sectionId),
        String(req.params.facultyId),
        actor(req).userId,
      ),
    }),
  ),
};
