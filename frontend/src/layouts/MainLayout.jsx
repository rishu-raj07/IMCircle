import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "../components/navigation/BottomNav";

// Kept in sync with BottomNav's own HIDDEN_ON_PATHS — when the nav bar
// isn't rendering, the pb-24 reserved for it just leaves a blank gap at the
// bottom of the page instead.
const HIDDEN_ON_PATHS = ["/profile/activity"];

function MainLayout() {
  const location = useLocation();
  const hideNav = HIDDEN_ON_PATHS.some((path) => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className={`mx-auto min-h-screen max-w-[430px] bg-[var(--imc-surface)] ${hideNav ? "" : "pb-24"}`}>
        <Outlet />
        <BottomNav />
      </div>
    </div>
  );
}

export default MainLayout;