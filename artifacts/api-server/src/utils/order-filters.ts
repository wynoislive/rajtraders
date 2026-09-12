import type { ordersTable } from "@workspace/db";

type OrderRow = typeof ordersTable.$inferSelect;

export interface OrderFilterQuery {
  status?: unknown;
  duration?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  search?: unknown;
}

/**
 * Applies status / duration / date-range / free-text filtering and a
 * newest-first sort to a set of order rows. Shared by the customer
 * order-history endpoint (already scoped to a single user) and the
 * admin order ledger (all users) so both filter identically.
 */
export function filterOrders(orders: OrderRow[], query: OrderFilterQuery): OrderRow[] {
  let filtered = orders;
  const { status, duration, startDate, endDate, search } = query;

  // Filter by Status
  if (status && typeof status === "string" && status !== "all") {
    const targetStatus = status.toLowerCase();
    if (targetStatus === "paid" || targetStatus === "successful") {
      filtered = filtered.filter((o) => o.status === "paid");
    } else if (targetStatus === "pending" || targetStatus === "created") {
      filtered = filtered.filter((o) => o.status === "created");
    } else if (targetStatus === "cancelled" || targetStatus === "cancel" || targetStatus === "failed") {
      filtered = filtered.filter((o) => o.status === "cancelled" || o.status === "failed");
    } else {
      filtered = filtered.filter((o) => o.status === targetStatus);
    }
  }

  // Filter by Date / Duration (presets & custom range up to 1 year)
  const now = Date.now();
  let minTime: number | null = null;
  let maxTime: number | null = null;

  if (startDate && typeof startDate === "string") {
    const s = new Date(startDate).getTime();
    if (!isNaN(s)) minTime = s;
  }
  if (endDate && typeof endDate === "string") {
    const e = new Date(endDate).getTime();
    if (!isNaN(e)) {
      maxTime = e + (24 * 60 * 60 * 1000 - 1);
    }
  }

  if (minTime === null && duration && typeof duration === "string" && duration !== "all") {
    const dur = duration.toLowerCase();
    if (dur === "7d") {
      minTime = now - 7 * 24 * 60 * 60 * 1000;
    } else if (dur === "30d") {
      minTime = now - 30 * 24 * 60 * 60 * 1000;
    } else if (dur === "90d" || dur === "3m") {
      minTime = now - 90 * 24 * 60 * 60 * 1000;
    } else if (dur === "1y" || dur === "365d") {
      minTime = now - 365 * 24 * 60 * 60 * 1000;
    }
  }

  if (minTime !== null) {
    filtered = filtered.filter((o) => new Date(o.createdAt).getTime() >= minTime!);
  }
  if (maxTime !== null) {
    filtered = filtered.filter((o) => new Date(o.createdAt).getTime() <= maxTime!);
  }

  // Search filter
  if (search && typeof search === "string" && search.trim() !== "") {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((o) => {
      return (
        o.id.toLowerCase().includes(q) ||
        (o.razorpayOrderId && o.razorpayOrderId.toLowerCase().includes(q)) ||
        (o.razorpayPaymentId && o.razorpayPaymentId.toLowerCase().includes(q)) ||
        (o.customerEmail && o.customerEmail.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerMobile && o.customerMobile.toLowerCase().includes(q)) ||
        (o.itemsJson && o.itemsJson.toLowerCase().includes(q))
      );
    });
  }

  // Sort descending by creation date
  return [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
