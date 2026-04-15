import { config } from "dotenv";

import { syncRetailCrmToSupabase } from "../src/lib/server/jobs/sync-retailcrm";

config({ path: ".env.local" });
config();

async function run(): Promise<void> {
  const result = await syncRetailCrmToSupabase((message) => {
    console.log(message);
  });

  console.log(
    `Sync complete. Fetched: ${result.fetchedOrders}, Upserted: ${result.upsertedOrders}, Pages: ${result.pages}.`,
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Sync script failed: ${message}`);
  process.exit(1);
});