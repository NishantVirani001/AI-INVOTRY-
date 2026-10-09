import { Loader2 } from "lucide-react";
import clsx from "clsx";

const VARIANTS = {
  primary:
    "bg-graphite-900 text-paper-100 hover:bg-graphite-800 dark:bg-signal dark:text-graphite-950 dark:hover:bg-signal-dim",
  secondary:
    "bg-graphite-800/10 text-graphite-800 hover:bg-graphite-800/20 dark:bg-paper-100/10 dark:text-paper-100 dark:hover:bg-paper-100/20",
  signal: "bg-signal text-graphite-950 hover:bg-signal-dim",
  outline:
    "border border-graphite-800/20 text-graphite-800 hover:bg-graphite-800/5 dark:border-paper-100/20 dark:text-paper-100 dark:hover:bg-paper-100/5",
  ghost:
    "text-graphite-700 hover:bg-graphite-800/5 dark:text-paper-200 dark:hover:bg-paper-100/10",
  danger: "bg-stock-out text-white hover:opacity-90",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  className,
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-tag font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        Icon && <Icon size={16} />
      )}
      {children}
    </button>
  );
}
