import PDFDocument from "pdfkit";

export interface InvoiceItem {
  name: string;
  quantity: number;
  priceCents: number; // tax-inclusive MRP in paise
  hsnCode?: string;
  gstRatePercentage?: number;
}

export interface InvoiceData {
  orderId: string;
  invoiceNumber: string;
  invoiceDate: Date | string;
  paymentId?: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerMobile?: string;
  shippingAddress: string;
  items: InvoiceItem[] | string;
  subtotalCents: number;
  discountCents: number;
  shippingFeeCents: number;
  packagingFeeCents: number;
  totalCents: number;
  taxableAmountCents: number;
  cgstCents: number;
  sgstCents: number;
  igstCents: number;
  // Shop Details
  shopName: string;
  legalBusinessName: string;
  gstinNumber: string;
  panNumber: string;
  shopAddress: string;
  stateCode: string;
  stateName: string;
  contactEmail?: string;
}

function formatINR(cents?: number | null): string {
  return "Rs. " + (((cents ?? 0)) / 100).toFixed(2);
}

/**
 * Strips non-standard emojis and non-printable Unicode characters
 * that cause mojibake / corrupted glyphs in PDFKit standard fonts.
 */
function sanitizePdfText(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/[^\x20-\x7E\t\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates an official GST Tax Invoice as a vector PDF Buffer.
 * Fully styled in Raj Traders signature brand aesthetics with
 * zero horizontal text collisions and reliable layout coordinates.
 */
export function generateTaxInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: `Tax Invoice - ${data.invoiceNumber || data.orderId}`,
          Author: data.shopName || "RAJ TRADERS",
          Subject: `Order Tax Invoice #${data.orderId}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const primaryColor = "#0E3D42";
      const secondaryColor = "#475569";
      const darkColor = "#0F172A";
      const accentColor = "#B91C1C";
      const lightBg = "#F8FAFC";
      const borderColor = "#CBD5E1";
      const lineDivider = "#E2E8F0";

      // ─── 1. Header Banner ──────────────────────────────────
      doc.rect(40, 40, 515, 68).fillAndStroke("#FAFAF9", borderColor);
      // Top brand accent strip
      doc.rect(40, 40, 515, 4).fill(primaryColor);

      // Left: Store Branding
      doc.fillColor(primaryColor).fontSize(16).font("Helvetica-Bold").text(
        (data.shopName || "RAJ TRADERS").toUpperCase(),
        55,
        52
      );
      doc.fontSize(8).font("Helvetica").fillColor(secondaryColor);
      if (data.legalBusinessName) {
        doc.text(`(${data.legalBusinessName})`, 55, 71);
      }
      const fullShopAddress = `${data.shopAddress || "Thana Rd, beside NAGAR PALIKA, Birsingpur Pali"} | State: ${data.stateName || "Madhya Pradesh"} (${data.stateCode || "23"})`;
      doc.text(sanitizePdfText(fullShopAddress), 55, 82, { width: 295 });

      // Right: Tax Invoice title & GSTIN
      doc.fontSize(14).font("Helvetica-Bold").fillColor(accentColor).text("TAX INVOICE", 345, 52, { width: 195, align: "right" });
      doc.fontSize(8).font("Helvetica-Bold").fillColor(darkColor);
      doc.text(`GSTIN: ${data.gstinNumber || "23AAAAA0000A1Z5"}`, 345, 70, { width: 195, align: "right" });
      doc.fontSize(7.5).font("Helvetica").fillColor(secondaryColor);
      doc.text(`PAN: ${data.panNumber || "AAAAA0000A"}  |  ORIGINAL FOR RECIPIENT`, 345, 82, { width: 195, align: "right" });

      // Safe date formatting
      const dateObj = data.invoiceDate instanceof Date ? data.invoiceDate : new Date(data.invoiceDate || Date.now());
      const formattedDate = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

      // ─── 2. Metadata Boxes (Billed To & Invoice Details) ────
      const metaY = 118;
      const metaHeight = 90;
      const boxWidth = 252;

      // Left Box: Customer
      doc.rect(40, metaY, boxWidth, metaHeight).fillAndStroke("#FFFFFF", borderColor);
      doc.rect(40, metaY, boxWidth, 20).fillAndStroke("#F1F5F9", borderColor);
      doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica-Bold").text("BILLED TO / SHIP TO", 50, metaY + 6);

      doc.fillColor(darkColor).fontSize(8).font("Helvetica-Bold").text(
        sanitizePdfText(data.customerName || "Valued Customer"),
        50,
        metaY + 27
      );
      doc.font("Helvetica").fontSize(7.5).fillColor(secondaryColor);
      doc.text(`Phone: ${sanitizePdfText(data.customerMobile) || "N/A"}`, 50, metaY + 39);
      doc.text(`Email: ${sanitizePdfText(data.customerEmail) || "N/A"}`, 50, metaY + 50);

      const rawAddress = data.shippingAddress || "Local Store Pickup (Thana Rd, Birsingpur Pali)";
      const cleanAddress = sanitizePdfText(rawAddress);
      doc.text(`Address: ${cleanAddress}`, 50, metaY + 61, { width: 230, height: 26, ellipsis: true });

      // Right Box: Invoice Details
      const rightBoxX = 303;
      doc.rect(rightBoxX, metaY, boxWidth, metaHeight).fillAndStroke("#FFFFFF", borderColor);
      doc.rect(rightBoxX, metaY, boxWidth, 20).fillAndStroke("#F1F5F9", borderColor);
      doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica-Bold").text("INVOICE & PAYMENT DETAILS", rightBoxX + 10, metaY + 6);

      const displayInvoiceNo = data.invoiceNumber || `INV-${data.orderId.slice(0, 8).toUpperCase()}`;
      doc.fillColor(darkColor).fontSize(8).font("Helvetica").text("Invoice No: ", rightBoxX + 10, metaY + 27, { continued: true });
      doc.font("Helvetica-Bold").text(displayInvoiceNo);

      doc.font("Helvetica").fontSize(7.5).fillColor(secondaryColor);
      doc.text(`Invoice Date: ${formattedDate}`, rightBoxX + 10, metaY + 39);
      doc.text(`Order ID: #${data.orderId.slice(0, 8).toUpperCase()}`, rightBoxX + 10, metaY + 50);

      // Payment Status Pill & Reference
      const isCod = (data.paymentMethod || "").toLowerCase().includes("cash") || (data.paymentMethod || "").toLowerCase().includes("cod");
      const isPaid = !!data.paymentId || (data.paymentMethod || "").toLowerCase().includes("online") || (data.paymentMethod || "").toLowerCase().includes("razorpay");

      if (isCod) {
        doc.rect(rightBoxX + 10, metaY + 64, 115, 17).fillAndStroke("#FEF3C7", "#FDE68A");
        doc.fillColor("#92400E").fontSize(7.5).font("Helvetica-Bold").text("CASH ON DELIVERY", rightBoxX + 16, metaY + 69);
      } else if (isPaid) {
        doc.rect(rightBoxX + 10, metaY + 64, 130, 17).fillAndStroke("#ECFDF5", "#A7F3D0");
        doc.fillColor("#065F46").fontSize(7.5).font("Helvetica-Bold").text("PAID ONLINE (Razorpay)", rightBoxX + 16, metaY + 69);
        if (data.paymentId) {
          doc.fillColor("#64748B").fontSize(6.5).font("Helvetica").text(
            `Ref: ${data.paymentId.slice(0, 16)}...`,
            rightBoxX + 148,
            metaY + 70
          );
        }
      } else {
        doc.rect(rightBoxX + 10, metaY + 64, 105, 17).fillAndStroke("#F1F5F9", borderColor);
        doc.fillColor("#475569").fontSize(7.5).font("Helvetica-Bold").text("PAYMENT PENDING", rightBoxX + 16, metaY + 69);
      }

      // ─── 3. Items Table ─────────────────────────────────────
      let y = 218;
      const cols = [
        { id: "sn", label: "#", x: 40, width: 25, align: "center" as const },
        { id: "desc", label: "Item Description", x: 65, width: 170, align: "left" as const },
        { id: "hsn", label: "HSN", x: 235, width: 45, align: "center" as const },
        { id: "qty", label: "Qty", x: 280, width: 30, align: "center" as const },
        { id: "rate", label: "MRP", x: 310, width: 55, align: "right" as const },
        { id: "taxable", label: "Taxable", x: 365, width: 60, align: "right" as const },
        { id: "gst", label: "GST Rate", x: 425, width: 65, align: "right" as const },
        { id: "total", label: "Total", x: 490, width: 65, align: "right" as const },
      ];

      // Table Header Bar
      const headerHeight = 22;
      doc.rect(40, y, 515, headerHeight).fillAndStroke(primaryColor, primaryColor);
      doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica-Bold");
      cols.forEach((col) => {
        const textX = col.align === "left" ? col.x + 6 : col.x;
        const textWidth = col.align === "left" ? col.width - 6 : col.width;
        doc.text(col.label, textX, y + 7, { width: textWidth, align: col.align });
      });

      y += headerHeight;

      // Parse & normalize items list
      let safeItems: InvoiceItem[] = [];
      if (Array.isArray(data.items)) {
        safeItems = data.items;
      } else if (typeof data.items === "string") {
        try {
          safeItems = JSON.parse(data.items);
        } catch {
          safeItems = [];
        }
      }

      const rowHeight = 24;

      if (safeItems.length === 0) {
        doc.rect(40, y, 515, rowHeight).fillAndStroke("#FFFFFF", lineDivider);
        doc.fillColor(secondaryColor).fontSize(7.5).font("Helvetica");
        doc.text("Store Item(s)", cols[1].x + 6, y + 8, { width: cols[1].width });
        doc.text("1", cols[3].x, y + 8, { width: cols[3].width, align: "center" });
        doc.text(formatINR(data.totalCents), cols[7].x, y + 8, { width: cols[7].width - 6, align: "right" });
        y += rowHeight;
      } else {
        safeItems.forEach((item, index) => {
          const itemGstRate = typeof item.gstRatePercentage === "number" ? item.gstRatePercentage : 5;
          const itemPrice = typeof item.priceCents === "number" ? item.priceCents : typeof (item as any).price === "number" ? (item as any).price : 0;
          const itemQty = Number(item.quantity) || 1;
          const totalItemGross = itemPrice * itemQty;
          const itemTaxable = Math.round(totalItemGross / (1 + itemGstRate / 100));
          const itemGst = totalItemGross - itemTaxable;

          const isEven = index % 2 === 0;
          doc.rect(40, y, 515, rowHeight).fillAndStroke(isEven ? "#FFFFFF" : lightBg, lineDivider);

          doc.fillColor(darkColor).fontSize(7.5).font("Helvetica");
          doc.text(String(index + 1), cols[0].x, y + 8, { width: cols[0].width, align: "center" });

          doc.font("Helvetica-Bold").text(
            sanitizePdfText(item.name || (item as any).title || "Bakery Item"),
            cols[1].x + 6,
            y + 8,
            { width: cols[1].width - 10, ellipsis: true }
          );

          doc.font("Helvetica");
          doc.text(item.hsnCode || "1905", cols[2].x, y + 8, { width: cols[2].width, align: "center" });
          doc.text(String(itemQty), cols[3].x, y + 8, { width: cols[3].width, align: "center" });
          doc.text(formatINR(itemPrice), cols[4].x, y + 8, { width: cols[4].width - 6, align: "right" });
          doc.text(formatINR(itemTaxable), cols[5].x, y + 8, { width: cols[5].width - 6, align: "right" });
          doc.text(`${itemGstRate}% (${formatINR(itemGst)})`, cols[6].x, y + 8, { width: cols[6].width - 6, align: "right" });

          doc.font("Helvetica-Bold");
          doc.text(formatINR(totalItemGross), cols[7].x, y + 8, { width: cols[7].width - 6, align: "right" });

          y += rowHeight;
        });
      }

      // Bottom border line of table
      doc.rect(40, y, 515, 1).stroke(borderColor);

      // ─── 4. Bottom Section: Anchored below the table ────────
      const bottomStartY = y + 14;

      // Construct dynamic summary rows
      const summaryRows: { label: string; value: string; isGreen?: boolean }[] = [
        { label: "Total Taxable Value:", value: formatINR(data.taxableAmountCents) },
        { label: "CGST (Intra-state):", value: formatINR(data.cgstCents) },
        { label: "SGST (Intra-state):", value: formatINR(data.sgstCents) },
      ];

      if (data.igstCents > 0) {
        summaryRows.push({ label: "IGST (Inter-state):", value: formatINR(data.igstCents) });
      }
      if (data.shippingFeeCents > 0) {
        summaryRows.push({ label: "Delivery Charges:", value: formatINR(data.shippingFeeCents) });
      }
      if (data.packagingFeeCents > 0) {
        summaryRows.push({ label: "Packaging Fee:", value: formatINR(data.packagingFeeCents) });
      }
      if (data.discountCents > 0) {
        summaryRows.push({ label: "Discount Applied:", value: `-${formatINR(data.discountCents)}`, isGreen: true });
      }

      const summaryContentHeight = 24 + summaryRows.length * 16 + 32;
      const summaryHeight = Math.max(148, summaryContentHeight);

      // Left Column Boxes
      const leftColWidth = 252;
      const termsHeight = 82;
      doc.rect(40, bottomStartY, leftColWidth, termsHeight).fillAndStroke("#FFFFFF", borderColor);
      doc.rect(40, bottomStartY, leftColWidth, 18).fillAndStroke("#F1F5F9", borderColor);
      doc.fillColor(primaryColor).fontSize(7.5).font("Helvetica-Bold").text("DECLARATION & TERMS", 48, bottomStartY + 5);

      doc.font("Helvetica").fontSize(6.5).fillColor(secondaryColor);
      const terms = [
        "1. All bakery and confectionery goods are fresh and handcrafted.",
        "2. Tax-inclusive reverse calculation as per GST Council guidelines.",
        "3. Perishable items carry a 24-hour replacement guarantee with photo proof.",
        "4. This is a computer-generated tax invoice and requires no physical signature.",
      ];
      terms.forEach((term, idx) => {
        doc.text(term, 48, bottomStartY + 23 + idx * 13, { width: leftColWidth - 16 });
      });

      // Signatory Box on Left (perfectly aligned with bottom of Summary)
      const sigY = bottomStartY + termsHeight + 8;
      const sigHeight = summaryHeight - termsHeight - 8;
      doc.rect(40, sigY, leftColWidth, sigHeight).fillAndStroke("#F8FAFC", borderColor);
      doc.fillColor(primaryColor).fontSize(7.5).font("Helvetica-Bold").text(
        `FOR ${(data.shopName || "RAJ TRADERS").toUpperCase()}`,
        48,
        sigY + 8
      );
      doc.fontSize(6.5).font("Helvetica").fillColor(secondaryColor);
      doc.text("Authorized Signatory (System Generated)", 48, sigY + 26);
      doc.fillColor("#94A3B8").text("Digital Tax Invoice under DPDP Act & GST Rule 46", 48, sigY + 38);

      // Right Column: Summary Box
      const rightColX = 303;
      const summaryWidth = 252;

      doc.rect(rightColX, bottomStartY, summaryWidth, summaryHeight).fillAndStroke("#FFFFFF", borderColor);
      doc.rect(rightColX, bottomStartY, summaryWidth, 18).fillAndStroke("#F1F5F9", borderColor);
      doc.fillColor(primaryColor).fontSize(7.5).font("Helvetica-Bold").text("TAX & AMOUNT SUMMARY", rightColX + 10, bottomStartY + 5);

      let curSummaryY = bottomStartY + 24;
      summaryRows.forEach((row) => {
        doc.font("Helvetica").fontSize(7.5).fillColor(secondaryColor);
        doc.text(row.label, rightColX + 10, curSummaryY, { width: 140, align: "left" });

        doc.font("Helvetica-Bold").fillColor(row.isGreen ? "#059669" : darkColor);
        doc.text(row.value, rightColX + 10, curSummaryY, { width: summaryWidth - 20, align: "right" });
        curSummaryY += 16;
      });

      // Grand Total Highlight Bar
      const grandTotalY = bottomStartY + summaryHeight - 26;
      doc.rect(rightColX + 1, grandTotalY, summaryWidth - 2, 25).fill(primaryColor);
      doc.fillColor("#FFFFFF").fontSize(8.5).font("Helvetica-Bold");
      doc.text("GRAND TOTAL (Incl. GST):", rightColX + 10, grandTotalY + 8, { width: 130, align: "left" });
      doc.fontSize(9.5).text(formatINR(data.totalCents), rightColX + 10, grandTotalY + 7, { width: summaryWidth - 20, align: "right" });

      // ─── 5. Footer Note ─────────────────────────────────────
      doc.moveTo(40, 785).lineTo(555, 785).stroke(lineDivider);
      doc.fillColor("#94A3B8").fontSize(7).font("Helvetica").text(
        `Thank you for shopping with ${data.shopName || "Raj Traders"}! For support, email ${data.contactEmail || "support@sundarvan.xyz"} or visit our Pali store.`,
        40,
        792,
        { width: 515, align: "center" }
      );

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
