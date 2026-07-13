import {
  Building2,
  CalendarDays,
  MapPin,
  Pencil,
  ShieldCheck,
  Trash2,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function getFirstItem(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getCompanyLogo(experience) {
  return (
    experience?.companyLogo ||
    experience?.logo ||
    experience?.organisationLogo ||
    experience?.company?.logo?.url ||
    experience?.company?.logoUrl ||
    ""
  );
}

function getCompanyName(experience) {
  const value =
    experience?.organisation ||
    experience?.companyName ||
    experience?.company?.name ||
    experience?.company ||
    "Company";

  if (typeof value === "object") return value?.name || "Company";
  return value;
}

export default function ExperienceCard({ experience, onEdit, onDelete }) {
  const item = getFirstItem(experience);

  if (!item) return null;

  const companyLogo = getCompanyLogo(item);
  const companyName = getCompanyName(item);

  const from = formatDate(item.startDate || item.startedIn);

  const to =
    item.current || item.present
      ? "Present"
      : formatDate(item.endDate || item.workedTill);

  return (
    <div className="relative w-full overflow-hidden rounded-[22px] border border-[var(--imc-border)] bg-[var(--imc-surface)] shadow-[0_8px_24px_rgba(18,20,28,0.045)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--imc-indigo)]">
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className="h-12 w-12 shrink-0 rounded-[15px] border border-[var(--imc-border)] bg-[var(--imc-surface)] object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[var(--imc-indigo-soft)] text-[var(--imc-indigo-text)]">
              <Building2 size={23} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-[15px] font-black leading-5 text-[var(--imc-text)]">
                    {item.title || "Experience"}
                  </h3>

                  {item?.company?.isVerified && (
                    <ShieldCheck size={15} className="shrink-0 text-[#059669]" />
                  )}
                </div>

                <p className="mt-1 truncate text-[12.5px] font-bold text-[var(--imc-text-muted)]">
                  {companyName}
                </p>

                {(item.employmentType || item.locationType) && (
                  <p className="mt-1 truncate text-[11px] font-black text-[var(--imc-indigo-text)]">
                    {[item.employmentType, item.locationType]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)] active:scale-[0.97]"
                  >
                    <Pencil size={15} />
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface-2)] text-[#D92D20] active:scale-[0.97]"
                    aria-label="Delete experience"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 rounded-[14px] bg-[var(--imc-surface-2)] px-3 py-2.5">
          {(from || to) && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--imc-text-muted)]">
              <CalendarDays size={15} className="shrink-0 text-[var(--imc-indigo-text)]" />
              <span className="truncate">
                {from || "Start"} — {to || "End"}
              </span>
            </div>
          )}

          {item.location && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--imc-text-muted)]">
              <MapPin size={15} className="shrink-0 text-[var(--imc-text-faint)]" />
              <span className="truncate">{item.location}</span>
            </div>
          )}
        </div>

        {item.summary && (
          <p className="mt-3 line-clamp-2 border-l-2 border-[rgba(67,56,202,0.24)] pl-3 text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
            {item.summary}
          </p>
        )}

        {Array.isArray(item.skills) && item.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-[rgba(67,56,202,0.18)] bg-[var(--imc-surface)] px-2.5 py-1 text-[9.5px] font-bold text-[var(--imc-indigo-text)]"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
