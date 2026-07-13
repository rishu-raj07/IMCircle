import ProblemReport from "../models/ProblemReport.js";
import { sendMail } from "../utils/mailer.js";

const DEVELOPER_EMAIL = process.env.DEV_NOTIFY_EMAIL || "rishu@imcircle.com";

export const reportProblem = async (req, res) => {
  try {
    const message = (req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Please describe the problem before sending.",
      });
    }

    const userId = req.user._id;
    const email = req.user.email;

    const report = await ProblemReport.create({
      user: userId,
      email,
      message,
    });

    const name = req.user.fullName || req.user.name || req.user.username || "A user";

    const mailResult = await sendMail({
      to: DEVELOPER_EMAIL,
      subject: "IMCircle — new problem report",
      text: `${name} (${email}) reported a problem on IMCircle:\n\n${message}`,
      html: `<p><strong>${name}</strong> (${email}) reported a problem on IMCircle:</p><p>${message}</p>`,
    });

    if (mailResult.sent) {
      report.emailSent = true;
      await report.save();
    }

    return res.status(201).json({
      success: true,
      report,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
