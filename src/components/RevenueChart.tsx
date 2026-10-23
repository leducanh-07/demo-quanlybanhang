"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatVND } from "@/lib/format";
import { formatDateVN } from "@/lib/time";

interface RevenueChartProps {
  data: Array<{
    date: string;
    revenue: number;
  }>;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-[300px] w-full" role="img" aria-label="Biểu đồ doanh thu theo ngày">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDateVN(value)}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            minTickGap={16}
          />
          <YAxis
            tickFormatter={(value: number) => `${value / 1000}k`}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={88}
          />
          <Tooltip
            cursor={{ fill: "#fff7ed" }}
            labelFormatter={(label) => formatDateVN(String(label))}
            formatter={(value) => [`${Number(value).toLocaleString("vi-VN")}đ`, "Doanh thu"]}
            contentStyle={{
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
            }}
          />
          <Bar
            dataKey="revenue"
            name="Doanh thu"
            fill="#f97316"
            radius={[6, 6, 0, 0]}
            maxBarSize={44}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
