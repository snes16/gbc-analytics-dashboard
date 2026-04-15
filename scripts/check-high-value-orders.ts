import { config } from "dotenv";

import { notifyHighValueOrders } from "../src/lib/server/jobs/notify-high-value";

config({ path: ".env.local" });
config();

async function run(): Promise<void> {
  const result = await notifyHighValueOrders((message) => {
    console.log(message);
  });

  console.log(
    `Checked ${result.checkedOrders} new orders, sent ${result.sentNotifications} notifications. Last id = ${result.lastProcessedId}`,
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Telegram notifier failed: ${message}`);
  process.exit(1);
});