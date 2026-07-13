import VerificationRequest from "../models/VerificationRequest.js";
import { sendMail } from "../utils/mailer.js";

const DEVELOPER_EMAIL = process.env.DEV_NOTIFY_EMAIL || "rishu@imcircle.com";

export const preRegisterVerification = async (req, res) => {
  try {
    const userId = req.user._id;
    const email = req.user.email || "";
    const mobile = req.user.mobile || "";
    const name = req.user.fullName || req.user.name || req.user.username || "A user";

    let request = await VerificationRequest.findOne({ user: userId });

    if (request) {
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        request,
      });
    }

    request = await VerificationRequest.create({
      user: userId,
      email,
      mobile,
      name,
      username: req.user.username || "",
      status: "pending",
    });

    const contact = email || mobile || "no contact available";

    const mailResult = await sendMail({
      to: DEVELOPER_EMAIL,
      subject: "IMCircle — new verification pre-registration",
      text: `${name} (${contact}) pre-registered for the verification tick on IMCircle.`,
      html: `<p><strong>${name}</strong> (${contact}) pre-registered for the verification tick on IMCircle.</p>`,
    });

    if (mailResult.sent) {
      request.emailSent = true;
      await request.save();
    }

    return res.status(201).json({
      success: true,
      alreadyRegistered: false,
      request,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getVerificationStatus = async (req, res) => {
  try {
    const request = await VerificationRequest.findOne({ user: req.user._id });

    return res.status(200).json({
      success: true,
      registered: Boolean(request),
      request: request || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
