import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRouter from "./routes/auth";
import policiesRouter from "./routes/policies";
import claimsRouter from "./routes/claims";
import dashboardRouter from "./routes/dashboard";

const app = express();

app.use(cors());
app.use(express.json());

const DB_STATES: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

app.get("/api/health", (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbConnected = dbState === 1;

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "ok" : "error",
    db: DB_STATES[dbState] ?? "unknown",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/policies", policiesRouter);
app.use("/api/claims", claimsRouter);
app.use("/api/dashboard", dashboardRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
