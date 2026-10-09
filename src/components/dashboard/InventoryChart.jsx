import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Boxes, Layers, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import Card, { CardHeader } from "../common/Card";
import { formatNumber, formatCurrency } from "../../utils/formatters";

export default function InventoryChart({
  productStock = [],
  inventoryLevels = [],
  categoryDistribution = [],
  data = null,
  loading = false,
}) {
  // Support both legacy "data" prop and new direct props
  const rawProducts = useMemo(() => {
    if (Array.isArray(productStock) && productStock.length > 0) return productStock;
    if (Array.isArray(data) && data.length > 0 && data[0]?.quantity !== undefined) return data;
    return [];
  }, [productStock, data]);

  const rawLevels = useMemo(() => {
    if (Array.isArray(inventoryLevels) && inventoryLevels.length > 0) return inventoryLevels;
    if (Array.isArray(data) && data.length > 0 && data[0]?.level !== undefined) return data;
    return [];
  }, [inventoryLevels, data]);

  const rawCategories = useMemo(() => {
    if (Array.isArray(categoryDistribution) && categoryDistribution.length > 0) return categoryDistribution;
    return [];
  }, [categoryDistribution]);

  // View mode: "product" (real stock per entity), "category" (by category), "trend" (historical units)
  const [viewMode, setViewMode] = useState("product");

  // Format products for clean display (show up to 10 most critical/active)
  const productData = useMemo(() => {
    if (!rawProducts || rawProducts.length === 0) return [];
    return rawProducts.map((p) => {
      const displayName = p.name?.length > 13 ? `${p.name.slice(0, 11)}…` : (p.name || "Item");
      const qty = Number(p.quantity) || 0;
      const reorder = Number(p.reorderLevel) || 10;
      
      let status = "in";
      let color = "#33C481"; // Emerald
      if (qty <= 0) {
        status = "out";
        color = "#F0525B"; // Rose
      } else if (qty <= reorder) {
        status = "low";
        color = "#F5C518"; // Amber
      }

      return {
        id: p.id,
        name: displayName,
        fullName: p.name,
        sku: p.sku || "",
        category: p.category || "General",
        quantity: qty,
        reorderLevel: reorder,
        status,
        color,
        value: Number(p.value) || (qty * (Number(p.price) || 0)),
      };
    });
  }, [rawProducts]);

  // Aggregate units by category
  const categoryData = useMemo(() => {
    if (rawCategories && rawCategories.length > 0) {
      return rawCategories
        .map((c) => ({
          name: c.name?.length > 14 ? `${c.name.slice(0, 12)}…` : c.name,
          fullName: c.name,
          units: c.units !== undefined ? c.units : (c.count || 0),
          productsCount: c.count || 0,
          value: c.value || 0,
        }))
        .filter((c) => c.units > 0 || c.productsCount > 0);
    }
    return [];
  }, [rawCategories]);

  // Total active units count
  const totalUnits = useMemo(() => {
    return productData.reduce((sum, p) => sum + p.quantity, 0);
  }, [productData]);

  // Subtitle based on active view mode
  const subtitle = useMemo(() => {
    if (loading) return "Syncing live stock telemetry…";
    if (viewMode === "product") {
      return productData.length > 0
        ? `${productData.length} tracked product${productData.length !== 1 ? "s" : ""} • ${formatNumber(totalUnits)} units on hand`
        : "Live warehouse stock by item";
    }
    if (viewMode === "category") {
      return categoryData.length > 0
        ? `${categoryData.length} categor${categoryData.length !== 1 ? "ies" : "y"} with active inventory`
        : "Units aggregated by category";
    }
    return "Total units on hand over 6 months";
  }, [loading, viewMode, productData.length, totalUnits, categoryData.length]);

  return (
    <Card className="flex flex-col">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
        <div>
          <h3 className="font-display text-base font-semibold text-graphite-900 dark:text-paper-100 flex items-center gap-2">
            <span>Inventory Stock Levels</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-signal/15 px-2 py-0.5 text-[10px] font-semibold text-signal-dim dark:text-signal">
              <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse" />
              Live
            </span>
          </h3>
          <p className="manifest-label mt-0.5 text-xs text-graphite-500 dark:text-paper-300/70">
            {subtitle}
          </p>
        </div>

        {/* View Mode Pills */}
        <div className="flex items-center gap-1 rounded-lg border border-graphite-800/10 bg-graphite-800/5 p-0.5 dark:border-paper-100/10 dark:bg-paper-100/5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("product")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "product"
                ? "bg-white text-graphite-900 shadow-sm dark:bg-graphite-800 dark:text-paper-100"
                : "text-graphite-600 hover:text-graphite-900 dark:text-paper-300/70 dark:hover:text-paper-100"
            }`}
          >
            <Boxes size={12} />
            <span>By Product</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("category")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "category"
                ? "bg-white text-graphite-900 shadow-sm dark:bg-graphite-800 dark:text-paper-100"
                : "text-graphite-600 hover:text-graphite-900 dark:text-paper-300/70 dark:hover:text-paper-100"
            }`}
          >
            <Layers size={12} />
            <span>Category</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("trend")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "trend"
                ? "bg-white text-graphite-900 shadow-sm dark:bg-graphite-800 dark:text-paper-100"
                : "text-graphite-600 hover:text-graphite-900 dark:text-paper-300/70 dark:hover:text-paper-100"
            }`}
          >
            <TrendingUp size={12} />
            <span>Trend</span>
          </button>
        </div>
      </div>

      <div className="h-56 w-full flex-1">
        {loading && productData.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-40 w-full animate-pulse rounded-lg bg-graphite-200/50 dark:bg-paper-100/5" />
          </div>
        ) : viewMode === "product" ? (
          productData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <div className="rounded-full bg-signal/10 p-3 text-signal-dim dark:text-signal">
                <Boxes size={22} />
              </div>
              <p className="mt-2 text-xs font-semibold text-graphite-900 dark:text-paper-100">
                No products in warehouse
              </p>
              <p className="mt-1 text-[11px] text-graphite-500 dark:text-paper-300/70 max-w-[220px]">
                Add or import products to track real-time stock levels and stockout risks.
              </p>
              <Link
                to="/products"
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-signal-dim hover:underline dark:text-signal"
              >
                Go to Products Inventory →
              </Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData} margin={{ left: -20, right: 10, top: 8, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-graphite-800/10 dark:text-paper-100/10"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
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
                  cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg bg-[#1C2027] p-2.5 text-xs text-white shadow-xl border border-white/10 max-w-[220px]">
                          <p className="font-semibold text-sm text-paper-100">{item.fullName}</p>
                          {item.sku && <p className="text-[10px] text-graphite-400 font-mono mt-0.5">SKU: {item.sku}</p>}
                          <div className="my-1.5 border-t border-white/10" />
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-paper-300/80">Available Stock:</span>
                              <span className="font-mono font-bold" style={{ color: item.color }}>
                                {formatNumber(item.quantity)} units
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-paper-300/80">Reorder Level:</span>
                              <span className="font-mono text-graphite-300">{item.reorderLevel} units</span>
                            </div>
                            {item.value > 0 && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-paper-300/80">Stock Valuation:</span>
                                <span className="font-mono text-signal">{formatCurrency(item.value)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="quantity" radius={[4, 4, 0, 0]} name="Units on hand">
                  {productData.map((entry) => (
                    <Cell key={entry.id || entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        ) : viewMode === "category" ? (
          categoryData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <Layers size={22} className="text-graphite-400" />
              <p className="mt-2 text-xs font-semibold text-graphite-900 dark:text-paper-100">
                No categorical stock data
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ left: -20, right: 10, top: 8, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-graphite-800/10 dark:text-paper-100/10"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
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
                  cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                  formatter={(val, name, item) => [
                    `${formatNumber(val)} units (${item.payload.productsCount} products • ${formatCurrency(item.payload.value)})`,
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
                <Bar dataKey="units" fill="#4C8DFF" radius={[4, 4, 0, 0]} name="Units" />
              </BarChart>
            </ResponsiveContainer>
          )
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rawLevels} margin={{ left: -20, right: 10, top: 8, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-graphite-800/10 dark:text-paper-100/10"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
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
                contentStyle={{
                  background: "#1C2027",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#F5F6F4",
                }}
              />
              <Line
                type="monotone"
                dataKey="level"
                stroke="#33C481"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#33C481" }}
                name="Units"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend showing stock health colors when in product view */}
      {viewMode === "product" && productData.length > 0 && (
        <div className="mt-2.5 flex items-center justify-between border-t border-graphite-800/10 pt-2 text-[11px] text-graphite-500 dark:border-paper-100/10 dark:text-paper-300/70">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#33C481]" /> Healthy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#F5C518]" /> Low Stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#F0525B]" /> Out of Stock
            </span>
          </div>
          <Link to="/products" className="font-semibold text-signal-dim hover:underline dark:text-signal">
            Manage Stock →
          </Link>
        </div>
      )}
    </Card>
  );
}
