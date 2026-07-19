import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import { searchCompanies } from "../../api/companyApi";
import AddCompanyModal from "./AddCompanyModal";

function getLogo(company) {
  return company?.logo?.url || company?.logoUrl || "";
}

function getCompanyMeta(company) {
  return (
    company?.industry ||
    company?.type ||
    company?.website ||
    company?.domain ||
    "Company"
  );
}

export default function CompanySearch({ open, value, onClose, onSelect }) {
  const [query, setQuery] = useState(value || "");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery(value || "");
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    const q = query.trim();

    if (q.length < 2) {
      setCompanies([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const result = await searchCompanies(q);
        setCompanies(Array.isArray(result) ? result : []);
      } catch {
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  const cleanQuery = query.trim();

  const handleCompanySelect = (company) => {
    onSelect({
      company: company.source === "directory" ? null : company._id,
      organisation: company.name || "",
      companyLogo: getLogo(company),
      companyDomain: company.domain || company.website || "",
      companyEmail: company.email || "",
      companyIndustry: company.industry || "",
      companyType: company.type || "Company",
      companySource: company.source || "company",
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] px-5 pb-8">
        <div className="sticky top-0 z-20 -mx-5 flex h-[72px] items-center justify-between border-b border-[var(--imc-border)] bg-[var(--imc-bg)] px-5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full active:bg-[var(--imc-surface-2)]"
          >
            <ArrowLeft size={26} />
          </button>

          <h2 className="text-[23px] font-black text-[var(--imc-text)]">
            Select Company
          </h2>

          <div className="w-10" />
        </div>

        <div className="mt-5 flex h-[56px] items-center gap-3 rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4">
          <Search size={19} className="text-[var(--imc-indigo-text)]" />

          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company or business"
            className="w-full bg-transparent text-[16px] font-bold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
          />

          {query && (
            <button type="button" onClick={() => setQuery("")}>
              <X size={20} />
            </button>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {cleanQuery.length === 0 && (
            <div className="rounded-[20px] border border-dashed border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-6 text-center">
              <Building2 size={22} className="mx-auto mb-2 text-[var(--imc-text-faint)]" />
              <p className="text-[13px] font-bold text-[var(--imc-text-muted)]">
                Search for your company or business
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--imc-text-faint)]">
                Type at least 2 characters, or add a new one below.
              </p>
            </div>
          )}

          {cleanQuery.length === 1 && (
            <div className="rounded-[20px] bg-[var(--imc-surface)] px-4 py-5 text-center text-[13px] font-bold text-[var(--imc-text-muted)]">
              Keep typing... 1 more character
            </div>
          )}

          {loading && (
            <div className="rounded-[20px] bg-[var(--imc-surface)] px-4 py-5 text-[14px] font-bold text-[var(--imc-text-muted)]">
              Searching...
            </div>
          )}

          {!loading && cleanQuery.length >= 2 && companies.length === 0 && (
            <div className="rounded-[20px] bg-[var(--imc-surface)] px-4 py-5 text-center text-[13px] font-bold text-[var(--imc-text-muted)]">
              No matches for “{cleanQuery}” — add it as a new company below.
            </div>
          )}

          {!loading &&
            companies.map((company) => {
              const logo = getLogo(company);

              return (
                <button
                  key={`${company.source || "company"}-${
                    company._id || company.name
                  }`}
                  type="button"
                  onClick={() => handleCompanySelect(company)}
                  className="flex w-full items-center gap-3 rounded-[22px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 text-left shadow-sm active:scale-[0.99]"
                >
                  {logo ? (
                    <img
                      src={logo}
                      alt={company.name}
                      className="h-12 w-12 rounded-2xl border border-[var(--imc-border)] object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(67,56,202,0.12)] text-[var(--imc-indigo-text)]">
                      <Building2 size={23} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[15px] font-black text-[var(--imc-text)]">
                        {company.name}
                      </p>

                      {company.isVerified && (
                        <ShieldCheck size={14} className="text-[#059669]" />
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-[12px] font-bold text-[var(--imc-text-muted)]">
                      {getCompanyMeta(company)}
                    </p>
                  </div>

                  <CheckCircle2 size={20} className="text-[var(--imc-text-faint)]" />
                </button>
              );
            })}

          {!loading && (
            <button
              type="button"
              onClick={() => setShowAddCompany(true)}
              className="flex w-full items-center gap-3 rounded-[22px] border border-dashed border-[var(--imc-indigo-text)] bg-[rgba(67,56,202,0.12)] p-4 text-left active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--imc-surface)] text-[var(--imc-indigo-text)]">
                <Plus size={23} />
              </div>

              <div>
                <p className="text-[15px] font-black text-[var(--imc-indigo-text)]">
                  {cleanQuery.length >= 2 ? `Create "${cleanQuery}"` : "Add a new company"}
                </p>
              </div>
            </button>
          )}
        </div>
      </div>

      <AddCompanyModal
        open={showAddCompany}
        initialName={cleanQuery}
        onClose={() => setShowAddCompany(false)}
        onCreated={(company) => {
          handleCompanySelect(company);
          setShowAddCompany(false);
        }}
      />
    </div>
  );
}
