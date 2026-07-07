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
    <div className="w-full overflow-hidden rounded-[26px] border border-[var(--imc-border)] bg-[var(--imc-surface)]">
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          {collegeLogo ? (
            <img
              src={collegeLogo}
              alt={collegeName}
              className="h-14 w-14 shrink-0 rounded-[18px] border border-[var(--imc-border)] bg-[var(--imc-surface)] object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[rgba(5,150,105,0.12)] text-[#059669]">
              <GraduationCap size={27} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-[16px] font-black leading-5 text-[var(--imc-text)]">
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
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(5,150,105,0.12)] text-[#059669] active:scale-[0.97]"
                  >
                    <Pencil size={15} />
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FEF3F2] text-[#D92D20] active:scale-[0.97]"
                    aria-label="Delete education"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {(from || to) && (
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--imc-text-muted)]">
              <CalendarDays size={15} className="shrink-0 text-[#059669]" />
              <span className="truncate">
                {from || "Start"} — {to || "End"}
              </span>
            </div>
          )}

          {location && (
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--imc-text-muted)]">
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
          <p className="mt-3 line-clamp-2 text-[13px] font-semibold leading-5 text-[var(--imc-text-muted)]">
            {item.description}
          </p>
        )}

        {Array.isArray(item.skills) && item.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-[rgba(5,150,105,0.12)] px-3 py-1.5 text-[10px] font-black text-[#059669]"
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
