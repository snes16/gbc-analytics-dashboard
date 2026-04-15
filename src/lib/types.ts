export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type RetailCrmOrderItem = {
  productName?: string;
  quantity?: number;
  initialPrice?: number;
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
  items?: RetailCrmOrderItem[];
  delivery?: {
    address?: {
      city?: string;
      text?: string;
    };
  };
  customFields?: {
    utm_source?: string;
    [key: string]: JsonValue | undefined;
  };
};

export type OrderRow = {
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
};

export type DailyOrdersPoint = {
  date: string;
  orders: number;
  revenue: number;
};
