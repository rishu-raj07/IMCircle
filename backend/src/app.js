import express from "express";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import { securityMiddleware, secureCorsOptions } from "./middleware/security.middleware.js";
import { globalLimiter } from "./middleware/rateLimit.middleware.js";
import { generateCsrfToken } from "./middleware/csrf.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import userRoutes from "./routes/user.routes.js";
import connectionRoutes from "./routes/connection.routes.js";
import postRoutes from "./routes/post.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import messageRoutes from "./routes/message.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import opportunityRoutes from "./routes/opportunity.routes.js";
import journeyRoutes from "./routes/journey.routes.js";
import builderScoreRoutes from "./routes/builderScore.routes.js";
import learningRoutes from "./routes/learning.routes.js";
import feedRoutes from "./routes/feed.routes.js";
import searchRoutes from "./routes/search.routes.js";
import circleRoutes from "./routes/circle.routes.js";
import savedRoutes from "./routes/saved.routes.js";
import projectRoutes from "./routes/project.routes.js";
import circlePostRoutes from "./routes/circlePost.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import metaRoutes from "./routes/meta.routes.js";
import companyRoutes from "./routes/company.routes.js";
import collegeRoutes from "./routes/college.routes.js";
import circleRequestRoutes from "./routes/circleRequest.routes.js";
import verificationRoutes from "./routes/verification.routes.js";
import supportRoutes from "./routes/support.routes.js";
import adminAuthRoutes from "./routes/adminAuth.routes.js";
import adminDashboardRoutes from "./routes/adminDashboard.routes.js";
import adminUsersRoutes from "./routes/adminUsers.routes.js";
import adminContentRoutes from "./routes/adminContent.routes.js";
import adminReportsRoutes from "./routes/adminReports.routes.js";
import adminAnalyticsRoutes from "./routes/adminAnalytics.routes.js";
import adminVerificationRoutes from "./routes/adminVerification.routes.js";
const app = express();

app.set("trust proxy", 1);

app.use(cors(secureCorsOptions));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(compression());
// COOKIE_SECRET is optional — passing undefined to cookie-parser is the
// same as calling it with no args (unsigned cookies only), so this is
// backward compatible with every environment that doesn't set it yet.
// accessToken/refreshToken are read via req.cookies (unsigned) elsewhere
// in this app regardless, so setting this only adds the ability to use
// req.signedCookies for anything that wants that extra integrity check.
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(securityMiddleware);
app.use(globalLimiter);
app.use(generateCsrfToken);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    message: "Bharat Network API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/users", userRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);
// Opportunities/Jobs and Projects are held back for this release — the
// routers still exist and work, they're just not mounted. Re-add these two
// lines (and the matching frontend flag in routes/AppRoutes.jsx) to bring
// the feature back.
// app.use("/api/opportunities", opportunityRoutes);
// app.use("/api/projects", projectRoutes);
app.use("/api/journeys", journeyRoutes);
app.use("/api/builder-score", builderScoreRoutes);
app.use("/api/learnings", learningRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/circles", circleRoutes);
app.use("/api/saved", savedRoutes);
app.use("/api", circlePostRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/circle-requests", circleRequestRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/content", adminContentRoutes);
app.use("/api/admin/reports", adminReportsRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/admin/verification-requests", adminVerificationRoutes);
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON body",
    });
  }

  if (err.name === "MulterError" || err.message === "Unsupported file type") {
    return res.status(400).json({
      success: false,
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "File is too large. Please upload a smaller compressed file."
          : err.message || "File upload failed",
    });
  }

  console.error(err.stack);

  return res.status(err.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

export default app;
