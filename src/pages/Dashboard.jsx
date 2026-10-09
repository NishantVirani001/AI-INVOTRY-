import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Boxes, Tags, Truck, ShoppingCart, IndianRupee, AlertTriangle, XCircle, Activity, RefreshCw } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import StatCard from "../components/dashboard/StatCard";
import SalesChart from "../components/dashboard/SalesChart";
import InventoryChart from "../components/dashboard/InventoryChart";
import CategoryChart from "../components/dashboard/CategoryChart";
import RecentActivityFeed from "../components/dashboard/RecentActivityFeed";
import AIInsightsPanel from "../components/dashboard/AIInsightsPanel";
import dashboardService from "../services/dashboardService";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { useAuth } from "../context/AuthContext";
import CustomerPortal from "./CustomerPortal";

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === "Customer") {
    return <CustomerPortal />;
  }

  // Pre-load from persisted live state so previous real session data is instant with zero dummy flash
  const [liveStats, setLiveStats] = useState(() => {
    try {
      const cached = localStorage.getItem("stockpilot_live_stats");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!liveStats);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);

    try {
      // Force refresh queries live real database metrics immediately
      const data = await dashboardService.getStats(true);
      if (data) {
        setLiveStats(data);
        try {
          localStorage.setItem("stockpilot_live_stats", JSON.stringify(data));
        } catch {
          // Ignore quota errors
        }
      }
    } catch (err) {
      console.error("Dashboard live fetch error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(Boolean(liveStats));

    // 1. In-tab continuous sync whenever any stock or product is added or edited
    const handleUpdate = () => fetchDashboard(true);
    window.addEventListener("stockpilot-data-updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    // 2. Cross-tab continuous sync via BroadcastChannel
    let bc;
    try {
      if (window.BroadcastChannel) {
        bc = new BroadcastChannel("stockpilot-sync");
        bc.onmessage = () => fetchDashboard(true);
      }
    } catch {
      // Ignore broadcast channel errors in restricted environments
    }

    // 3. Storage event fallback for cross-browser synchronization
    const handleStorage = (e) => {
      if (e.key === "stockpilot-sync-ts") {
        fetchDashboard(true);
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Continuous live telemetry background polling every 7 seconds
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 7000);

    return () => {
      window.removeEventListener("stockpilot-data-updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      window.removeEventListener("storage", handleStorage);
      if (bc) bc.close();
      clearInterval(interval);
    };
  }, [fetchDashboard, liveStats]);

  // Purely dynamic real entity values - zero dummy fallbacks
  const isPending = loading && !liveStats;
  const totalProducts = liveStats ? liveStats.totalProducts : null;
  const totalCategories = liveStats ? liveStats.totalCategories : null;
  const totalSuppliers = liveStats ? liveStats.totalSuppliers : null;
  const totalSalesCount = liveStats ? liveStats.totalSalesCount : null;
  const totalRev = liveStats ? liveStats.totalRevenue : null;
  const lowCount = liveStats ? liveStats.lowStockCount : null;
  const outCount = liveStats ? liveStats.outOfStockCount : null;
  const invValue = liveStats ? liveStats.totalInventoryValue : null;

  const stats = [
    {
      icon: Boxes,
      label: "Total Products",
      value: typeof totalProducts === "number" ? formatNumber(totalProducts) : "...",
      delta: liveStats ? `${totalProducts} registered` : undefined,
      loading: isPending,
    },
    {
      icon: Tags,
      label: "Categories",
      value: typeof totalCategories === "number" ? totalCategories : "...",
      tone: "neutral",
      loading: isPending,
    },
    {
      icon: Truck,
      label: "Suppliers",
      value: typeof totalSuppliers === "number" ? totalSuppliers : "...",
      tone: "neutral",
      loading: isPending,
    },
    {
      icon: ShoppingCart,
      label: "Total Sales",
      value: typeof totalSalesCount === "number" ? formatNumber(totalSalesCount) : "...",
      delta: liveStats ? `${totalSalesCount} orders` : undefined,
      loading: isPending,
    },
    {
      icon: IndianRupee,
      label: "Revenue",
      value: typeof totalRev === "number" ? formatCurrency(totalRev) : "...",
      tone: "signal",
      loading: isPending,
    },
    {
      icon: AlertTriangle,
      label: "Low Stock",
      value: typeof lowCount === "number" ? lowCount : "...",
      tone: "low",
      loading: isPending,
    },
    {
      icon: XCircle,
      label: "Out of Stock",
      value: typeof outCount === "number" ? outCount : "...",
      tone: "out",
      loading: isPending,
    },
    {
      icon: Activity,
      label: "Inventory Value",
      value: typeof invValue === "number" ? formatCurrency(invValue) : "...",
      tone: "in",
      loading: isPending,
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <PageHeader
          eyebrow="Live Warehouse Telemetry"
          title={`Good to see you, ${user?.name?.split(" ")[0] || "Pilot"}`}
          subtitle="Real-time synchronized inventory metrics and warehouse stock telemetry."
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchDashboard(false)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-graphite-800/15 bg-white/50 px-3 py-1.5 text-xs font-semibold text-graphite-700 hover:bg-white shadow-sm dark:border-paper-100/15 dark:bg-graphite-800/60 dark:text-paper-200 dark:hover:bg-graphite-800 transition-all"
            title="Refresh live metrics immediately"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-signal" : ""} />
            <span>{isRefreshing ? "Syncing..." : "Sync Live Data"}</span>
          </button>
        </div>
      </div>

      {liveStats?.pendingOrders > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400">
              <ShoppingCart size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-graphite-900 dark:text-paper-100 flex items-center gap-2">
                <span>{liveStats.pendingOrders} Incoming Customer Order{liveStats.pendingOrders > 1 ? "s" : ""} Awaiting Acceptance</span>
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">Action Needed</span>
              </p>
              <p className="text-xs text-graphite-600 dark:text-paper-300/80 mt-0.5">
                Review quantities, check available warehouse stock, and accept orders to deduct inventory.
              </p>
            </div>
          </div>
          <Link
            to="/sales?tab=pending"
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-amber-700 transition-colors shrink-0"
          >
            Review & Accept Orders →
          </Link>
        </div>
      )}

      {/* Primary KPI stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Row 1: Sales vs Purchases & Real AI Insights */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SalesChart data={liveStats ? liveStats.salesTrend : null} />
        <AIInsightsPanel />
      </div>

      {/* Row 2: Dynamic Real Product Stock Chart, Category Distribution & Live Activity Ledger */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InventoryChart
          productStock={liveStats?.productStock}
          inventoryLevels={liveStats?.inventoryLevels}
          categoryDistribution={liveStats?.categoryDistribution}
          loading={isPending}
        />
        <CategoryChart data={liveStats ? liveStats.categoryDistribution : null} />
        <RecentActivityFeed activities={liveStats?.recentActivities} loading={isPending} />
      </div>
    </div>
  );
}
