// Best-effort email sender. If SMTP env vars aren't configured, or the
// `nodemailer` package isn't installed yet, this silently no-ops instead of
// crashing the request — the caller should always persist the underlying
// record regardless of whether the email actually goes out.

const isSmtpConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );

let cachedTransporter = null;

async function getTransporter() {
  if (!isSmtpConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  try {
    const nodemailerModule = await import("nodemailer");
    const nodemailer = nodemailerModule.default || nodemailerModule;

    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    return cachedTransporter;
  } catch (error) {
    console.warn(
      "[mailer] nodemailer is not installed — run `npm install nodemailer` in backend/ to enable real emails. Skipping send."
    );
    return null;
  }
}

export async function sendMail({ to, subject, text, html }) {
  try {
    const transporter = await getTransporter();
    if (!transporter) return { sent: false, reason: "smtp_not_configured" };

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });

    return { sent: true };
  } catch (error) {
    console.error("[mailer] failed to send email:", error.message);
    return { sent: false, reason: error.message };
  }
}
