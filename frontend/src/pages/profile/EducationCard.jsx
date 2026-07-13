import {
  CalendarDays,
  GraduationCap,
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

function getCollegeLogo(education) {
  return (
    education?.collegeLogo ||
    education?.logo ||
    education?.college?.logo?.url ||
    education?.college?.logoUrl ||
    ""
  );
}

function getCollegeName(education) {
  const value =
    education?.collegeName ||
    education?.college?.name ||
    education?.college ||
    "Institute";

  if (typeof value === "object") return value?.name || "Institute";
  return value;
}

function getCollegeLocation(education) {
  const city = education?.collegeCity || education?.college?.location?.city || "";
  const state =
    education?.collegeState || education?.college?.location?.state || "";

  return [city, state].filter(Boolean).join(", ");
}

export default function EducationCard({ education, onEdit, onDelete }) {
  const item = getFirstItem(education);

  if (!item) return null;

  const collegeLogo = getCollegeLogo(item);
  const collegeName = getCollegeName(item);
  const location = getCollegeLocation(item);

  const from = formatDate(item.startDate || item.startedIn);

  const to =
    item.current || item.present
      ? "Present"
      : formatDate(item.endDate || item.studiedTill);

  return (
    <div className="relative w-full overflow-hidden rounded-[22px] border border-[var(--imc-border)] bg-[var(--imc-surface)] shadow-[0_8px_24px_rgba(18,20,28,0.045)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--imc-indigo)]">
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          {collegeLogo ? (
            <img
              src={collegeLogo}
              alt={collegeName}
              className="h-12 w-12 shrink-0 rounded-[15px] border border-[var(--imc-border)] bg-[var(--imc-surface)] object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[var(--imc-indigo-soft)] text-[var(--imc-indigo-text)]">
              <GraduationCap size={23} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-[15px] font-black leading-5 text-[var(--imc-text)]">
                    {item.degree || "Education"}
                  </h3>

                  {item?.college?.isVerified && (
                    <ShieldCheck size={15} className="shrink-0 text-[#059669]" />
                  )}
                </div>

                {item.stream && (
                  <p className="mt-1 truncate text-[12.5px] font-black text-[var(--imc-text-muted)]">
                    {item.stream}
                  </p>
                )}

                <p className="mt-1 truncate text-[12.5px] font-bold text-[var(--imc-text-muted)]">
                  {collegeName}
                </p>
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
                    aria-label="Delete education"
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

          {location && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--imc-text-muted)]">
              <MapPin size={15} className="shrink-0 text-[var(--imc-text-faint)]" />
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>

        {item.grade && (
          <p className="mt-3 truncate text-[12.5px] font-black text-[var(--imc-text)]">
            Grade: <span className="text-[var(--imc-text-muted)]">{item.grade}</span>
          </p>
        )}

        {item.description && (
          <p className="mt-3 line-clamp-2 border-l-2 border-[rgba(67,56,202,0.24)] pl-3 text-[12px] font-semibold leading-5 text-[var(--imc-text-muted)]">
            {item.description}
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
