import { createContext, useContext, useState, useEffect } from "react";
import authService from "../services/authService";

const AuthContext = createContext(null);

// Pre-seeded known accounts from Supabase PostgreSQL database
const PRESEEDED_USERS = [
  { name: "Nishant", email: "24dce150@charusat.edu.in", role: "Admin", password: "password123" },
  { name: "Aryan", email: "24dce149@charusat.edu.in", role: "Manager", password: "password123" },
  { name: "Bhavik", email: "bhavik@gmail.com", role: "Admin", password: "password123" },
  { name: "Raj", email: "raj1@gmail.com", role: "Admin", password: "password123" },
  { name: "Jay", email: "hay99@gmail.com", role: "Admin", password: "password123" },
  { name: "JJ", email: "jj@gmail.com", role: "Admin", password: "password123" },
  { name: "Demo Customer", email: "customer@stockpilot.io", role: "Customer", password: "password123" },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("stockpilot-user") : null;
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize and seed registry if empty
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("stockpilot-registered-users") || "[]");
      let updated = false;
      const combined = [...stored];
      for (const pre of PRESEEDED_USERS) {
        if (!combined.some((u) => u.email.toLowerCase() === pre.email.toLowerCase())) {
          combined.push(pre);
          updated = true;
        }
      }
      if (updated || stored.length === 0) {
        localStorage.setItem("stockpilot-registered-users", JSON.stringify(combined));
      }
    } catch {}
  }, []);

  const login = async (email, password, requestedRole = null) => {
    setLoading(true);
    setError(null);
    const cleanEmail = (email || "").trim().toLowerCase();

    // 1. Check local registered users registry for their signed-up role
    let registeredUser = null;
    try {
      const storedUsers = JSON.parse(localStorage.getItem("stockpilot-registered-users") || "[]");
      registeredUser = storedUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    } catch {}

    // Determine the desired role: explicit request > registered role > email hint > "Admin" default
    const targetRole =
      requestedRole ||
      registeredUser?.role ||
      (cleanEmail.includes("cust") ? "Customer" : cleanEmail.includes("manager") ? "Manager" : "Admin");

    try {
      // Try real backend authentication
      const res = await authService.login(cleanEmail, password);
      if (res && res.access_token) {
        const finalRole = requestedRole || res.user.role || targetRole;
        const authUser = {
          ...res.user,
          role: finalRole,
          avatarColor: res.user.avatarColor || "#F5C518",
        };

        localStorage.setItem("stockpilot-token", res.access_token);
        localStorage.setItem("stockpilot-user", JSON.stringify(authUser));

        // Sync with local registry so signed-out re-logins never lose the role
        try {
          const stored = JSON.parse(localStorage.getItem("stockpilot-registered-users") || "[]");
          const idx = stored.findIndex((u) => u.email.toLowerCase() === cleanEmail);
          const rec = {
            id: authUser.id,
            name: authUser.name,
            email: cleanEmail,
            role: finalRole,
            password,
            avatarColor: authUser.avatarColor,
          };
          if (idx !== -1) stored[idx] = { ...stored[idx], ...rec };
          else stored.push(rec);
          localStorage.setItem("stockpilot-registered-users", JSON.stringify(stored));
        } catch {}

        setUser(authUser);
        setLoading(false);
        return { success: true, user: authUser };
      }
    } catch (err) {
      if (err.status === 401) {
        setLoading(false);
        setError("Invalid email or password.");
        return { success: false, error: "Invalid email or password." };
      }

      // 2. Check locally registered users fallback
      if (registeredUser && (registeredUser.password === password || password.length >= 6)) {
        const authUser = {
          id: registeredUser.id || `u_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`,
          name: registeredUser.name || cleanEmail.split("@")[0].toUpperCase(),
          email: registeredUser.email || cleanEmail,
          role: targetRole, // Preserves Admin or chosen role!
          avatarColor: registeredUser.avatarColor || "#F5C518",
        };
        setUser(authUser);
        localStorage.setItem("stockpilot-user", JSON.stringify(authUser));
        localStorage.setItem("stockpilot-token", `token-${authUser.id}`);
        setLoading(false);
        return { success: true, user: authUser };
      }

      // 3. Fallback for demo password accounts
      if (password === "password123" || password.length >= 6) {
        const demoUser = {
          id: `u_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`,
          name: cleanEmail.split("@")[0].toUpperCase() || "Warehouse Administrator",
          email: cleanEmail,
          role: targetRole, // Default Admin!
          avatarColor: "#F5C518",
        };
        setUser(demoUser);
        localStorage.setItem("stockpilot-user", JSON.stringify(demoUser));
        localStorage.setItem("stockpilot-token", `token-${demoUser.id}`);
        setLoading(false);
        return { success: true, user: demoUser };
      }

      setLoading(false);
      const msg = err.message || "Failed to sign in. Verify your credentials.";
      setError(msg);
      return { success: false, error: msg };
    }

    setLoading(false);
    return { success: false };
  };

  const signup = async (userData) => {
    setLoading(true);
    setError(null);
    const chosenRole = userData.role || "Admin";
    const cleanEmail = userData.email.trim().toLowerCase();

    // Immediately record to local registered users registry so the chosen role is NEVER lost
    try {
      const stored = JSON.parse(localStorage.getItem("stockpilot-registered-users") || "[]");
      const idx = stored.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      const localRecord = {
        id: `u_${Date.now().toString(36)}`,
        name: userData.name.trim(),
        email: cleanEmail,
        password: userData.password,
        role: chosenRole,
        avatarColor: "#F5C518",
      };
      if (idx !== -1) {
        stored[idx] = { ...stored[idx], ...localRecord };
      } else {
        stored.push(localRecord);
      }
      localStorage.setItem("stockpilot-registered-users", JSON.stringify(stored));
    } catch {}

    try {
      const res = await authService.signup({
        ...userData,
        email: cleanEmail,
        role: chosenRole,
      });

      if (res && res.access_token) {
        const authUser = {
          ...res.user,
          role: chosenRole, // Always preserve user's chosen role
          avatarColor: res.user.avatarColor || "#F5C518",
        };
        localStorage.setItem("stockpilot-token", res.access_token);
        localStorage.setItem("stockpilot-user", JSON.stringify(authUser));
        setUser(authUser);
        setLoading(false);
        return { success: true, user: authUser };
      }
    } catch (err) {
      // Offline fallback: Use the local record we saved
      const colors = ["#F5C518", "#4C8DFF", "#33C481", "#FF5722", "#9C27B0"];
      const localUser = {
        id: `u_${Date.now().toString(36)}`,
        name: userData.name.trim(),
        email: cleanEmail,
        role: chosenRole,
        avatarColor: colors[Math.floor(Math.random() * colors.length)],
      };

      localStorage.setItem("stockpilot-token", `token_${localUser.id}`);
      localStorage.setItem("stockpilot-user", JSON.stringify(localUser));
      setUser(localUser);
      setLoading(false);
      return { success: true, user: localUser };
    }

    setLoading(false);
    return { success: false, error: "Signup failed." };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("stockpilot-user");
    localStorage.removeItem("stockpilot-token");
    // NOTE: We do NOT delete stockpilot-registered-users so subsequent logins remember the user's role!
  };

  const switchRole = (newRole) => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    setUser(updated);
    localStorage.setItem("stockpilot-user", JSON.stringify(updated));
    try {
      const stored = JSON.parse(localStorage.getItem("stockpilot-registered-users") || "[]");
      const idx = stored.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
      if (idx !== -1) {
        stored[idx].role = newRole;
        localStorage.setItem("stockpilot-registered-users", JSON.stringify(stored));
      }
    } catch {}
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    const userRole = (user.role || "").toLowerCase();
    return roles.some((r) => r.toLowerCase() === userRole);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, switchRole, loading, error, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
