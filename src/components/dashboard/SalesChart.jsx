import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card, { CardHeader } from "../common/Card";
import dashboardService from "../../services/dashboardService";
import { formatCurrency } from "../../utils/formatters";

export default function SalesChart({ data }) {
  const [chartData, setChartData] = useState(data || []);

  useEffect(() => {
    if (Array.isArray(data)) {
      setChartData(data);
    } else if (data === undefined) {
      // Standalone mode: fetch own data
      dashboardService.getStats()
        .then((res) => {
          if (res?.salesTrend && res.salesTrend.length > 0) {
            setChartData(res.salesTrend);
          }
        })
        .catch(() => {});
    }
  }, [data]);

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader title="Sales vs Purchases" subtitle="Last 7 days" />
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ left: -20, right: 10, top: 5 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F5C518" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#F5C518" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="purchasesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4C8DFF" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#4C8DFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-graphite-800/10 dark:text-paper-100/10" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="currentColor" className="text-graphite-400" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-graphite-400" tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(val) => formatCurrency(val)}
              contentStyle={{
                background: "var(--tw-tooltip-bg, #1C2027)",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                color: "#F5F6F4",
              }}
            />
            <Area type="monotone" dataKey="sales" stroke="#F5C518" strokeWidth={2} fill="url(#salesFill)" name="Sales (₹)" />
            <Area type="monotone" dataKey="purchases" stroke="#4C8DFF" strokeWidth={2} fill="url(#purchasesFill)" name="Purchases (₹)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-graphite-500 dark:text-paper-300/60">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-signal" /> Sales</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-stock-info" /> Purchases</span>
      </div>
    </Card>
  );
}
