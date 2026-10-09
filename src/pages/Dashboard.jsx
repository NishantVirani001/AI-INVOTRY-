import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Boxes, Tags, Truck, ShoppingCart, DollarSign, AlertTriangle, XCircle, Activity, Bell } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import StatCard from "../components/dashboard/StatCard";
import SalesChart from "../components/dashboard/SalesChart";
import InventoryChart from "../components/dashboard/InventoryChart";
import CategoryChart from "../components/dashboard/CategoryChart";
import RecentActivityFeed from "../components/dashboard/RecentActivityFeed";
import AIInsightsPanel from "../components/dashboard/AIInsightsPanel";
import dashboardService from "../services/dashboardService";
import productService from "../services/productService";
import categoryService from "../services/categoryService";
import supplierService from "../services/supplierService";
import orderService from "../services/orderService";
import { dashboardStats } from "../data/mockData";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [liveStats, setLiveStats] = useState(null);
  const [counts, setCounts] = useState({
    products: 12,
    categories: 5,
    suppliers: 4,
    salesCount: 5,
  });

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [statsData, prodsData, catsData, supsData, salesData] = await Promise.allSettled([
          dashboardService.getStats(),
          productService.getAll(),
          categoryService.getAll(),
          supplierService.getAll(),
          orderService.getAll(),
        ]);

        if (statsData.status === "fulfilled" && statsData.value) {
          setLiveStats(statsData.value);
        }
        setCounts({
          products: prodsData.status === "fulfilled" ? prodsData.value.length : 12,
          categories: catsData.status === "fulfilled" ? catsData.value.length : 5,
          suppliers: supsData.status === "fulfilled" ? supsData.value.length : 4,
          salesCount: salesData.status === "fulfilled" ? salesData.value.length : 5,
        });
      } catch {
        // Fallback to initial mock if offline
      }
    }
    fetchDashboard();
  }, []);

  const totalRev = liveStats?.totalRevenue ?? dashboardStats.revenue;
  const invValue = liveStats?.totalInventoryValue ?? 15308.4;
  const lowCount = liveStats?.lowStockCount ?? dashboardStats.lowStock;
  const outCount = liveStats?.outOfStockCount ?? dashboardStats.outOfStock;

  const stats = [
    { icon: Boxes, label: "Total Products", value: formatNumber(counts.products), delta: "+4.2%" },
    { icon: Tags, label: "Categories", value: counts.categories, tone: "neutral" },
    { icon: Truck, label: "Suppliers", value: counts.suppliers, tone: "neutral" },
    { icon: ShoppingCart, label: "Total Sales", value: formatNumber(counts.salesCount), delta: "+8.1%" },
    { icon: DollarSign, label: "Revenue", value: formatCurrency(totalRev), delta: "+12.4%", tone: "signal" },
    { icon: AlertTriangle, label: "Low Stock", value: lowCount, tone: "low" },
    { icon: XCircle, label: "Out of Stock", value: outCount, tone: "out" },
    { icon: Activity, label: "Inventory Value", value: formatCurrency(invValue), delta: "+3.5%", tone: "in" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title={`Good to see you, ${user?.name?.split(" ")[0] || "Pilot"}`}
        subtitle="Live telemetry and stock health across your warehouse operations."
      />

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
                Customers have submitted orders. Review product quantities, check available warehouse stock, and accept orders to deduct inventory.
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SalesChart />
        <AIInsightsPanel />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InventoryChart />
        <CategoryChart />
        <RecentActivityFeed activities={liveStats?.recentActivities} />
      </div>
    </div>
  );
}
