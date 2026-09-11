import type { Request } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { CoursePrerequisiteService } from "./course-prerequisite.service.js";
const user = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user;
};
export const CoursePrerequisiteController = {
  add: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Prerequisite added successfully",
      data: await CoursePrerequisiteService.add(req.body, user(req).userId),
    }),
  ),
  remove: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Prerequisite removed successfully",
      data: await CoursePrerequisiteService.remove(
        String(req.params.courseId),
        String(req.params.prerequisiteId),
        user(req).userId,
      ),
    }),
  ),
};
