import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";

export const securityMiddleware = [
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),

  mongoSanitize(),

  hpp(),
];

export const secureCorsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
};