import { getEnv, requireEnv, toNumber } from "@/lib/server/env";
import { listRetailCrmOrders, type RetailCrmOrder } from "@/lib/server/retailcrm";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

type SupabaseOrderRow = {
  id: number;
  number: string;
  created_at: string;
  status: string | null;
  customer_name: string | null;
  phone: string | null;
  city: string | null;
  total_sum: number;
  items_count: number;
  source: string | null;
  raw: RetailCrmOrder;
  synced_at: string;
};

type JobLogger = (message: string) => void;

export type SyncRetailCrmResult = {
  pages: number;
  fetchedOrders: number;
  upsertedOrders: number;
};

function normalizeDate(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return new Date().toISOString();
  }

  const source = value.trim().replace(" ", "T");

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(source)) {
    return `${source}Z`;
  }

  const parsed = new Date(source);

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function sumItems(order: RetailCrmOrder): number {
  const items = Array.isArray(order.items) ? order.items : [];

  return items.reduce((acc, item) => {
    return acc + toNumber(item.initialPrice) * toNumber(item.quantity || 1);
  }, 0);
}

function countItems(order: RetailCrmOrder): number {
  const items = Array.isArray(order.items) ? order.items : [];

  return items.reduce((acc, item) => acc + toNumber(item.quantity || 1), 0);
}

function toSupabaseRow(order: RetailCrmOrder): SupabaseOrderRow | null {
  const id = toNumber(order.id);

  if (!id) {
    return null;
  }

  const firstName = typeof order.firstName === "string" ? order.firstName.trim() : "";
  const lastName = typeof order.lastName === "string" ? order.lastName.trim() : "";
  const customerName = [firstName, lastName].filter(Boolean).join(" ");

  const totalSum = toNumber(order.totalSumm) || toNumber(order.totalSum) || sumItems(order);

  return {
    id,
    number: String(order.number ?? id),
    created_at: normalizeDate(order.createdAt),
    status: typeof order.status === "string" ? order.status : null,
    customer_name: customerName || null,
    phone: typeof order.phone === "string" ? order.phone : null,
    city:
      typeof order.delivery?.address?.city === "string"
        ? order.delivery.address.city
        : null,
    total_sum: Math.round(totalSum),
    items_count: countItems(order),
    source:
      typeof order.customFields?.utm_source === "string"
        ? order.customFields.utm_source
        : null,
    raw: order,
    synced_at: new Date().toISOString(),
  };
}

async function fetchAllOrders(site: string, logger: JobLogger): Promise<{ orders: RetailCrmOrder[]; pages: number }> {
  const limit = Number(getEnv("RETAILCRM_PAGE_LIMIT", "100"));
  const maxPages = Number(getEnv("RETAILCRM_MAX_PAGES", "50"));

  const allOrders: RetailCrmOrder[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    const payload = await listRetailCrmOrders(site, page, limit);

    if (!payload.success) {
      throw new Error(payload.errorMsg || "RetailCRM returned success=false for list orders");
    }

    const orders = Array.isArray(payload.orders) ? payload.orders : [];
    allOrders.push(...orders);

    totalPages = payload.pagination?.totalPageCount ?? page;
    logger(`Fetched page ${page}/${totalPages} (${orders.length} orders)`);
    page += 1;
  }

  return {
    orders: allOrders,
    pages: Math.min(totalPages, maxPages),
  };
}

async function upsertOrders(rows: SupabaseOrderRow[], logger: JobLogger): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const chunkSize = 200;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);

    const { error } = await supabase
      .from("orders")
      .upsert(chunk, { onConflict: "id", ignoreDuplicates: false });

    if (error) {
      if (error.message.includes("Could not find the table")) {
        throw new Error(
          "Supabase table orders is missing. Run SQL from supabase/schema.sql in Supabase SQL Editor.",
        );
      }

      throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    logger(`Upserted ${index + chunk.length}/${rows.length}`);
  }
}

export async function syncRetailCrmToSupabase(logger: JobLogger = () => {}): Promise<SyncRetailCrmResult> {
  const site = requireEnv("RETAILCRM_SITE");

  const fetched = await fetchAllOrders(site, logger);
  const rows = fetched.orders
    .map(toSupabaseRow)
    .filter((value): value is SupabaseOrderRow => value !== null);

  if (rows.length === 0) {
    return {
      pages: fetched.pages,
      fetchedOrders: fetched.orders.length,
      upsertedOrders: 0,
    };
  }

  await upsertOrders(rows, logger);

  return {
    pages: fetched.pages,
    fetchedOrders: fetched.orders.length,
    upsertedOrders: rows.length,
  };
}