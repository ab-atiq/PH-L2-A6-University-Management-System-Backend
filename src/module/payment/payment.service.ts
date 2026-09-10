import crypto from "crypto";
import httpStatus from "http-status";
import {
  AuditAction,
  InvoiceStatus,
  PaymentGateway,
  PaymentStatus,
  Role,
} from "../../../generated/prisma/enums.js";
import config from "../../config/index.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

const createBkashPayment = async (transactionId: string, amount: string) => {
  if (!config.bkash_base_url || !config.bkash_username || !config.bkash_app_key)
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "bKash is not configured",
    );
  const tokenResponse = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/token/grant`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        username: config.bkash_username,
        password: config.bkash_password,
      },
      body: JSON.stringify({
        app_key: config.bkash_app_key,
        app_secret: config.bkash_app_secret,
      }),
    },
  );
  if (!tokenResponse.ok)
    throw new AppError(httpStatus.BAD_GATEWAY, "bKash token grant failed");
  const token = ((await tokenResponse.json()) as { id_token?: string })
    .id_token;
  if (!token)
    throw new AppError(httpStatus.BAD_GATEWAY, "bKash token was not returned");
  const response = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-App-Key": config.bkash_app_key,
      },
      body: JSON.stringify({
        mode: "001",
        payerReference: transactionId,
        callbackURL: config.bkash_callback_url,
        amount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: transactionId,
      }),
    },
  );
  if (!response.ok)
    throw new AppError(httpStatus.BAD_GATEWAY, "bKash payment creation failed");
  return (await response.json()) as Record<string, unknown>;
};

const initiate = async (
  userId: string,
  data: { invoiceId: string; gateway: PaymentGateway },
) => {
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: data.invoiceId, studentId: student.id, deletedAt: null },
    include: { payments: { where: { status: PaymentStatus.SUCCESS } } },
  });
  if (!invoice) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
  if (invoice.status === InvoiceStatus.PAID || invoice.payments.length)
    throw new AppError(httpStatus.CONFLICT, "Invoice is already paid");
  if (invoice.status === InvoiceStatus.CANCELLED)
    throw new AppError(httpStatus.BAD_REQUEST, "Invoice is cancelled");
  if (new Date() > invoice.dueDate)
    throw new AppError(httpStatus.BAD_REQUEST, "Invoice is past due");
  if (data.gateway !== PaymentGateway.BKASH)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This gateway is not configured for real payments",
    );
  const transactionId = `TXN-${crypto.randomUUID()}`;
  const payment = await prisma.payment.create({
    data: {
      transactionId,
      invoiceId: invoice.id,
      studentId: student.id,
      amount: invoice.amount,
      gateway: data.gateway,
      status: PaymentStatus.INITIATED,
    },
  });
  try {
    const gatewayResponse = await createBkashPayment(
      transactionId,
      invoice.amount.toString(),
    );
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PENDING,
        ...(typeof gatewayResponse.paymentID === "string"
          ? { gatewayReference: gatewayResponse.paymentID }
          : {}),
        gatewayResponse: gatewayResponse as any,
      },
    });
    return { payment: updated, redirectUrl: gatewayResponse.bkashURL ?? null };
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        gatewayResponse: {
          error: error instanceof Error ? error.message : "Gateway error",
        },
      },
    });
    throw error;
  }
};

const processWebhook = async (payload: any, signature?: string) => {
  if (config.payment_webhook_secret) {
    const expected = crypto
      .createHmac("sha256", config.payment_webhook_secret)
      .update(JSON.stringify(payload))
      .digest("hex");
    if (
      !signature ||
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    )
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Invalid payment webhook signature",
      );
  } else if (config.node_env === "production")
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Payment webhook secret is not configured",
    );
  const payment = await prisma.payment.findUnique({
    where: { transactionId: payload.transactionId },
    include: { invoice: true },
  });
  if (!payment)
    throw new AppError(httpStatus.NOT_FOUND, "Payment transaction not found");
  if (payment.status === PaymentStatus.SUCCESS) return payment;
  const status =
    payload.status === "SUCCESS"
      ? PaymentStatus.SUCCESS
      : payload.status === "FAILED"
        ? PaymentStatus.FAILED
        : payload.status === "CANCELLED"
          ? PaymentStatus.CANCELLED
          : PaymentStatus.PENDING;
  if (
    status === PaymentStatus.SUCCESS &&
    payment.amount.toString() !== payment.invoice.amount.toString()
  )
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment amount does not match invoice",
    );
  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status,
        ...(payload.gatewayReference
          ? { gatewayReference: payload.gatewayReference }
          : {}),
        gatewayResponse: payload.gatewayResponse ?? payload,
        ...(status === PaymentStatus.SUCCESS ? { paidAt: new Date() } : {}),
      },
    });
    if (status === PaymentStatus.SUCCESS)
      await tx.feeInvoice.update({
        where: { id: payment.invoiceId },
        data: { status: InvoiceStatus.PAID },
      });
    await tx.auditLog.create({
      data: {
        actorId: null,
        action: AuditAction.UPDATE_PAYMENT_STATUS,
        entity: "Payment",
        entityId: payment.id,
        metadata: payload.gatewayResponse ?? payload,
      },
    });
    return updated;
  });
};

const getById = async (userId: string, role: Role, id: string) => {
  const student =
    role === Role.STUDENT
      ? await prisma.studentProfile.findUnique({ where: { userId } })
      : null;
  const payment = await prisma.payment.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(student ? { studentId: student.id } : {}),
    },
    include: { invoice: true },
  });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  return payment;
};
export const PaymentService = { initiate, processWebhook, getById };
