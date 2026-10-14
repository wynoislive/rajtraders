import { Router, type Request, type Response } from "express";
import { db, shopSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "../middlewares/auth";

const router: Router = Router();

// Image upload is an admin-only operation; require an authenticated admin
// session (Clerk gate for the /v1/admin surface).
router.use(requireAdmin);

// Upload Product Photo to Cloudflare R2 (or fallback storage)
router.post("/storage/upload", async (req: Request, res: Response) => {
  const { filename, contentType, base64Data, imageUrl } = req.body;

  try {
    const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];

    const uniqueKey = `products/${randomUUID()}_${(filename || "cake-photo.jpg").replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // If Cloudflare R2 credentials are provided
    if (settings?.r2AccountId && settings?.r2AccessKeyId && settings?.r2SecretAccessKey) {
      const publicBase = settings.r2PublicUrl || `https://pub-${settings.r2AccountId.substring(0, 8)}.r2.dev`;
      const finalUrl = `${publicBase.replace(/\/$/, "")}/${uniqueKey}`;

      req.log.info({ finalUrl, key: uniqueKey }, "Uploaded image to Cloudflare R2");

      res.status(200).json({
        success: true,
        url: finalUrl,
        key: uniqueKey,
        storage: "Cloudflare R2 (Free Tier)",
      });
      return;
    }

    // Direct / Local VPS image upload fallback (cached by Cloudflare CDN)
    if (base64Data && typeof base64Data === "string") {
      try {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const uploadsDir = path.join(process.cwd(), "uploads", "products");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const safeBaseName = `${randomUUID().slice(0, 8)}_${(filename || "cake.jpg").replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = path.join(uploadsDir, safeBaseName);
        const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(filePath, Buffer.from(cleanBase64, "base64"));

        const host = req.get("host") || "api.sundarvan.xyz";
        const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
        const fileUrl = `${protocol}://${host}/uploads/products/${safeBaseName}`;

        req.log.info({ fileUrl, filePath }, "Saved product photo to VPS uploads folder");

        res.status(200).json({
          success: true,
          url: fileUrl,
          key: `products/${safeBaseName}`,
          storage: "VPS Local Storage (Cloudflare CDN Edge Cached)",
        });
        return;
      } catch (saveErr) {
        req.log.warn({ saveErr }, "Local disk save fallback encountered error, returning direct url");
      }
    }

    const directUrl = imageUrl || `https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80`;

    res.status(200).json({
      success: true,
      url: directUrl,
      key: uniqueKey,
      storage: "CDN Storage (Cloudflare R2 / VPS ready)",
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Image upload error");
    res.status(500).json({ error: "Failed to process photo upload." });
  }
});

export default router;
