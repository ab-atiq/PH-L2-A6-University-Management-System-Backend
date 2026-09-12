import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";

export const actor = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user;
};

const ok = (
  res: Response,
  message: string,
  data: unknown,
  statusCode: number = httpStatus.OK,
) => sendResponse(res, { statusCode, success: true, message, data });

export const crudController = (service: any) => ({
  list: catchAsync(async (req, res) =>
    ok(res, "Records fetched successfully", await service.list(req.query)),
  ),
  get: catchAsync(async (req, res) =>
    ok(
      res,
      "Record fetched successfully",
      await service.get(String(req.params.id)),
    ),
  ),
  create: catchAsync(async (req, res) =>
    ok(
      res,
      "Record created successfully",
      await service.create(req.body, actor(req).userId),
      httpStatus.CREATED,
    ),
  ),
  update: catchAsync(async (req, res) =>
    ok(
      res,
      "Record updated successfully",
      await service.update(String(req.params.id), req.body, actor(req).userId),
    ),
  ),
  remove: catchAsync(async (req, res) =>
    ok(
      res,
      "Record deleted successfully",
      await service.remove(String(req.params.id), actor(req).userId),
    ),
  ),
});
