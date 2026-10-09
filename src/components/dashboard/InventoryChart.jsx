import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card, { CardHeader } from "../common/Card";
import dashboardService from "../../services/dashboardService";

export default function InventoryChart({ data }) {
  const [chartData, setChartData] = useState(data || []);

  useEffect(() => {
    if (Array.isArray(data)) {
      setChartData(data);
    } else if (data === undefined) {
      // Standalone mode: fetch own data
      dashboardService.getStats()
        .then((res) => {
          if (res?.inventoryLevels && res.inventoryLevels.length > 0) {
            setChartData(res.inventoryLevels);
          }
        })
        .catch(() => {});
    }
  }, [data]);

  return (
    <Card>
      <CardHeader title="Inventory Levels" subtitle="Total units on hand, 6 months" />
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: -20, right: 10, top: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-graphite-800/10 dark:text-paper-100/10" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="currentColor" className="text-graphite-400" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-graphite-400" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#1C2027", border: "none", borderRadius: 6, fontSize: 12, color: "#F5F6F4" }}
            />
            <Line type="monotone" dataKey="level" stroke="#33C481" strokeWidth={2.5} dot={{ r: 3, fill: "#33C481" }} name="Units" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
