import type { NextRequest } from "next/server";

import { syncRetailCrmToSupabase } from "@/lib/server/jobs/sync-retailcrm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorize(request: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return {
      ok: false,
      status: 500,
      error: "CRON_SECRET is not configured",
    };
  }

  const header = request.headers.get("authorization");

  if (header !== `Bearer ${secret}`) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
    };
  }

  return { ok: true };
}

export async function GET(request: NextRequest): Promise<Response> {
  const auth = authorize(request);

  if (!auth.ok) {
    return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const logs: string[] = [];

  try {
    const result = await syncRetailCrmToSupabase((message) => {
      logs.push(message);
    });

    return Response.json({
      ok: true,
      result,
      logs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return Response.json(
      {
        ok: false,
        error: message,
        logs,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
