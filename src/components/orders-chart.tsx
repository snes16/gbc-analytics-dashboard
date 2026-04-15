"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyOrdersPoint } from "@/lib/types";

type OrdersChartProps = {
  data: DailyOrdersPoint[];
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function OrdersChart({ data }: OrdersChartProps) {
  if (data.length === 0) {
    return (
      <div className="empty-state">
        Нет данных для построения графика. Сначала запусти синхронизацию из RetailCRM.
      </div>
    );
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9e3ef" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) => {
              const numericValue =
                typeof value === "number" ? value : Number(value ?? 0);

              if (name === "Выручка") {
                return [`${formatMoney(numericValue)} ₸`, name];
              }

              return [numericValue, name];
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="orders"
            fill="#1f6feb"
            name="Заказы"
            radius={[6, 6, 0, 0]}
          />
          <Line
            yAxisId="right"
            dataKey="revenue"
            stroke="#ff6f3d"
            name="Выручка"
            strokeWidth={2}
            dot={{ r: 2 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
