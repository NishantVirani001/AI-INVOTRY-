import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Warehouse } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/common/Input";
import Button from "../components/common/Button";
import { useToast } from "../components/common/Toast";

export default function Login() {
  const { user, login, loading, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Admin");

  if (user) {
    return <Navigate to={location.state?.from || "/"} replace />;
  }

  // Auto-detect registered user's role as they type their email
  const handleEmailChange = (val) => {
    setEmail(val);
    try {
      const stored = JSON.parse(localStorage.getItem("stockpilot-registered-users") || "[]");
      const found = stored.find((u) => u.email.toLowerCase() === val.trim().toLowerCase());
      if (found && found.role) {
        setRole(found.role);
      }
    } catch {}
  };

  const submit = async (e) => {
    e.preventDefault();
    const res = await login(email, password, role);
    if (res.success) {
      toast({ type: "success", message: `Welcome back, ${res.user.name.split(" ")[0]} (${res.user.role}).` });
      navigate(location.state?.from || "/", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-100 px-4 dark:bg-graphite-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-tag bg-signal text-graphite-950">
            <Warehouse size={22} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-graphite-900 dark:text-paper-100">
            StockPilot
          </h1>
          <p className="mt-1 text-sm text-graphite-500 dark:text-paper-300/60">
            Sign in to manage your inventory
          </p>
        </div>

        <form onSubmit={submit} className="panel space-y-4 p-6">
          <Input
            label="Email"
            type="email"
            required
            placeholder="you@stockpilot.io"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div>
            <label className="manifest-label mb-1.5 block">Access Role</label>
            <div className="grid grid-cols-4 gap-1.5">
              {["Admin", "Manager", "Staff", "Customer"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-tag border py-1.5 text-center text-xs font-semibold transition-all ${
                    role === r
                      ? "border-signal bg-signal/15 text-graphite-900 dark:text-paper-100"
                      : "border-graphite-800/15 text-graphite-500 hover:border-graphite-400 dark:border-paper-100/15 dark:text-paper-400"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-graphite-400 dark:text-paper-400/60">
              Assigned permissions apply to your portal session
            </p>
          </div>

          {error && (
            <p className="rounded-tag bg-stock-out/10 px-3 py-2 text-xs text-stock-out">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" loading={loading}>
            {loading ? "Signing in..." : `Sign in as ${role}`}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-graphite-500 dark:text-paper-300/60">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-signal hover:underline dark:text-signal"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
