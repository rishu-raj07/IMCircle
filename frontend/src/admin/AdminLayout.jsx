import {
  BarChart3,
  FileWarning,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  BadgeCheck,
  Users,
  GalleryVerticalEnd,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./context/AdminAuthContext";

const links = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/content", label: "Content", icon: GalleryVerticalEnd },
  { to: "/admin/reports", label: "Reports", icon: FileWarning },
  { to: "/admin/verification", label: "Verification", icon: BadgeCheck },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminNav({ mobile = false }) {
  return (
    <nav className={mobile ? "grid grid-cols-7 gap-1" : "space-y-1"}>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-2xl px-3 py-3 text-[13px] font-black transition ${
              isActive
                ? "bg-[#4338CA] text-white shadow-[0_12px_26px_rgba(67,56,202,0.25)]"
                : "text-[#667085] hover:bg-[#F2F4F7] hover:text-[#12141C]"
            } ${mobile ? "justify-center px-2" : ""}`
          }
        >
          <Icon size={18} />
          {!mobile && <span>{label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#12141C]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[#EAECF0] bg-white p-5 lg:block">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#12141C] text-white">
            <Shield size={20} />
          </div>
          <div>
            <p className="text-[17px] font-black">IMCircle Admin</p>
            <p className="text-[11px] font-bold text-[#667085]">Owner control panel</p>
          </div>
        </div>

        <div className="mt-8">
          <AdminNav />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-2xl bg-[#F2F4F7] px-4 py-3 text-[13px] font-black text-[#12141C] active:scale-95"
        >
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <main className="min-h-screen pb-24 lg:ml-72 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-[#EAECF0] bg-white/90 px-4 py-4 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#4338CA]">Admin</p>
              <h1 className="text-[22px] font-black">Control center</h1>
            </div>
            <div className="rounded-2xl bg-[#F2F4F7] px-4 py-2 text-right">
              <p className="text-[12px] font-black">{admin?.mobile}</p>
              <p className="text-[10px] font-bold uppercase text-[#667085]">{admin?.role}</p>
            </div>
          </div>
        </header>

        <div className="px-4 py-5 lg:px-8">
          <Outlet />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#EAECF0] bg-white px-2 py-2 lg:hidden">
        <AdminNav mobile />
      </div>
    </div>
  );
}
