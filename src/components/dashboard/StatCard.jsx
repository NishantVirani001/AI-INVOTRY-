import clsx from "clsx";
import Card from "../common/Card";

export default function StatCard({ icon: Icon, label, value, delta, tone = "neutral" }) {
  const toneMap = {
    neutral: "text-graphite-900 dark:text-paper-100",
    in: "text-stock-in",
    low: "text-stock-low",
    out: "text-stock-out",
    signal: "text-signal-dim dark:text-signal",
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <span className="manifest-label">{label}</span>
        {Icon && (
          <div className="rounded-tag bg-graphite-800/5 p-1.5 dark:bg-paper-100/5">
            <Icon size={15} className={toneMap[tone]} />
          </div>
        )}
      </div>
      <p className={clsx("mt-2 font-mono text-2xl font-semibold", toneMap[tone])}>
        {value}
      </p>
      {delta && (
        <p
          className={clsx(
            "mt-1 text-xs font-medium",
            delta.startsWith("-") ? "text-stock-out" : "text-stock-in"
          )}
        >
          {delta} vs last week
        </p>
      )}
    </Card>
  );
}
