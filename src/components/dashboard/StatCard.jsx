import clsx from "clsx";
import Card from "../common/Card";

export default function StatCard({ icon: Icon, label, value, delta, tone = "neutral", loading = false }) {
  const toneMap = {
    neutral: "text-graphite-900 dark:text-paper-100",
    in: "text-stock-in",
    low: "text-stock-low",
    out: "text-stock-out",
    signal: "text-signal-dim dark:text-signal",
  };

  const isValueLoading = loading || value === "..." || value === undefined || value === null;

  return (
    <Card className="relative overflow-hidden flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <span className="manifest-label text-xs text-graphite-500 dark:text-paper-300/70">{label}</span>
          {Icon && (
            <div className="rounded-tag bg-graphite-800/5 p-1.5 dark:bg-paper-100/5">
              <Icon size={15} className={toneMap[tone]} />
            </div>
          )}
        </div>
        
        {isValueLoading ? (
          <div className="mt-2.5 h-7 w-20 animate-pulse rounded bg-graphite-200/60 dark:bg-paper-100/10" />
        ) : (
          <p className={clsx("mt-2 font-mono text-2xl font-semibold", toneMap[tone])}>
            {value}
          </p>
        )}
      </div>

      {delta && (
        <p
          className={clsx(
            "mt-1 text-[11px] font-medium",
            delta.startsWith("-") ? "text-stock-out" : "text-stock-in"
          )}
        >
          {delta.includes("registered") || delta.includes("orders") || delta.includes("items")
            ? delta
            : `${delta} vs last week`}
        </p>
      )}
    </Card>
  );
}
