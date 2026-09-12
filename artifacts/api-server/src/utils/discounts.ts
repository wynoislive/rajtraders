import type { discountsTable } from "@workspace/db";

export interface DiscountComputation {
  valid: boolean;
  discountCents: number;
}

type DiscountRow = typeof discountsTable.$inferSelect;

/**
 * Single source of truth for discount validity + amount.
 *
 * Enforces the full validity window (active flag, start/expiry dates,
 * usage limit, minimum subtotal, first-order-only) and clamps the
 * computed discount so it can never exceed the subtotal. Used by both
 * `/v1/discounts/validate` (quote) and checkout `create-order` (the
 * authoritative money path) so the two can never drift apart.
 */
export function computeDiscount(
  discount: DiscountRow | undefined | null,
  subtotalCents: number,
  isFirstOrder: boolean,
  now: number = Date.now(),
): DiscountComputation {
  const valid = Boolean(
    discount &&
      discount.active &&
      discount.startsAt.getTime() <= now &&
      (!discount.expiresAt || discount.expiresAt.getTime() >= now) &&
      (discount.usageLimit === null || discount.usageCount < discount.usageLimit) &&
      subtotalCents >= discount.minimumSubtotalCents &&
      (!discount.firstOrderOnly || isFirstOrder),
  );

  if (!valid || !discount) {
    return { valid: false, discountCents: 0 };
  }

  const rawDiscountCents =
    discount.type === "percentage"
      ? Math.floor((subtotalCents * discount.value) / 100)
      : Math.round(discount.value);

  // Never let a discount exceed the subtotal (prevents negative totals).
  const discountCents = Math.max(0, Math.min(rawDiscountCents, subtotalCents));
  return { valid: true, discountCents };
}
