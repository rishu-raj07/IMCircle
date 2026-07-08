import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SECTIONS = [
  {
    title: "1. Information we collect",
    body: "Account details you give us directly — name, username, email or mobile number, date of birth, gender, profile photo, headline, location, and the interest you pick during setup. Content you create — posts, journey updates, comments, messages, circle activity, and anything you upload with them (images, links). Usage data — device and browser type, IP address, pages viewed, and actions like joins, follows, likes and saves. Information from others — if someone tags you, mentions you, or invites you to a circle, we receive that information too.",
  },
  {
    title: "2. How we use your information",
    body: "To operate the core app — show your feed, connect you with relevant circles and people, deliver notifications, and process the actions you take (posting, messaging, joining). To personalize — rank suggested circles and people based on your stated interest and activity. To keep the platform safe — detect spam, fake accounts, abuse, and enforce our Terms of Service. To communicate with you — service updates, security alerts, and responses to support requests or problem reports you submit. We do not sell your personal data to third parties.",
  },
  {
    title: "3. Legal basis for processing",
    body: "Where required by law, we process your data based on your consent (given when you create an account and agree to this policy), the necessity of processing to provide the service you asked for, and our legitimate interest in keeping IMCircle secure and functioning correctly.",
  },
  {
    title: "4. What you share publicly vs. privately",
    body: "Your profile, posts, and journey updates are visible to other users by default, based on the visibility settings available in the app. Direct messages and items you save are private to you and the people you're messaging. Circle content is visible to members of that circle, and may be visible more broadly depending on the circle's privacy setting.",
  },
  {
    title: "5. Sharing with third parties",
    body: "We do not sell your personal data. We share limited data with the service providers who help us run the app, each bound to use it only to provide that service: Google, for Sign in with Google (verifies your identity when you choose that login method); Cloudinary, for storing and delivering the photos and videos you upload; MSG91, for sending the SMS one-time passcodes used to verify your mobile number; and our email and database hosting providers, for account communications and storing your data securely. We may disclose information if required by law, to enforce our terms, or to protect the rights, safety, or property of IMCircle, our users, or the public.",
  },
  {
    title: "6. Cookies and similar technologies",
    body: "We use cookies, local storage, and similar technologies to keep you signed in, remember your preferences (like light/dark theme), and understand how the app is used so we can improve it. You can control cookies through your browser settings, though some parts of the app may not work correctly if you disable them.",
  },
  {
    title: "7. Data retention",
    body: "We keep your account information for as long as your account is active. If you stop using IMCircle, we may retain data for a reasonable period afterward to comply with legal obligations, resolve disputes, and enforce our agreements, after which it is deleted or anonymized.",
  },
  {
    title: "8. Data security",
    body: "We use industry-standard measures to protect your data, including encrypted connections (HTTPS), access controls on our servers and databases, and password hashing. No method of transmission or storage is 100% secure, and we can't guarantee absolute security, but we work to protect your information and to respond quickly if something goes wrong.",
  },
  {
    title: "9. Children's privacy",
    body: "IMCircle is not directed at children under the age of 13 (or the minimum age required in your country), and we do not knowingly collect personal data from children under that age. If we learn that we have collected such data, we will delete it promptly. If you believe a child has provided us with personal information, please contact us.",
  },
  {
    title: "10. Your rights and choices",
    body: "Depending on where you live, you may have the right to access the personal data we hold about you, correct inaccurate data, request deletion of your data, restrict or object to certain processing, and receive a copy of your data in a portable format. You can update most of your profile information directly from My Account, and reach out through Report a Problem for anything you can't manage yourself yet.",
  },
  {
    title: "11. International data transfers",
    body: "Your information may be stored and processed in countries other than the one you live in. Where we transfer data internationally, we take steps to ensure it continues to be protected in line with this policy.",
  },
  {
    title: "12. Third-party links",
    body: "IMCircle may contain links to third-party websites or services (for example, a link shared in a post). We are not responsible for the privacy practices of those third parties, and we encourage you to review their policies separately.",
  },
  {
    title: "13. Changes to this policy",
    body: "We may update this policy as IMCircle evolves. If a change is significant, we'll let you know in the app before it takes effect. Continuing to use IMCircle after an update means you accept the revised policy.",
  },
  {
    title: "14. Contact us",
    body: "If you have questions about this Privacy Policy or how your data is handled, you can reach us through the Report a Problem option in Settings.",
  },
];

function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-bg)] pb-8">
        <div className="sticky top-0 z-30 border-b border-[var(--imc-border)] bg-[var(--imc-bg)]/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <ArrowLeft size={21} className="text-[var(--imc-text)]" />
            </button>

            <h1 className="text-[20px] font-black text-[var(--imc-text)]">
              Privacy Policy
            </h1>
          </div>
        </div>

        <div className="px-5 py-5">
          <p className="mb-5 text-[11px] font-semibold text-[var(--imc-text-faint)]">
            Last updated July 2026. This policy explains what information IMCircle
            collects, how we use it, and the choices you have.
          </p>

          <div>
            {SECTIONS.map((section, index) => (
              <div
                key={section.title}
                className={`py-4 ${index === 0 ? "" : "border-t border-[var(--imc-border)]"}`}
              >
                <h2 className="text-[13.5px] font-black text-[var(--imc-text)]">
                  {section.title}
                </h2>
                <p className="mt-2 text-[12.5px] font-semibold leading-6 text-[var(--imc-text-muted)]">
                  {section.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
