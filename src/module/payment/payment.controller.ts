import type { Request } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { PaymentService } from "./payment.service.js";

const currentUser = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user;
};
const initiate = catchAsync(async (req, res) =>
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Payment session created",
    data: await PaymentService.initiate(currentUser(req).userId, req.body),
  }),
);
const webhook = catchAsync(async (req, res) =>
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment webhook processed",
    data: await PaymentService.processWebhook(
      req.body,
      req.header("x-gateway-signature") || undefined,
    ),
  }),
);
const getById = catchAsync(async (req, res) => {
  const user = currentUser(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment fetched successfully",
    data: await PaymentService.getById(
      user.userId,
      user.role,
      String(req.params.id),
    ),
  });
});
export const PaymentController = { initiate, webhook, getById };
