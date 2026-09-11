import type { Request } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { EnrollmentService } from "./enrollment.service.js";
const user = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user;
};
export const EnrollmentController = {
  list: catchAsync(async (req, res) => {
    const current = user(req);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Enrollments fetched successfully",
      ...(await EnrollmentService.list(
        current.userId,
        current.role,
        req.query,
      )),
    });
  }),
  create: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Enrollment created successfully",
      data: await EnrollmentService.create(
        user(req).userId,
        req.body.sectionId,
      ),
    }),
  ),
  drop: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Enrollment dropped successfully",
      data: await EnrollmentService.drop(
        user(req).userId,
        String(req.params.id),
      ),
    }),
  ),
};
