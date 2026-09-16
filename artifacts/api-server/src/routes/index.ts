import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storefrontRouter from "./storefront";
import adminRouter from "./admin";
import checkoutRouter from "./checkout";
import customerAuthRouter from "./customer-auth";
import staffAdminRouter from "./staff-admin";
import approvalsRouter from "./approvals";
import storageRouter from "./storage";
import cronRouter from "./cron";
import cartRouter from "./cart";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storefrontRouter);
router.use(adminRouter);
router.use("/v1/checkout", checkoutRouter);
router.use("/v1/auth", customerAuthRouter);
router.use("/v1/customer/cart", cartRouter);
router.use("/v1/admin", staffAdminRouter);
router.use("/v1/admin", approvalsRouter);
router.use("/v1/admin", storageRouter);
router.use("/v1/cron", cronRouter);

export default router;
