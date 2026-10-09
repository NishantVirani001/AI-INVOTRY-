import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, TrendingDown, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "../common/Card";
import aiService from "../../services/aiService";

export default function AIInsightsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    try {
      const res = await aiService.getInsights();
      if (res && res.status === "active") {
        setData(res);
      }
    } catch {
      // If error, keep empty structure rather than fake mock
      setData({ predictedLowStock: [], fastMoving: [], slowMoving: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();

    const handleUpdate = () => fetchInsights();
    window.addEventListener("stockpilot-data-updated", handleUpdate);
    return () => {
      window.removeEventListener("stockpilot-data-updated", handleUpdate);
    };
  }, []);

  const predicted = data?.predictedLowStock || [];
  const fast = data?.fastMoving || [];
  const slow = data?.slowMoving || [];

  return (
    <Card className="border border-signal/30 bg-gradient-to-br from-signal/[0.06] to-transparent flex flex-col justify-between">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-signal-dim dark:text-signal" />
            <h3 className="font-display text-lg font-semibold text-graphite-900 dark:text-paper-100 flex items-center gap-2">
              <span>AI Insights</span>
              <span className="rounded-full bg-signal/20 px-1.5 py-0.2 text-[9px] font-bold text-signal-dim uppercase tracking-wider dark:text-signal">
                Live
              </span>
            </h3>
          </div>
          <Link
            to="/ai-insights"
            className="flex items-center gap-1 text-xs font-medium text-signal-dim hover:underline dark:text-signal"
          >
            Full report <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="h-3 w-28 animate-pulse rounded bg-signal/20" />
              <div className="h-4 w-full animate-pulse rounded bg-graphite-200/50 dark:bg-paper-100/5" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-graphite-200/50 dark:bg-paper-100/5" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-28 animate-pulse rounded bg-signal/20" />
              <div className="h-4 w-full animate-pulse rounded bg-graphite-200/50 dark:bg-paper-100/5" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-graphite-200/50 dark:bg-paper-100/5" />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="manifest-label mb-2 text-xs text-graphite-500 dark:text-paper-300/70">
                Predicted stockouts
              </p>
              {predicted.length === 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-stock-in mt-1 font-medium">
                  <CheckCircle2 size={14} />
                  <span>No imminent stockouts</span>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {predicted.slice(0, 3).map((p) => (
                    <li key={p.product || p.sku} className="flex items-center justify-between text-sm">
                      <span className="truncate pr-2 text-graphite-800 dark:text-paper-100 font-medium">
                        {p.product}
                      </span>
                      <span className="font-mono text-xs font-bold text-stock-low">
                        {p.daysUntilStockout === 0 ? "OUT" : `${p.daysUntilStockout}d left`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="manifest-label mb-2 text-xs text-graphite-500 dark:text-paper-300/70">
                Movement Velocity
              </p>
              <div className="space-y-1.5 text-sm">
                <p className="flex items-center gap-1.5 text-stock-in font-medium">
                  <TrendingUp size={13} /> {fast.length} fast-moving
                </p>
                <p className="flex items-center gap-1.5 text-graphite-500 dark:text-paper-300/70">
                  <TrendingDown size={13} /> {slow.length} slow-moving
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-signal/15 pt-2 text-[11px] text-graphite-500 dark:text-paper-300/60 flex items-center justify-between">
        <span>Autonomous stockout analysis</span>
        <span className="font-mono text-[10px]">Continuous Telemetry</span>
      </div>
    </Card>
  );
}
