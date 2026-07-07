import VerificationRequest from "../models/VerificationRequest.js";

export const listVerificationRequests = async (req, res) => {
  try {
    const { status = "all", q = "" } = req.query;

    const filter = {};
    if (["pending", "reviewing", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }

    const search = q.trim();
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const requests = await VerificationRequest.find(filter)
      .populate("user", "fullName name username mobile email headline avatar profileImage isBlocked isDeleted")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
