import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Warehouse } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/common/Input";
import Button from "../components/common/Button";
import { useToast } from "../components/common/Toast";
import { mockUsers } from "../data/mockData";

export default function Login() {
  const { user, login, loading, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (user) {
    return <Navigate to={location.state?.from || "/"} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    const res = await login(email, password);
    if (res.success) {
      toast({ type: "success", message: `Welcome back, ${res.user.name.split(" ")[0]}.` });
      navigate(location.state?.from || "/", { replace: true });
    }
  };

  const fillDemo = (u) => {
    setEmail(u.email);
    setPassword("password123");
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
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="rounded-tag bg-stock-out/10 px-3 py-2 text-xs text-stock-out">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" loading={loading}>
            {loading ? "Signing in" : "Sign in"}
          </Button>
        </form>

        <div className="mt-5">
          <p className="manifest-label mb-2 text-center">Demo accounts (password: password123)</p>
          <div className="grid grid-cols-3 gap-2">
            {mockUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => fillDemo(u)}
                type="button"
                className="rounded-tag border border-graphite-800/15 px-2 py-2 text-xs font-medium text-graphite-600 hover:border-signal hover:text-signal-dim dark:border-paper-100/15 dark:text-paper-300 dark:hover:text-signal"
              >
                {u.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
