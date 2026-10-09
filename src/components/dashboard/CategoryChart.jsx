import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Card, { CardHeader } from "../common/Card";
import { categoryDistribution } from "../../data/mockData";

const COLORS = ["#F5C518", "#4C8DFF", "#33C481", "#F2A93B", "#F0525B"];

export default function CategoryChart() {
  return (
    <Card>
      <CardHeader title="Product Categories" subtitle="Share of catalog" />
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryDistribution}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={72}
              paddingAngle={3}
            >
              {categoryDistribution.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#1C2027", border: "none", borderRadius: 6, fontSize: 12, color: "#F5F6F4" }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-graphite-600 dark:text-paper-300/70">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
