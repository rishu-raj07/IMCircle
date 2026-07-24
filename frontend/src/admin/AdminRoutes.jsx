import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import AdminProtectedRoute from "./AdminProtectedRoute";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import Analytics from "./pages/Analytics";
import Content from "./pages/Content";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import VerificationRequests from "./pages/VerificationRequests";
import Spotlight from "./pages/Spotlight";
import Badges from "./pages/Badges";
import News from "./pages/News";
import Articles from "./pages/Articles";

export default function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="content" element={<Content />} />
          <Route path="spotlight" element={<Spotlight />} />
          <Route path="badges" element={<Badges />} />
          <Route path="news" element={<News />} />
          <Route path="articles" element={<Articles />} />
          <Route path="reports" element={<Reports />} />
          <Route path="verification" element={<VerificationRequests />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
