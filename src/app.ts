import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import config from "./config/index.js";
import { prisma } from "./lib/prisma.js";
import { globalErrorHandler } from "./middleware/globalErrorHandler.js";
import { notFound } from "./middleware/notFound.js";

const app = express();

app.use(
  cors({
    origin: config.frontend_url,
    credentials: true,
  }),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.get("/check-users", (req: Request, res: Response) => {
  res.json([
    { id: 1, name: "John Doe" },
    { id: 2, name: "Jane Doe" },
  ]);
});

app.get("/users", async (req: Request, res: Response) => {
  await prisma.user
    .findMany({
      omit: {
        passwordHash: true,
      },
    })
    .then((users: any[]) => {
      res.json(users);
    })
    .catch((error: any) => {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
