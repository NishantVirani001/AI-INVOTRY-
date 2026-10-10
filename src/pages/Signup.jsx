import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Warehouse, UserPlus, Shield, UserCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/common/Input";
import Button from "../components/common/Button";
import { useToast } from "../components/common/Toast";

export default function Signup() {
  const { user, signup, loading, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Admin");
  const [formError, setFormError] = useState("");

  if (user) {
    return <Navigate to={location.state?.from || "/"} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Please enter your full name.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    const res = await signup({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    });

    if (res.success) {
      toast({
        type: "success",
        message: `Account created successfully! Welcome to StockPilot, ${res.user.name.split(" ")[0]}.`,
      });
      navigate("/", { replace: true });
    } else {
      setFormError(res.error || "Failed to create account.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-100 px-4 py-8 dark:bg-graphite-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-tag bg-signal text-graphite-950 shadow-sm">
            <Warehouse size={22} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-graphite-900 dark:text-paper-100">
            Create an Account
          </h1>
          <p className="mt-1 text-sm text-graphite-500 dark:text-paper-300/60">
            Join StockPilot to manage inventory & supply chain
          </p>
        </div>

        <form onSubmit={submit} className="panel space-y-4 p-6 shadow-sm">
          <Input
            label="Full Name"
            type="text"
            required
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Work Email"
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div>
            <label className="manifest-label mb-1.5 block">Account Role</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: "Admin", label: "Admin", desc: "Full access" },
                { value: "Manager", label: "Manager", desc: "Operations" },
                { value: "Staff", label: "Staff", desc: "Warehouse" },
                { value: "Customer", label: "Customer", desc: "Place orders" },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`rounded-tag border p-2 text-left transition-all ${
                    role === r.value
                      ? "border-signal bg-signal/10 text-graphite-900 dark:text-paper-100"
                      : "border-graphite-800/15 text-graphite-600 hover:border-graphite-400 dark:border-paper-100/15 dark:text-paper-400"
                  }`}
                >
                  <div className="text-xs font-semibold">{r.label}</div>
                  <div className="text-[10px] text-graphite-400 dark:text-paper-300/50">
                    {r.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Password"
            type="password"
            required
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Input
            label="Confirm Password"
            type="password"
            required
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {(formError || error) && (
            <p className="rounded-tag bg-stock-out/10 px-3 py-2 text-xs text-stock-out">
              {formError || error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            <UserPlus size={16} className="mr-1.5" />
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-graphite-500 dark:text-paper-300/60">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-signal hover:underline dark:text-signal"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
