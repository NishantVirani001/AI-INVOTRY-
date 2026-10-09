import clsx from "clsx";

const TONES = {
  in: "bg-stock-in/10 text-stock-in border-stock-in/30",
  low: "bg-stock-low/10 text-stock-low border-stock-low/30",
  out: "bg-stock-out/10 text-stock-out border-stock-out/30",
  info: "bg-stock-info/10 text-stock-info border-stock-info/30",
  neutral:
    "bg-graphite-800/5 text-graphite-600 border-graphite-800/15 dark:bg-paper-100/5 dark:text-paper-300 dark:border-paper-100/15",
  signal: "bg-signal/15 text-signal-dim border-signal/40 dark:text-signal",
};

export default function Badge({ tone = "neutral", children, className }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-tag border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
