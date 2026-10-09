import { Link } from "react-router-dom";
import { PackageX } from "lucide-react";
import Button from "../components/common/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-100 px-4 text-center dark:bg-graphite-950">
      <PackageX size={40} className="text-graphite-400 dark:text-paper-300/40" />
      <h1 className="font-display text-3xl font-bold text-graphite-900 dark:text-paper-100">Page not found</h1>
      <p className="max-w-sm text-sm text-graphite-500 dark:text-paper-300/60">
        This aisle doesn't exist in the warehouse. Let's get you back to the dashboard.
      </p>
      <Link to="/">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
