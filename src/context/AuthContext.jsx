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
      // If backend responded with 401/400 credentials error
      if (err.status === 401 || err.status === 400) {
        setLoading(false);
        setError(err.message || "Invalid email or password.");
        return { success: false };
      }

      // 2. Fallback to mock accounts if backend server is not running
      const found = mockUsers.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (found && password === "password123") {
        setUser(found);
        localStorage.setItem("stockpilot-user", JSON.stringify(found));
        setLoading(false);
        return { success: true, user: found };
      }

      setLoading(false);
      setError(err.message || "Invalid credentials.");
      return { success: false };
    }

    setLoading(false);
    return { success: false };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("stockpilot-user");
    localStorage.removeItem("stockpilot-token");
  };

  const hasRole = (...roles) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, error, hasRole }}
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
