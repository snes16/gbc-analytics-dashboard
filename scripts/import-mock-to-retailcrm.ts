import { readFile } from "node:fs/promises";
import path from "node:path";

import { config } from "dotenv";

import { getEnv, requireEnv, sleep } from "../src/lib/server/env";
import { createOrderInRetailCrm } from "../src/lib/server/retailcrm";

config({ path: ".env.local" });
config();

type MockOrder = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  items?: Array<{
    productName?: string;
    quantity?: number;
    initialPrice?: number;
  }>;
  delivery?: {
    address?: {
      city?: string;
      text?: string;
    };
  };
};

function sanitizeOrder(order: Record<string, unknown>): Record<string, unknown> {
  const source = order as MockOrder;

  const items = Array.isArray(source.items)
    ? source.items
        .map((item) => ({
          productName:
            typeof item.productName === "string" && item.productName.trim().length > 0
              ? item.productName.trim()
              : "Товар",
          quantity:
            typeof item.quantity === "number" && item.quantity > 0
              ? item.quantity
              : 1,
          initialPrice:
            typeof item.initialPrice === "number" && item.initialPrice > 0
              ? item.initialPrice
              : 1,
        }))
        .filter((item) => item.quantity > 0 && item.initialPrice > 0)
    : [];

  return {
    firstName:
      typeof source.firstName === "string" && source.firstName.trim().length > 0
        ? source.firstName.trim()
        : "Имя",
    lastName:
      typeof source.lastName === "string" && source.lastName.trim().length > 0
        ? source.lastName.trim()
        : "Клиент",
    phone:
      typeof source.phone === "string" && source.phone.trim().length > 0
        ? source.phone.trim()
        : "+77000000000",
    email:
      typeof source.email === "string" && source.email.trim().length > 0
        ? source.email.trim()
        : "unknown@example.com",
    items,
    delivery: {
      address: {
        city:
          typeof source.delivery?.address?.city === "string"
            ? source.delivery.address.city
            : "Алматы",
        text:
          typeof source.delivery?.address?.text === "string"
            ? source.delivery.address.text
            : "Не указан",
      },
    },
  };
}

async function run(): Promise<void> {
  const site = requireEnv("RETAILCRM_SITE");
  const pauseMs = Number(getEnv("RETAILCRM_IMPORT_PAUSE_MS", "120"));

  const filePath = path.join(process.cwd(), "mock_orders.json");
  const raw = await readFile(filePath, "utf8");
  const orders = JSON.parse(raw) as Array<Record<string, unknown>>;

  let imported = 0;
  let failed = 0;

  for (let index = 0; index < orders.length; index += 1) {
    const order = sanitizeOrder(orders[index]);

    try {
      const result = await createOrderInRetailCrm(order, site);

      if (!result.success || !result.id) {
        failed += 1;
        console.error(
          `[${index + 1}/${orders.length}] failed: ${result.errorMsg || "Unknown API error"}`,
        );
      } else {
        imported += 1;
        console.log(`[${index + 1}/${orders.length}] imported retailCRM order id=${result.id}`);
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${index + 1}/${orders.length}] failed: ${message}`);
    }

    if (pauseMs > 0 && index < orders.length - 1) {
      await sleep(pauseMs);
    }
  }

  console.log("---");
  console.log(`Import complete. Success: ${imported}, Failed: ${failed}`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Import script failed: ${message}`);
  process.exit(1);
});