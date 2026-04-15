import { URLSearchParams } from "node:url";

import { requireEnv } from "@/lib/server/env";

const JSON_HEADERS = {
  Accept: "application/json",
};

export type RetailCrmOrder = {
  id?: number;
  number?: string | number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  status?: string;
  createdAt?: string;
  totalSumm?: number;
  totalSum?: number;
  items?: Array<{ quantity?: number; initialPrice?: number }>;
  delivery?: {
    address?: {
      city?: string;
      text?: string;
    };
  };
  customFields?: {
    utm_source?: string;
  };
};

type RetailCrmListResponse = {
  success: boolean;
  orders?: RetailCrmOrder[];
  pagination?: {
    currentPage: number;
    totalPageCount: number;
  };
  errorMsg?: string;
};

type RetailCrmCreateResponse = {
  success: boolean;
  id?: number;
  errorMsg?: string;
};

function getBaseUrl(): string {
  return requireEnv("RETAILCRM_BASE_URL").replace(/\/+$/, "");
}

function getApiKey(): string {
  return requireEnv("RETAILCRM_API_KEY");
}

async function parseResponse<T>(response: Response): Promise<T> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error(`RetailCRM returned non-JSON response with status ${response.status}`);
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "errorMsg" in payload
        ? String((payload as { errorMsg?: string }).errorMsg || "Unknown RetailCRM error")
        : `HTTP ${response.status}`;
    throw new Error(`RetailCRM request failed: ${message}`);
  }

  return payload as T;
}

export async function createOrderInRetailCrm(
  order: Record<string, unknown>,
  site: string,
): Promise<RetailCrmCreateResponse> {
  const url = new URL(`${getBaseUrl()}/api/v5/orders/create`);
  url.searchParams.set("apiKey", getApiKey());

  const body = new URLSearchParams();
  body.set("site", site);
  body.set("order", JSON.stringify(order));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return parseResponse<RetailCrmCreateResponse>(response);
}

export async function listRetailCrmOrders(
  site: string,
  page: number,
  limit: number,
): Promise<RetailCrmListResponse> {
  const url = new URL(`${getBaseUrl()}/api/v5/orders`);
  url.searchParams.set("apiKey", getApiKey());
  url.searchParams.set("site", site);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    method: "GET",
    headers: JSON_HEADERS,
  });

  return parseResponse<RetailCrmListResponse>(response);
}