import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  adminAuthApi,
  clearAdminAuth,
  getAdminAuth,
  setAdminAuth,
} from "../api/adminApi";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => getAdminAuth()?.admin || null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      const stored = getAdminAuth();
      if (!stored?.adminAccessToken) {
        if (mounted) setBooting(false);
        return;
      }

      try {
        const res = await adminAuthApi.me();
        if (mounted) {
          setAdmin(res.data.admin);
          setAdminAuth({ ...stored, admin: res.data.admin });
        }
      } catch {
        clearAdminAuth();
        if (mounted) setAdmin(null);
      } finally {
        if (mounted) setBooting(false);
      }
    };

    boot();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      admin,
      booting,
      login(auth) {
        setAdminAuth(auth);
        setAdmin(auth.admin);
      },
      async logout() {
        try {
          await adminAuthApi.logout();
        } catch {
          // local cleanup still matters if the server is unreachable
        }
        clearAdminAuth();
        setAdmin(null);
      },
    }),
    [admin, booting]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return value;
}
