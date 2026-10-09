import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "../common/Card";
import aiService from "../../services/aiService";
import { aiInsights as mockAiInsights } from "../../data/mockData";

export default function AIInsightsPanel() {
  const [data, setData] = useState(mockAiInsights);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await aiService.getInsights();
        if (res && res.predictedLowStock) {
          setData(res);
        }
      } catch {
        // Fallback to mock
      }
    }
    fetchInsights();
  }, []);

  const predicted = data.predictedLowStock || [];
  const fast = data.fastMoving || [];
  const slow = data.slowMoving || [];

  return (
    <Card className="border border-signal/30 bg-gradient-to-br from-signal/[0.06] to-transparent">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-signal-dim dark:text-signal" />
          <h3 className="font-display text-lg font-semibold text-graphite-900 dark:text-paper-100">
            AI Insights
          </h3>
        </div>
        <Link
          to="/ai-insights"
          className="flex items-center gap-1 text-xs font-medium text-signal-dim hover:underline dark:text-signal"
        >
          Full report <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="manifest-label mb-2">Predicted stockouts</p>
          <ul className="space-y-1.5">
            {predicted.slice(0, 3).map((p) => (
              <li key={p.product || p.sku} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2 text-graphite-800 dark:text-paper-100">{p.product}</span>
                <span className="font-mono text-xs text-stock-low">
                  {p.daysUntilStockout === 0 ? "OUT" : `${p.daysUntilStockout}d`}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="manifest-label mb-2">Movement Velocity</p>
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-1.5 text-stock-in">
              <TrendingUp size={13} /> {fast.length} fast-moving
            </p>
            <p className="flex items-center gap-1.5 text-graphite-500 dark:text-paper-300/70">
              <TrendingDown size={13} /> {slow.length} slow-moving
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
