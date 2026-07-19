import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "../../hooks/useSEO";

const SECTIONS = [
  {
    title: "1. Why these guidelines exist",
    body: "IMCircle is a growth-focused social network for students, creators, founders, professionals, and freelancers who want to build, learn, share their journey, find opportunities, and grow with the right circle. These guidelines exist to keep IMCircle a safe, honest, and genuinely useful space for that mission — not to restrict what you can build, learn, or share.",
  },
  {
    title: "2. Be real",
    body: "Use your real identity and represent your work, achievements, and journey honestly. Don't impersonate another person, brand, or organization. Don't fabricate milestones, credentials, follower counts, or achievements — IMCircle's builder score and streaks are meant to reflect real progress.",
  },
  {
    title: "3. Build each other up",
    body: "Disagreement and feedback are welcome — harassment, hate speech, threats, and targeted bullying are not. This includes content that attacks someone based on race, ethnicity, national origin, religion, sex, gender identity, sexual orientation, age, disability, or serious illness. Repeated or severe violations lead to account suspension.",
  },
  {
    title: "4. No spam or manipulation",
    body: "Don't post repetitive, irrelevant, or deceptive content purely to farm engagement, follows, or builder score. Don't run fake giveaways, pyramid/MLM-style recruitment, or coordinated inauthentic activity (bot networks, vote/like rings, fake accounts). Opportunity and job posts must be genuine and currently open.",
  },
  {
    title: "5. Respect others' safety and privacy",
    body: "Don't share someone else's private information (address, phone number, government ID, financial details) without their consent. Don't post content that threatens, incites, or glorifies violence or self-harm. If you're worried about someone's safety, use Report instead of confronting them publicly.",
  },
  {
    title: "6. Original work and intellectual property",
    body: "Share work you have the rights to share. Give credit when you're building on someone else's idea, code, design, or writing. Don't post plagiarized project work or claim others' achievements as your own.",
  },
  {
    title: "7. Age and account requirements",
    body: "You must meet the minimum age requirement described in our Terms of Service to use IMCircle. Accounts found to belong to someone below that age will be removed.",
  },
  {
    title: "8. Circles are still IMCircle",
    body: "Circle owners and admins are expected to keep their communities aligned with these guidelines. IMCircle may still act on content or accounts inside a circle regardless of that circle's own moderation decisions.",
  },
  {
    title: "9. Reporting content or a user",
    body: "If you see something that breaks these guidelines, use the report option on the post, comment, or profile — available from the \"⋯\" menu wherever it appears. Reports are reviewed by the IMCircle team and are not shared with the person you're reporting. You can also block a user from your Settings → Blocked Accounts page at any time, which immediately stops them from seeing your profile, journeys, or contacting you.",
  },
  {
    title: "10. What happens after a report",
    body: "Depending on severity, we may remove the specific content, restrict an account's ability to post, temporarily suspend an account, or permanently remove it. We aim to act on reports promptly; repeat or severe violations (harassment, threats, impersonation, fraud) are prioritized.",
  },
  {
    title: "11. Account and data deletion",
    body: "You can delete your account from the Account and data controls section of our Privacy Policy. Your profile and related content are removed from IMCircle. If you later need your data restored, email rishu@imcircle.com from the address linked to your account.",
  },
  {
    title: "12. Changes to these guidelines",
    body: "As IMCircle grows, these guidelines may be updated to address new situations. Significant changes will be announced in the app. Continuing to use IMCircle after an update means you accept the revised guidelines.",
  },
  {
    title: "13. Questions",
    body: "Questions about these Community Guidelines can be sent through the Report a Problem option in Settings, or via Help & Support.",
  },
  {
    title: "14. Prohibited content and behavior",
    body: "The following are never allowed on IMCircle, in any form — posts, comments, messages, profiles, or communities: hate speech; harassment or bullying; terrorism or violent extremism; illegal activity of any kind; sexual exploitation; child sexual abuse material (CSAE) — see our Child Safety Standards; spam; fake or impersonation accounts; fraud or scams; copyright infringement; and violence or credible threats of violence. Content or accounts found violating any of these are removed on sight.",
  },
  {
    title: "15. Enforcement and appeals",
    body: "Violations are handled in proportion to severity and history: a warning for a first, minor issue; temporary suspension for repeated or more serious violations; and permanent ban for severe violations (including anything involving CSAE) or repeated offenses after a suspension. If you believe an enforcement action was made in error, you can appeal by contacting us through Report a Problem in Settings or the Safety Contact listed on our Child Safety Standards page — include your account details and why you believe the decision should be reviewed.",
  },
];

function CommunityGuidelines() {
  const navigate = useNavigate();

  useSEO({
    title: "Community Guidelines",
    description:
      "IMCircle's Community Guidelines — how we keep the social network for people who grow safe, honest, and useful: reporting, blocking, moderation, and account deletion.",
    path: "/community-guidelines",
  });

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-bg)] pb-8">
        <div className="border-b border-[var(--imc-border)] bg-[var(--imc-bg)]/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <ArrowLeft size={21} className="text-[var(--imc-text)]" />
            </button>

            <h1 className="text-[20px] font-black text-[var(--imc-text)]">
              Community Guidelines
            </h1>
          </div>
        </div>

        <div className="px-5 py-5">
          <p className="mb-5 text-[11px] font-semibold text-[var(--imc-text-faint)]">
            Last updated July 2026. These guidelines explain how to use IMCircle
            responsibly, and how reporting, blocking, and moderation work.
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

export default CommunityGuidelines;
