import { ShoppingCart, PackagePlus, AlertTriangle, Boxes, UserPlus } from "lucide-react";
import Card, { CardHeader } from "../common/Card";
import { recentActivity } from "../../data/mockData";

const ICONS = {
  sale: { icon: ShoppingCart, tone: "text-signal-dim dark:text-signal" },
  purchase: { icon: PackagePlus, tone: "text-stock-info" },
  stock: { icon: AlertTriangle, tone: "text-stock-low" },
  product: { icon: Boxes, tone: "text-stock-in" },
  customer: { icon: UserPlus, tone: "text-graphite-500 dark:text-paper-300" },
  "stock-in": { icon: PackagePlus, tone: "text-stock-info" },
  "stock-out": { icon: ShoppingCart, tone: "text-signal-dim dark:text-signal" },
};

export default function RecentActivityFeed({ activities }) {
  const displayItems = activities && activities.length > 0
    ? activities.map((a) => ({
        id: a.id,
        type: a.type,
        text: `${a.item} (${a.change}) — ${a.notes || a.type}`,
        time: a.time,
      }))
    : recentActivity;

  return (
    <Card>
      <CardHeader title="Recent Activity" subtitle="Live ledger events across the warehouse" />
      <ul className="space-y-4">
        {displayItems.map((a) => {
          const conf = ICONS[a.type] || ICONS.stock;
          const Icon = conf.icon;
          return (
            <li key={a.id} className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-tag bg-graphite-800/5 p-1.5 dark:bg-paper-100/5 ${conf.tone}`}>
                <Icon size={14} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-graphite-800 dark:text-paper-100">{a.text}</p>
                <p className="manifest-label mt-0.5">{a.time}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
