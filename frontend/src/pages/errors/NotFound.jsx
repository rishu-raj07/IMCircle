import { SearchX } from "lucide-react";
import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--imc-bg)] px-5">
      <div className="w-full max-w-[430px] rounded-[36px] bg-[var(--imc-surface)] p-8 text-center shadow-xl">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--imc-surface-2)]">
          <SearchX size={48} className="text-[var(--imc-indigo-text)]" />
        </div>

        <h1 className="mt-6 text-[34px] font-black text-[var(--imc-text)]">
          404
        </h1>

        <h2 className="mt-2 text-[22px] font-black text-[var(--imc-text)]">
          Page Not Found
        </h2>

        <p className="mt-3 text-[14px] leading-6 text-[var(--imc-text-muted)]">
          Looks like this page doesn't exist or has been moved.
        </p>

        <button
          onClick={() => navigate("/home")}
          className="mt-8 h-14 w-full rounded-3xl bg-gradient-to-r from-[#4338CA] to-[#2E2A8F] text-[15px] font-black text-white shadow-xl shadow-[rgba(67,56,202,0.18)]"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

export default NotFound;