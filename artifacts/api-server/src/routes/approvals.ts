import { Router, type Request, type Response } from "express";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getStaffFromToken } from "./staff-admin";
import { requireAdmin } from "../middlewares/auth";

const router: Router = Router();

// All approval endpoints require an authenticated admin session (Clerk gate for
// the /v1/admin surface). Previously these were fully unauthenticated, letting
// anyone approve/publish or reject products.
router.use(requireAdmin);

// 1. List All Pending Product Approvals
router.get("/approvals", async (req: Request, res: Response) => {
  try {
    const pendingProducts = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.approvalStatus, "pending_approval"));

    res.status(200).json(pendingProducts);
  } catch (err: unknown) {
    req.log.error({ err }, "Error loading approval queue");
    res.status(500).json({ error: "Failed to load approval queue." });
  }
});

// 2. Approve Product (Main Admin & Admin Only)
router.post("/approvals/:productId/approve", async (req: Request, res: Response) => {
  const currentStaff = await getStaffFromToken(req.headers.authorization);

  if (currentStaff && (currentStaff.role === "SUB_ADMIN" || currentStaff.role === "MODERATOR")) {
    res.status(403).json({ error: "Permission denied: Only Main Admin or Admin can approve product listings." });
    return;
  }

  const productId = req.params.productId as string;

  try {
    const found = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
    if (found.length === 0) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    await db
      .update(productsTable)
      .set({
        approvalStatus: "approved",
        approvedBy: currentStaff?.userId || "main_admin_01",
        rejectionReason: null,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(productsTable.id, productId));

    res.status(200).json({ success: true, message: "Product approved and published to live storefront!" });
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to approve product");
    res.status(500).json({ error: "Failed to approve product." });
  }
});

// 3. Reject Product with Reason
router.post("/approvals/:productId/reject", async (req: Request, res: Response) => {
  const currentStaff = await getStaffFromToken(req.headers.authorization);

  if (currentStaff && (currentStaff.role === "SUB_ADMIN" || currentStaff.role === "MODERATOR")) {
    res.status(403).json({ error: "Permission denied: Only Main Admin or Admin can reject product listings." });
    return;
  }

  const productId = req.params.productId as string;
  const { reason } = req.body;

  try {
    const found = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
    if (found.length === 0) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    await db
      .update(productsTable)
      .set({
        approvalStatus: "rejected",
        rejectionReason: reason || "Product submission did not meet listing guidelines.",
        status: "draft",
        updatedAt: new Date(),
      })
      .where(eq(productsTable.id, productId));

    res.status(200).json({ success: true, message: "Product rejected and returned to draft." });
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to reject product");
    res.status(500).json({ error: "Failed to reject product." });
  }
});

export default router;
