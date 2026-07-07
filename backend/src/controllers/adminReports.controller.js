import ProblemReport from "../models/ProblemReport.js";

export const listAdminReports = async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;
    const filter = status === "all" ? {} : { status };
    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      ProblemReport.find(filter)
        .populate("user", "fullName username avatar mobile email isBlocked")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ProblemReport.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, reports, total, page: Number(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

const ACTION_TO_STATUS = {
  review: "reviewing",
  resolve: "resolved",
  dismiss: "dismissed",
  reopen: "open",
};

export const getAdminReportDetail = async (req, res) => {
  try {
    const report = await ProblemReport.findById(req.params.reportId).populate(
      "user",
      "fullName username avatar mobile email isBlocked createdAt"
    );

    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    res.status(200).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const updateAdminReport = async (req, res) => {
  try {
    // "resolve" and "dismiss" used to collapse onto the same "resolved"
    // status, which meant an admin couldn't tell "this was a real problem
    // we fixed" from "this wasn't actionable" after the fact. They're now
    // distinct statuses (see ProblemReport model's enum).
    const nextStatus = ACTION_TO_STATUS[req.body.action];

    if (!nextStatus) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const report = await ProblemReport.findByIdAndUpdate(
      req.params.reportId,
      { status: nextStatus },
      { new: true }
    ).populate("user", "fullName username avatar mobile email isBlocked");

    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    res.status(200).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
