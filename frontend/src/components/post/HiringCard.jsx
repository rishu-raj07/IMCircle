import { useState } from "react";
import {
  BriefcaseBusiness,
  MapPin,
  IndianRupee,
  Eye,
  Building2,
  ArrowUpRight,
  Clock3,
} from "lucide-react";

import ViewInfoSheet from "../common/ViewInfoSheet";

const SUCCESS = "#059669";

function formatCount(num = 0) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num;
}

function HiringCard({ opportunity = {} }) {
  const [showViews, setShowViews] = useState(false);

  const title = opportunity.title || "Hiring Opportunity";

  const company =
    opportunity.company ||
    opportunity.companyName ||
    opportunity.creator?.fullName ||
    opportunity.creator?.name ||
    "IMCircle";

  const location =
    opportunity.location?.city ||
    opportunity.location ||
    opportunity.city ||
    "Remote / India";

  const salary =
    opportunity.salary ||
    opportunity.salaryRange ||
    opportunity.stipend ||
    "Not disclosed";

  const jobType =
    opportunity.jobType ||
    opportunity.type ||
    opportunity.workType ||
    "Opportunity";

  const impressions =
    opportunity.impressionsCount ||
    opportunity.viewsCount ||
    opportunity.impressions ||
    0;

  return (
    <>
      <article className="imc-enter px-4 py-4" style={{ background: "var(--imc-surface)", borderBottom: "1px solid var(--imc-border)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]"
              style={{ background: "var(--imc-surface-2)", color: SUCCESS }}
            >
              <BriefcaseBusiness size={20} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide"
                  style={{ background: "#ECFDF3", color: SUCCESS }}
                >
                  Job &middot; Open
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--imc-text-faint)]">
                  {jobType}
                </span>
              </div>

              <h2 className="mt-1.5 line-clamp-2 text-[15px] font-black leading-5 text-[var(--imc-text)]">
                {title}
              </h2>

              <div className="mt-1 flex items-center gap-1 text-[12px] font-bold text-[var(--imc-text-muted)]">
                <Building2 size={13} />
                <span className="truncate">{company}</span>
              </div>
            </div>
          </div>

          <button
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full active:scale-95"
            style={{ border: "1px solid var(--imc-border)", color: "var(--imc-text)" }}
          >
            <ArrowUpRight size={16} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <InfoPill icon={MapPin} text={location} />
          <InfoPill icon={IndianRupee} text={salary} />
          <InfoPill icon={Clock3} text="Quick apply" />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setShowViews(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-[var(--imc-text-faint)]"
          >
            <Eye size={14} />
            {formatCount(impressions)} impressions
          </button>

          <button className="rounded-full px-4 py-2 text-[12px] font-black active:scale-95" style={{ background: "var(--imc-surface-strong)", color: "var(--imc-on-surface-strong)" }}>
            Apply Now
          </button>
        </div>
      </article>

      <ViewInfoSheet
        open={showViews}
        onClose={() => setShowViews(false)}
        title="Opportunity Impressions"
      />
    </>
  );
}

function InfoPill({ icon: Icon, text }) {
  return (
    <div
      className="flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-[var(--imc-text-muted)]"
      style={{ border: "1px solid var(--imc-border)" }}
    >
      <Icon size={13} className="shrink-0 text-[var(--imc-text-faint)]" />
      <span className="truncate">{text}</span>
    </div>
  );
}

export default HiringCard;
