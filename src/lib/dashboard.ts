import { createClient } from "@supabase/supabase-js";

import type { DailyOrdersPoint, OrderRow } from "@/lib/types";

type DashboardData = {
  orders: OrderRow[];
  totalOrders: number;
  totalRevenue: number;
  averageCheck: number;
  highValueOrders: number;
  daily: DailyOrdersPoint[];
  topCities: Array<{ city: string; orders: number }>;
};

const DEFAULT_LIMIT = 5000;

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatDateLabel(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function aggregateDaily(orders: OrderRow[]): DailyOrdersPoint[] {
  const map = new Map<string, DailyOrdersPoint>();

  for (const order of orders) {
    const key = order.created_at.slice(0, 10);
    const point = map.get(key) ?? { date: key, orders: 0, revenue: 0 };
    point.orders += 1;
    point.revenue += toNumber(order.total_sum);
    map.set(key, point);
  }

  return Array.from(map.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((point) => ({
      ...point,
      date: formatDateLabel(point.date),
      revenue: Math.round(point.revenue),
    }));
}

function aggregateCities(orders: OrderRow[]): Array<{ city: string; orders: number }> {
  const map = new Map<string, number>();

  for (const order of orders) {
    const city = order.city?.trim() || "Не указан";
    map.set(city, (map.get(city) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .map(([city, count]) => ({ city, orders: count }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      orders: [],
      totalOrders: 0,
      totalRevenue: 0,
      averageCheck: 0,
      highValueOrders: 0,
      daily: [],
      topCities: [],
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, number, created_at, status, customer_name, phone, city, total_sum, items_count, source",
    )
    .order("created_at", { ascending: true })
    .limit(DEFAULT_LIMIT);

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  const rows: OrderRow[] = (data ?? []).map((row) => ({
    id: toNumber(row.id),
    number: String(row.number ?? row.id ?? ""),
    created_at: String(row.created_at ?? ""),
    status: (row.status as string | null) ?? null,
    customer_name: (row.customer_name as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    total_sum: toNumber(row.total_sum),
    items_count: toNumber(row.items_count),
    source: (row.source as string | null) ?? null,
  }));

  const totalOrders = rows.length;
  const totalRevenue = rows.reduce((acc, row) => acc + row.total_sum, 0);
  const averageCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const highValueOrders = rows.filter((row) => row.total_sum >= 50000).length;

  return {
    orders: rows,
    totalOrders,
    totalRevenue: Math.round(totalRevenue),
    averageCheck: Math.round(averageCheck),
    highValueOrders,
    daily: aggregateDaily(rows),
    topCities: aggregateCities(rows),
  };
}
