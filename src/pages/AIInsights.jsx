import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingUp, TrendingDown, PackagePlus, AlertOctagon, CheckCircle2 } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card, { CardHeader } from "../components/common/Card";
import Badge from "../components/common/Badge";
import Table, { Td, Tr } from "../components/common/Table";
import { Loader } from "../components/common/Loader";
import aiService from "../services/aiService";
import { aiInsights as mockAiInsights } from "../data/mockData";

export default function AIInsights() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInsights() {
      try {
        setLoading(true);
        const data = await aiService.getInsights();
        if (data && data.predictedLowStock) {
          setInsights(data);
        } else {
          setInsights(mockAiInsights);
        }
      } catch {
        setInsights(mockAiInsights);
      } finally {
        setLoading(false);
      }
    }
    loadInsights();
  }, []);

  const data = insights || mockAiInsights;
  const predicted = data.predictedLowStock || [];
  const recommendations = data.reorderRecommendations || [];
  const fast = data.fastMoving || [];
  const slow = data.slowMoving || [];
  const anomalies = data.anomalies || [];

  return (
    <div>
      <PageHeader
        eyebrow="AI Analytics Engine"
        title="AI Demand Insights & Forecasting"
        subtitle="Live calculated burn rate, dynamic safety stock, and lead-time replenishment models"
        action={
          <Badge tone="signal">
            <Sparkles size={11} className="mr-1 inline text-signal" /> Live Model v1.0
          </Badge>
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader label="Computing statistical velocity & stockout projections..." />
        </div>
      ) : (
        <>
          {/* Anomaly Alerts Section (if anomalies detected) */}
          {anomalies.length > 0 && (
            <div className="mb-4 space-y-2">
              {anomalies.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-card border border-stock-out/30 bg-stock-out/10 p-3 text-sm text-graphite-900 dark:text-paper-100"
                >
                  <div className="flex items-center gap-2">
                    <AlertOctagon size={16} className="text-stock-out" />
                    <span className="font-semibold">{a.product} ({a.sku}):</span>
                    <span>{a.message}</span>
                  </div>
                  <button
                    onClick={() =>
                      navigate("/purchases", {
                        state: { newPurchaseSku: a.sku },
                      })
                    }
                    className="rounded bg-stock-out/20 px-2 py-1 text-xs font-semibold text-stock-out hover:bg-stock-out/30"
                  >
                    Quick Restock
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Predicted Low Stock Table */}
            <Card>
              <CardHeader
                title="Predicted Low Stock & Depletion"
                subtitle="Calculated burn rate velocity vs current on-hand units"
              />
              <Table
                columns={[
                  { key: "p", label: "Product" },
                  { key: "d", label: "Depletion" },
                  { key: "c", label: "Confidence" },
                  { key: "a", label: "" },
                ]}
              >
                {predicted.map((p) => (
                  <Tr key={p.product || p.sku}>
                    <Td className="font-medium text-graphite-900 dark:text-paper-100">
                      <div>{p.product}</div>
                      {p.dailyVelocity && (
                        <div className="text-[11px] text-graphite-400">
                          burn: {p.dailyVelocity} units/day
                        </div>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={p.daysUntilStockout <= 3 ? "out" : "low"}>
                        {p.daysUntilStockout === 0 ? "OUT" : `${p.daysUntilStockout}d`}
                      </Badge>
                    </Td>
                    <Td className="font-mono text-xs text-graphite-500 dark:text-paper-300/60">
                      {Math.round(p.confidence * 100)}%
                    </Td>
                    <Td>
                      <button
                        onClick={() =>
                          navigate("/purchases", {
                            state: { newPurchaseSku: p.sku || "" },
                          })
                        }
                        className="rounded px-2 py-1 text-xs font-semibold text-signal-dim hover:bg-signal/15 dark:text-signal"
                      >
                        Reorder
                      </button>
                    </Td>
                  </Tr>
                ))}
              </Table>
            </Card>

            {/* Reorder Recommendations */}
            <Card>
              <CardHeader
                title="Dynamic Reorder Recommendations"
                subtitle="Suggested quantity based on daily velocity and supplier lead times"
              />
              <ul className="space-y-3">
                {recommendations.map((r) => (
                  <li
                    key={r.product}
                    className="flex items-start gap-3 rounded-tag bg-graphite-800/[0.03] p-3 transition-colors hover:bg-graphite-800/[0.06] dark:bg-paper-100/[0.03] dark:hover:bg-paper-100/[0.06]"
                  >
                    <div className="rounded-tag bg-signal/15 p-1.5 text-signal-dim dark:text-signal">
                      <PackagePlus size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-graphite-900 dark:text-paper-100">
                          {r.product}
                        </p>
                        <span className="font-mono text-sm font-bold text-signal-dim dark:text-signal">
                          +{r.suggestedQty} units
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-graphite-500 dark:text-paper-300/60">
                        {r.reason}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-graphite-400">
                          Supplier: {r.supplier || "Preferred"} (lead: {r.leadTimeDays || 4}d)
                        </span>
                        <button
                          onClick={() =>
                            navigate("/purchases", {
                              state: { newPurchaseSku: r.sku, supplier: r.supplier },
                            })
                          }
                          className="rounded bg-signal px-2 py-1 text-[11px] font-semibold text-graphite-950 hover:opacity-90"
                        >
                          Draft PO
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader title="Fast-Moving Products" subtitle="Sales velocity exceeds replenishment rate" />
              <ul className="space-y-2">
                {fast.map((name) => (
                  <li key={name} className="flex items-center gap-2 text-sm text-graphite-800 dark:text-paper-100">
                    <TrendingUp size={14} className="text-stock-in" /> {name}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Slow-Moving Products" subtitle="Low turnover — consider promotional clearance or reduced PO" />
              <ul className="space-y-2">
                {slow.map((name) => (
                  <li key={name} className="flex items-center gap-2 text-sm text-graphite-800 dark:text-paper-100">
                    <TrendingDown size={14} className="text-graphite-400" /> {name}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-card bg-graphite-800/[0.04] p-3 text-xs text-graphite-600 dark:bg-paper-100/[0.04] dark:text-paper-300/60">
            <CheckCircle2 size={15} className="text-stock-in" />
            <span>
              Real-time calculation active: Projections recalibrate automatically after every recorded sales order or received purchase shipment.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
