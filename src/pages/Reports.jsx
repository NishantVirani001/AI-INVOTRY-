import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card, { CardHeader } from "../components/common/Card";
import Button from "../components/common/Button";
import SalesChart from "../components/dashboard/SalesChart";
import CategoryChart from "../components/dashboard/CategoryChart";
import { mockProducts, mockSuppliers } from "../data/mockData";
import { formatCurrency } from "../utils/formatters";

const topProducts = [...mockProducts]
  .sort((a, b) => b.price * (100 - b.quantity) - a.price * (100 - a.quantity))
  .slice(0, 6)
  .map((p) => ({ name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name, revenue: Math.round(p.price * (p.quantity + 20)) }));

const supplierPerformance = mockSuppliers.map((s) => ({
  name: s.name.split(" ")[0],
  rating: s.rating,
}));

export default function Reports() {
  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Reports"
        subtitle="Performance across sales, inventory, and suppliers"
        action={<Button variant="outline" icon={Download}>Export CSV</Button>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SalesChart />
        <CategoryChart />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top Products by Revenue" subtitle="Estimated, last 30 days" />
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-graphite-800/10 dark:text-paper-100/10" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="currentColor" className="text-graphite-400" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-graphite-400" tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v) => formatCurrency(v)}
                  contentStyle={{ background: "#1C2027", border: "none", borderRadius: 6, fontSize: 12, color: "#F5F6F4" }}
                />
                <Bar dataKey="revenue" fill="#F5C518" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Supplier Rating" subtitle="Out of 5.0" />
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierPerformance} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-graphite-800/10 dark:text-paper-100/10" horizontal={false} />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} stroke="currentColor" className="text-graphite-400" tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 12 }} stroke="currentColor" className="text-graphite-400" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#1C2027", border: "none", borderRadius: 6, fontSize: 12, color: "#F5F6F4" }} />
                <Bar dataKey="rating" fill="#4C8DFF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
