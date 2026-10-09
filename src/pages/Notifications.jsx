import { useState, useEffect } from "react";
import { AlertTriangle, XCircle, Clock, Check, ShoppingCart, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { EmptyState, Loader } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";
import notificationService from "../services/notificationService";
import orderService from "../services/orderService";
import { mockNotifications } from "../data/mockData";

const META = {
  order_pending: { icon: ShoppingCart, tone: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  low: { icon: AlertTriangle, tone: "text-stock-low", bg: "bg-stock-low/10", border: "border-stock-low/20" },
  out: { icon: XCircle, tone: "text-stock-out", bg: "bg-stock-out/10", border: "border-stock-out/20" },
  expiry: { icon: Clock, tone: "text-stock-info", bg: "bg-stock-info/10", border: "border-stock-info/20" },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "order_pending", label: "Incoming Orders" },
  { key: "low", label: "Low Stock" },
  { key: "out", label: "Out of Stock" },
  { key: "expiry", label: "Expiring" },
];

export default function Notifications() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [processingId, setProcessingId] = useState(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationService.getAll();
      if (Array.isArray(res) && res.length > 0) {
        setItems(res);
      } else {
        setItems(mockNotifications);
      }
    } catch {
      setItems(mockNotifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const filtered = tab === "all" ? items : items.filter((n) => n.type === tab);

  const dismiss = async (id) => {
    try {
      await notificationService.dismiss(id);
    } catch {
      // ignore
    }
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAcceptOrder = async (n) => {
    setProcessingId(n.id);
    try {
      await orderService.accept(n.orderId || n.invoice);
      toast({
        type: "success",
        message: `Order ${n.invoice || ""} accepted! Warehouse inventory updated.`,
      });
      // Remove or mark as processed
      setItems((prev) => prev.filter((item) => item.id !== n.id));
    } catch (err) {
      toast({
        type: "error",
        message: err.message || "Failed to accept order. Check stock levels.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const clearAll = async () => {
    try {
      await notificationService.clearAll();
    } catch {
      // ignore
    }
    setItems([]);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Alerts & Incoming Orders"
        title="Notifications"
        subtitle="Incoming customer orders awaiting acceptance, low stock, and stockout warnings"
        action={items.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        )}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = t.key === "all" ? items.length : items.filter((n) => n.type === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-tag px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-graphite-900 text-paper-100 dark:bg-signal dark:text-graphite-950"
                  : "bg-graphite-800/5 text-graphite-600 dark:bg-paper-100/5 dark:text-paper-300"
              }`}
            >
              <span>{t.label}</span>
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] font-semibold ${
                    t.key === "order_pending"
                      ? "bg-amber-500 text-white"
                      : tab === t.key
                      ? "bg-paper-100 text-graphite-900 dark:bg-graphite-950 dark:text-paper-100"
                      : "bg-graphite-800/15 dark:bg-paper-100/15"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Card>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader label="Loading alerts..." />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="All caught up" subtitle="No notifications in this category right now." />
        ) : (
          <ul className="divide-y divide-graphite-800/[0.06] dark:divide-paper-100/[0.06]">
            {filtered.map((n) => {
              const meta = META[n.type] || META.low;
              const Icon = meta.icon;
              const isOrder = n.type === "order_pending";

              return (
                <li
                  key={n.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 px-2 transition-colors ${
                    isOrder ? "bg-amber-500/[0.03] dark:bg-amber-500/[0.05] rounded-lg" : ""
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`rounded-tag p-2 shrink-0 ${meta.bg} ${meta.tone}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-graphite-900 dark:text-paper-100">
                          {n.title}
                        </p>
                        {isOrder && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            ACTION REQUIRED
                          </span>
                        )}
                      </div>
                      <p className="manifest-label mt-0.5 text-xs text-graphite-500 dark:text-paper-300/70">
                        {n.time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isOrder && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={processingId === n.id}
                          onClick={() => handleAcceptOrder(n)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={13} />
                          {processingId === n.id ? "Accepting..." : "Accept Order"}
                        </Button>
                        <Link
                          to="/sales"
                          className="flex items-center gap-1 text-xs font-semibold text-signal hover:underline px-2"
                        >
                          View <ArrowRight size={12} />
                        </Link>
                      </>
                    )}

                    <button
                      onClick={() => dismiss(n.id)}
                      aria-label="Mark as read"
                      title="Dismiss notification"
                      className="rounded p-1.5 text-graphite-400 hover:bg-graphite-800/5 hover:text-graphite-700 dark:hover:bg-paper-100/10 dark:hover:text-paper-200"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
