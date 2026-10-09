import { ShoppingCart, PackagePlus, AlertTriangle, Boxes, UserPlus, Inbox } from "lucide-react";
import Card, { CardHeader } from "../common/Card";

const ICONS = {
  sale: { icon: ShoppingCart, tone: "text-signal-dim dark:text-signal" },
  purchase: { icon: PackagePlus, tone: "text-stock-info" },
  stock: { icon: AlertTriangle, tone: "text-stock-low" },
  product: { icon: Boxes, tone: "text-stock-in" },
  customer: { icon: UserPlus, tone: "text-graphite-500 dark:text-paper-300" },
  "stock-in": { icon: PackagePlus, tone: "text-stock-info" },
  "stock-out": { icon: ShoppingCart, tone: "text-signal-dim dark:text-signal" },
  adjustment: { icon: AlertTriangle, tone: "text-stock-low" },
};

export default function RecentActivityFeed({ activities, loading = false }) {
  const items = Array.isArray(activities)
    ? activities.map((a) => ({
        id: a.id,
        type: a.type,
        text: `${a.item} (${a.change}) — ${a.notes || a.type}`,
        time: a.time,
      }))
    : [];

  return (
    <Card>
      <CardHeader title="Recent Activity" subtitle="Live ledger events across the warehouse" />
      
      {loading && items.length === 0 ? (
        <div className="space-y-4 pt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-md bg-graphite-200/50 animate-pulse dark:bg-paper-100/5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-3/4 rounded bg-graphite-200/50 animate-pulse dark:bg-paper-100/5" />
                <div className="h-2.5 w-1/3 rounded bg-graphite-200/40 animate-pulse dark:bg-paper-100/5" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="rounded-full bg-graphite-800/5 p-3 text-graphite-400 dark:bg-paper-100/5">
            <Inbox size={20} />
          </div>
          <p className="mt-2 text-xs font-semibold text-graphite-900 dark:text-paper-100">
            No stock movements yet
          </p>
          <p className="mt-0.5 text-[11px] text-graphite-500 dark:text-paper-300/70 max-w-[200px]">
            Stock adjustments, sales, and purchase orders will log live ledger events here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
          {items.map((a) => {
            const conf = ICONS[a.type] || ICONS.stock;
            const Icon = conf.icon;
            return (
              <li key={a.id} className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-tag bg-graphite-800/5 p-1.5 dark:bg-paper-100/5 ${conf.tone} shrink-0`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-graphite-800 dark:text-paper-100 truncate">
                    {a.text}
                  </p>
                  <p className="manifest-label mt-0.5 text-[10px] text-graphite-400 font-mono">
                    {a.time}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
