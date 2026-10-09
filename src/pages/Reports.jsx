import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download, RefreshCw, BarChart3 } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card, { CardHeader } from "../components/common/Card";
import Button from "../components/common/Button";
import SalesChart from "../components/dashboard/SalesChart";
import CategoryChart from "../components/dashboard/CategoryChart";
import productService from "../services/productService";
import supplierService from "../services/supplierService";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { useToast } from "../components/common/Toast";

export default function Reports() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pRes, sRes] = await Promise.allSettled([
        productService.getAll(),
        supplierService.getAll(),
      ]);
      if (pRes.status === "fulfilled" && Array.isArray(pRes.value)) {
        setProducts(pRes.value);
      }
      if (sRes.status === "fulfilled" && Array.isArray(sRes.value)) {
        setSuppliers(sRes.value);
      }
    } catch {
      // Keep state clean
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener("stockpilot-data-updated", handleUpdate);
    return () => {
      window.removeEventListener("stockpilot-data-updated", handleUpdate);
    };
  }, []);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem("stockpilot-token");
      const res = await fetch("/api/reports/export", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `stockpilot_inventory_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);
      toast({ type: "success", message: "Inventory CSV report downloaded successfully." });
    } catch (err) {
      console.warn("Backend export endpoint failed, falling back to client-side CSV:", err);
      // Fallback: Generate real CSV in-browser directly from current loaded catalog
      try {
        if (products.length > 0) {
          const headers = ["SKU", "Product Name", "Category", "Supplier", "Quantity On Hand", "Unit Price", "Cost", "Total Valuation", "Reorder Level", "Stock Status"];
          const rows = products.map((p) => [
            `"${p.sku || ""}"`,
            `"${(p.name || "").replace(/"/g, '""')}"`,
            `"${(p.category || "General").replace(/"/g, '""')}"`,
            `"${(p.supplier || "Direct").replace(/"/g, '""')}"`,
            p.quantity || 0,
            p.price || 0,
            p.cost || 0,
            ((p.quantity || 0) * (p.price || 0)).toFixed(2),
            p.reorderLevel || 10,
            (p.quantity || 0) <= 0 ? "OUT OF STOCK" : (p.quantity || 0) <= (p.reorderLevel || 10) ? "LOW STOCK" : "IN STOCK",
          ]);
          const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
          const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `stockpilot_inventory_report_${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(link);
          link.click();
          window.URL.revokeObjectURL(blobUrl);
          document.body.removeChild(link);
          toast({ type: "success", message: "Inventory CSV report downloaded successfully." });
          return;
        }
      } catch (fallbackErr) {
        console.error("Fallback export error:", fallbackErr);
      }
      toast({ type: "error", message: err.message || "Failed to download CSV export." });
    } finally {
      setExporting(false);
    }
  };

  // Real Top Products by Valuation / Revenue
  const topProducts = products
    .map((p) => ({
      name: p.name?.length > 14 ? `${p.name.slice(0, 12)}…` : (p.name || "Product"),
      fullName: p.name,
      revenue: Math.round((Number(p.price) || 0) * (Number(p.quantity) || 0)),
      quantity: Number(p.quantity) || 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // Real Supplier Performance Rating
  const supplierPerformance = suppliers
    .map((s) => ({
      name: s.name?.split(" ")[0] || s.name || "Vendor",
      fullName: s.name,
      rating: Number(s.rating) || 4.0,
      supplied: Number(s.productsSupplied) || 0,
    }))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Reports & Telemetry"
        subtitle="Live performance metrics across sales, stock valuation, and suppliers"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={RefreshCw} onClick={loadData}>
              Refresh
            </Button>
            <Button
              variant="outline"
              icon={Download}
              onClick={handleExportCSV}
              loading={exporting}
              id="export-csv-btn"
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SalesChart />
        <CategoryChart />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Top Products by Valuation"
            subtitle={
              loading
                ? "Calculating inventory valuations..."
                : topProducts.length > 0
                ? `${topProducts.length} highest-value stock items`
                : "No products in warehouse catalog"
            }
          />
          <div className="h-64 w-full">
            {loading ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-44 w-full animate-pulse rounded bg-graphite-200/50 dark:bg-paper-100/5" />
              </div>
            ) : topProducts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <BarChart3 size={24} className="text-graphite-400" />
                <p className="mt-2 text-xs font-semibold text-graphite-900 dark:text-paper-100">
                  No catalog valuation data
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} margin={{ left: -20, right: 10, top: 10 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="text-graphite-800/10 dark:text-paper-100/10"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="currentColor"
                    className="text-graphite-400"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    className="text-graphite-400"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v, name, item) => [
                      `${formatCurrency(v)} (${formatNumber(item.payload.quantity)} units in stock)`,
                      item.payload.fullName,
                    ]}
                    contentStyle={{
                      background: "#1C2027",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#F5F6F4",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#F5C518"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={38}
                    name="Valuation"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Supplier Rating"
            subtitle={
              loading
                ? "Loading supplier ratings..."
                : supplierPerformance.length > 0
                ? "Quality & delivery score out of 5.0"
                : "No registered suppliers"
            }
          />
          <div className="h-64 w-full">
            {loading ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-44 w-full animate-pulse rounded bg-graphite-200/50 dark:bg-paper-100/5" />
              </div>
            ) : supplierPerformance.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <BarChart3 size={24} className="text-graphite-400" />
                <p className="mt-2 text-xs font-semibold text-graphite-900 dark:text-paper-100">
                  No registered suppliers
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={supplierPerformance}
                  layout="vertical"
                  margin={{ left: 15, right: 30, top: 15, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="text-graphite-800/10 dark:text-paper-100/10"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    className="text-graphite-400"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    className="text-graphite-400"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(val, name, item) => [
                      `${val} / 5.0 (${item.payload.supplied} products supplied)`,
                      item.payload.fullName,
                    ]}
                    contentStyle={{
                      background: "#1C2027",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#F5F6F4",
                    }}
                  />
                  <Bar
                    dataKey="rating"
                    fill="#4C8DFF"
                    radius={[0, 6, 6, 0]}
                    barSize={24}
                    maxBarSize={26}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
