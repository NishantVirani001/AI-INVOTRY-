import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Tags, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Card, { CardHeader } from "../common/Card";
import dashboardService from "../../services/dashboardService";
import { formatCurrency } from "../../utils/formatters";

const COLORS = [
  "#F5C518",
  "#4C8DFF",
  "#33C481",
  "#F2A93B",
  "#F0525B",
  "#9B51E0",
  "#00C49F",
  "#FF8042",
  "#E040FB",
  "#00E5FF",
  "#76FF03",
  "#FF6D00",
];

export default function CategoryChart({ data }) {
  const [items, setItems] = useState(data || []);

  useEffect(() => {
    if (data && data.length > 0) {
      setItems(data);
    } else {
      dashboardService.getStats()
        .then((res) => {
          if (res?.categoryDistribution && res.categoryDistribution.length > 0) {
            setItems(res.categoryDistribution);
          }
        })
        .catch(() => {});
    }
  }, [data]);

  // Categories with products or valuation
  const activeCategories = items.filter((c) => (c.count > 0 || c.value > 0));

  return (
    <Card>
      <CardHeader
        title="Product Categories"
        subtitle={
          activeCategories.length > 0
            ? `${activeCategories.length} active categor${activeCategories.length > 1 ? "ies" : "y"} in catalog`
            : "Share of catalog"
        }
      />
      <div className="h-56 w-full">
        {activeCategories.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center">
            <div className="rounded-full bg-signal/10 p-3 text-signal-dim dark:text-signal">
              <Tags size={22} />
            </div>
            <p className="mt-2 text-xs font-semibold text-graphite-900 dark:text-paper-100">
              {items.length > 0 ? `${items.length} Categories Configured` : "No Categories Configured"}
            </p>
            <p className="mt-1 text-[11px] text-graphite-500 dark:text-paper-300/70 max-w-[220px]">
              {items.length > 0
                ? "Assign products to categories in Inventory to view catalog share."
                : "Create categories to organize your warehouse items."}
            </p>
            <Link
              to="/products"
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-signal-dim hover:underline dark:text-signal"
            >
              Add Products to Category <ArrowRight size={11} />
            </Link>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={activeCategories}
                dataKey="count"
                nameKey="name"
                innerRadius={45}
                outerRadius={72}
                paddingAngle={activeCategories.length > 1 ? 3 : 0}
              >
                {activeCategories.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(val, name, item) => [
                  `${item.payload.count} product${item.payload.count !== 1 ? "s" : ""} • Valuation: ${formatCurrency(item.payload.value)}`,
                  name,
                ]}
                contentStyle={{
                  background: "#1C2027",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#F5F6F4",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value, entry) => (
                  <span className="text-xs text-graphite-600 dark:text-paper-300/70">
                    {value} ({entry.payload.count})
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
