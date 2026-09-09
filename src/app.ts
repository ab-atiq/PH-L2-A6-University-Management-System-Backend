import express from "express";
import { prisma } from "./lib/prisma";

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/check-users", (req, res) => {
  res.json([
    { id: 1, name: "John Doe" },
    { id: 2, name: "Jane Doe" },
  ]);
});

app.get("/users", async (req, res) => {
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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

export default app;
