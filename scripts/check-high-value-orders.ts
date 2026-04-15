import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { formatMoney, getEnv, requireEnv, toNumber } from "./utils/common";
import { listRetailCrmOrders, type RetailCrmOrder } from "./utils/retailcrm";
import { createSupabaseAdminClient } from "./utils/supabase";

const STATE_KEY = "last_notified_order_id";
const LOCAL_STATE_PATH = path.join(process.cwd(), ".state", "telegram-state.json");

type StateRow = {
  key: string;
  value: string;
  updated_at?: string;
};

type LocalState = {
  lastNotifiedOrderId: number;
};

function resolveTotal(order: RetailCrmOrder): number {
  const direct = toNumber(order.totalSumm) || toNumber(order.totalSum);

  if (direct > 0) {
    return direct;
  }

  const items = Array.isArray(order.items) ? order.items : [];

  return items.reduce((acc, item) => {
    return acc + toNumber(item.initialPrice) * toNumber(item.quantity || 1);
  }, 0);
}

async function fetchOrders(site: string): Promise<RetailCrmOrder[]> {
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
    page += 1;
  }

  return allOrders;
}

async function readLocalState(): Promise<number> {
  try {
    const raw = await readFile(LOCAL_STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as LocalState;
    return toNumber(parsed.lastNotifiedOrderId);
  } catch {
    return 0;
  }
}

async function writeLocalState(lastNotifiedOrderId: number): Promise<void> {
  await mkdir(path.dirname(LOCAL_STATE_PATH), { recursive: true });
  const payload: LocalState = { lastNotifiedOrderId };
  await writeFile(LOCAL_STATE_PATH, JSON.stringify(payload, null, 2), "utf8");
}

async function getLastNotifiedId(): Promise<number> {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("sync_state")
      .select("key, value")
      .eq("key", STATE_KEY)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const state = data as StateRow | null;
    return state ? toNumber(state.value) : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[warn] sync_state unavailable, using local state file (${message})`);
    return readLocalState();
  }
}

async function setLastNotifiedId(id: number): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.from("sync_state").upsert(
      {
        key: STATE_KEY,
        value: String(id),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[warn] cannot persist sync_state in Supabase, writing local state (${message})`);
    await writeLocalState(id);
  }
}

async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Telegram API error: ${payload}`);
  }
}

function buildMessage(order: RetailCrmOrder, total: number): string {
  const customer = [order.firstName, order.lastName].filter(Boolean).join(" ") || "Не указан";
  const city =
    typeof order.delivery?.address?.city === "string"
      ? order.delivery.address.city
      : "Не указан";

  return [
    "Новый заказ выше порога",
    `ID: ${order.id ?? "—"}`,
    `Номер: ${order.number ?? "—"}`,
    `Клиент: ${customer}`,
    `Телефон: ${order.phone ?? "—"}`,
    `Город: ${city}`,
    `Сумма: ${formatMoney(total)} ₸`,
  ].join("\n");
}

async function run(): Promise<void> {
  const site = requireEnv("RETAILCRM_SITE");
  const telegramToken = requireEnv("TELEGRAM_BOT_TOKEN");
  const telegramChatId = requireEnv("TELEGRAM_CHAT_ID");
  const threshold = Number(getEnv("HIGH_VALUE_THRESHOLD", "50000"));

  const lastNotifiedId = await getLastNotifiedId();
  const allOrders = await fetchOrders(site);

  const withId = allOrders
    .filter((order) => toNumber(order.id) > 0)
    .sort((a, b) => toNumber(a.id) - toNumber(b.id));

  const newestId = withId.length > 0 ? toNumber(withId[withId.length - 1].id) : lastNotifiedId;

  const candidates = withId.filter((order) => toNumber(order.id) > lastNotifiedId);
  const highValue = candidates.filter((order) => resolveTotal(order) >= threshold);

  for (const order of highValue) {
    const total = resolveTotal(order);
    const message = buildMessage(order, total);
    await sendTelegramMessage(telegramToken, telegramChatId, message);
    console.log(`Telegram sent for order id=${order.id} sum=${formatMoney(total)} ₸`);
  }

  await setLastNotifiedId(newestId);

  console.log(
    `Checked ${candidates.length} new orders, sent ${highValue.length} notifications. Last id = ${newestId}`,
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Telegram notifier failed: ${message}`);
  process.exit(1);
});