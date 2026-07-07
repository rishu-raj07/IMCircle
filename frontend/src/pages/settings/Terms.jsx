import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    body: "By creating an account or using IMCircle in any way, you agree to these Terms of Service and our Privacy Policy. If you don't agree, please don't use the app.",
  },
  {
    title: "2. Eligibility",
    body: "You must be at least 13 years old (or the minimum age required in your country) to use IMCircle. By using the app, you confirm that you meet this requirement and that you're legally able to enter into these terms. Accounts created on behalf of a business must be managed by someone authorized to act for that business.",
  },
  {
    title: "3. Your account",
    body: "You're responsible for the accuracy of the information you provide and for keeping your login credentials confidential. You're responsible for all activity that happens under your account. Let us know immediately through Report a Problem if you suspect unauthorized access to your account.",
  },
  {
    title: "4. Your content and license to us",
    body: "You own the posts, journey updates, comments, and other content you create on IMCircle. By posting content, you grant IMCircle a worldwide, non-exclusive, royalty-free license to host, store, reproduce, and display that content as necessary to operate and improve the app — for example, showing your post in other users' feeds. This license ends when you delete the content, except where it has been shared or reposted by others, or where retention is required for legal reasons.",
  },
  {
    title: "5. Acceptable use",
    body: "You agree not to use IMCircle to harass, threaten, or bully others; impersonate any person or entity; post spam, malware, or deceptive content; infringe anyone's intellectual property or privacy rights; scrape, reverse-engineer, or interfere with the app's normal operation; or use the platform for any unlawful purpose. We may remove content or restrict accounts that violate this section without prior notice.",
  },
  {
    title: "6. Circles and community content",
    body: "Circles are community spaces created by users. Circle owners and admins are responsible for moderating their own communities in line with these terms. IMCircle may still remove content or restrict circles that violate these terms regardless of community-level moderation decisions.",
  },
  {
    title: "7. Intellectual property",
    body: "The IMCircle name, logo, and app design are the property of IMCircle and may not be used without permission. Except for the content you create, nothing in these terms transfers any IMCircle intellectual property to you.",
  },
  {
    title: "8. Third-party content and links",
    body: "IMCircle may display links or content from third parties (for example, a link shared in a post, or an embedded resource). We don't control and aren't responsible for third-party content, and including a link doesn't mean we endorse it.",
  },
  {
    title: "9. Reports, suspension, and termination",
    body: "We may suspend or terminate your account, with or without notice, if we believe you've violated these terms, created risk or legal exposure for us or other users, or if required by law. You may stop using IMCircle and request account deletion at any time by contacting us through Report a Problem.",
  },
  {
    title: "10. Disclaimers",
    body: "IMCircle is provided \"as is\" and \"as available,\" without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the app will be uninterrupted, secure, timely, or error-free, or that content posted by other users is accurate or reliable.",
  },
  {
    title: "11. Limitation of liability",
    body: "To the maximum extent permitted by law, IMCircle and its team will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, arising from your use of or inability to use the app, even if we've been advised of the possibility of such damages.",
  },
  {
    title: "12. Indemnification",
    body: "You agree to indemnify and hold IMCircle harmless from any claims, damages, losses, or expenses (including reasonable legal fees) arising from your use of the app, your content, or your violation of these terms or of any third party's rights.",
  },
  {
    title: "13. Governing law and disputes",
    body: "These terms are governed by the laws of India, without regard to conflict-of-law principles. Any dispute arising from these terms or your use of IMCircle will be subject to the exclusive jurisdiction of the courts located in India, unless otherwise required by applicable local law.",
  },
  {
    title: "14. Changes to these terms",
    body: "We may update these terms as IMCircle evolves. If a change is significant, we'll let you know in the app before it takes effect. Continuing to use IMCircle after an update means you accept the revised terms.",
  },
  {
    title: "15. Severability",
    body: "If any part of these terms is found to be unenforceable, the rest of the terms will remain in full effect.",
  },
  {
    title: "16. Contact us",
    body: "Questions about these Terms of Service can be sent through the Report a Problem option in Settings.",
  },
];

function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-bg)] pb-28">
        <div className="sticky top-0 z-30 border-b border-[var(--imc-border)] bg-[var(--imc-bg)]/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <ArrowLeft size={21} className="text-[var(--imc-text)]" />
            </button>

            <h1 className="text-[20px] font-black text-[var(--imc-text)]">
              Terms of Service
            </h1>
          </div>
        </div>

        <div className="px-5 py-5">
          <p className="mb-5 text-[11px] font-semibold text-[var(--imc-text-faint)]">
            Last updated July 2026. Please read these terms carefully before using IMCircle.
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

        <BottomNav />
      </div>
    </div>
  );
}

export default Terms;
