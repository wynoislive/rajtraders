import type { discountsTable } from "@workspace/db";

export interface DiscountComputation {
  valid: boolean;
  discountCents: number;
  reason?: string;
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
  if (!discount) {
    return { valid: false, discountCents: 0, reason: "Coupon code does not exist." };
  }
  if (!discount.active) {
    return { valid: false, discountCents: 0, reason: "This coupon is currently inactive." };
  }
  if (discount.startsAt.getTime() > now + 120000) {
    return { valid: false, discountCents: 0, reason: "This coupon is not active yet." };
  }
  if (discount.expiresAt && discount.expiresAt.getTime() < now) {
    return { valid: false, discountCents: 0, reason: "This coupon has expired." };
  }
  if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
    return { valid: false, discountCents: 0, reason: "Coupon usage limit has been reached." };
  }
  if (subtotalCents < discount.minimumSubtotalCents) {
    const minRs = (discount.minimumSubtotalCents / 100).toFixed(0);
    return { valid: false, discountCents: 0, reason: `Minimum order value of ₹${minRs} required.` };
  }
  if (discount.firstOrderOnly && !isFirstOrder) {
    return { valid: false, discountCents: 0, reason: "Valid only on your first order." };
  }

  const rawDiscountCents =
    discount.type === "percentage"
      ? Math.floor((subtotalCents * discount.value) / 100)
      : Math.round(discount.value);

  // Never let a discount exceed the subtotal (prevents negative totals).
  const discountCents = Math.max(0, Math.min(rawDiscountCents, subtotalCents));
  return { valid: true, discountCents, reason: "Discount applied." };
}
