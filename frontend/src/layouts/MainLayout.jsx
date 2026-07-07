import { Outlet } from "react-router-dom";
import BottomNav from "../components/navigation/BottomNav";

function MainLayout() {
  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-surface)] pb-24">
        <Outlet />
        <BottomNav />
      </div>
    </div>
  );
}

export default MainLayout;