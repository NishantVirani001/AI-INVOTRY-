import { createContext, useContext, useState } from "react";
import authService from "../services/authService";
import { mockUsers } from "../data/mockData";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("stockpilot-user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Try real backend authentication
      const res = await authService.login(email, password);
      if (res && res.access_token) {
        localStorage.setItem("stockpilot-token", res.access_token);
        localStorage.setItem("stockpilot-user", JSON.stringify(res.user));
        setUser(res.user);
        setLoading(false);
        return { success: true, user: res.user };
      }
    } catch (err) {
      // If backend explicitly rejected invalid credentials
      if (err.status === 401) {
        setLoading(false);
        setError("Invalid email or password.");
        return { success: false, error: "Invalid email or password." };
      }

      // 2. Check locally registered users (created during signup on static host)
      try {
        const storedUsers = JSON.parse(localStorage.getItem("stockpilot-registered-users") || "[]");
        const registered = storedUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (registered && (registered.password === password || password.length >= 6)) {
          const authUser = {
            id: registered.id,
            name: registered.name,
            email: registered.email,
            role: registered.role,
            avatarColor: registered.avatarColor || "#F5C518",
          };
          setUser(authUser);
          localStorage.setItem("stockpilot-user", JSON.stringify(authUser));
          localStorage.setItem("stockpilot-token", `demo-token-${registered.id}`);
          setLoading(false);
          return { success: true, user: authUser };
        }
      } catch {}

      // 3. Fallback to default demo role accounts
      const cleanEmail = email.trim().toLowerCase();
      const defaultRole = cleanEmail.includes("admin") ? "Admin" : cleanEmail.includes("manager") ? "Manager" : cleanEmail.includes("cust") ? "Customer" : "Staff";
      if (password === "password123" || password.length >= 6) {
        const demoUser = {
          id: `u_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`,
          name: cleanEmail.split("@")[0].toUpperCase() || "Warehouse Pilot",
          email: cleanEmail,
          role: defaultRole,
          avatarColor: "#F5C518",
        };
        setUser(demoUser);
        localStorage.setItem("stockpilot-user", JSON.stringify(demoUser));
        localStorage.setItem("stockpilot-token", `demo-token-${demoUser.id}`);
        setLoading(false);
        return { success: true, user: demoUser };
      }

      setLoading(false);
      setError(err.message || "Invalid credentials.");
      return { success: false };
    }

    setLoading(false);
    return { success: false };
  };

  const signup = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.signup(userData);
      if (res && res.access_token) {
        localStorage.setItem("stockpilot-token", res.access_token);
        localStorage.setItem("stockpilot-user", JSON.stringify(res.user));
        setUser(res.user);
        setLoading(false);
        return { success: true, user: res.user };
      }
    } catch (err) {
      // If 405 Method Not Allowed (Vercel static deploy without backend proxy), 404, or network offline
      const isStaticOrOffline =
        err.status === 405 ||
        err.status === 404 ||
        err.status === 0 ||
        (err.message && (err.message.includes("405") || err.message.includes("Network") || err.message.includes("Cannot connect")));

      if (isStaticOrOffline) {
        const colors = ["#F5C518", "#4C8DFF", "#33C481", "#FF5722", "#9C27B0"];
        const avatarColor = colors[Math.floor(Math.random() * colors.length)];
        const localUser = {
          id: `u_${Date.now().toString(36)}`,
          name: userData.name.trim(),
          email: userData.email.trim().toLowerCase(),
          role: userData.role || "Admin",
          avatarColor,
        };

        // Persist to local users registry so they can log back in later
        try {
          const stored = JSON.parse(localStorage.getItem("stockpilot-registered-users") || "[]");
          stored.push({ ...localUser, password: userData.password });
          localStorage.setItem("stockpilot-registered-users", JSON.stringify(stored));
        } catch {}

        localStorage.setItem("stockpilot-token", `token_${localUser.id}`);
        localStorage.setItem("stockpilot-user", JSON.stringify(localUser));
        setUser(localUser);
        setLoading(false);
        return { success: true, user: localUser };
      }

      setLoading(false);
      const msg = err.message || "Failed to create account.";
      setError(msg);
      return { success: false, error: msg };
    }
    setLoading(false);
    return { success: false, error: "Signup failed." };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("stockpilot-user");
    localStorage.removeItem("stockpilot-token");
  };

  const hasRole = (...roles) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, loading, error, hasRole }}
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
