import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./context/AdminAuthContext";

export default function AdminProtectedRoute({ children }) {
  const { admin, booting } = useAdminAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F7F8FC] text-[#12141C]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E4E7EC] border-t-[#4338CA]" />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return children;
}
