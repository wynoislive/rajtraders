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
  invoiceDate: Date;
  paymentId?: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerMobile?: string;
  shippingAddress: string;
  items: InvoiceItem[];
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

function formatINR(cents: number): string {
  return "₹" + (cents / 100).toFixed(2);
}

/**
 * Generates an official GST Tax Invoice as a vector PDF Buffer.
 */
export function generateTaxInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: `Tax Invoice - ${data.invoiceNumber}`,
          Author: data.shopName,
          Subject: `Order Tax Invoice ${data.orderId}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const primaryColor = "#1e293b";
      const secondaryColor = "#475569";
      const accentColor = "#e11d48";
      const lightBg = "#f8fafc";
      const borderColor = "#cbd5e1";

      // --- Header Banner ---
      doc.rect(40, 40, 515, 60).fill(lightBg);
      doc.rect(40, 40, 515, 60).stroke(borderColor);

      doc.fillColor(primaryColor).fontSize(16).font("Helvetica-Bold").text(data.shopName.toUpperCase(), 55, 52);
      doc.fontSize(8).font("Helvetica").fillColor(secondaryColor);
      doc.text(data.legalBusinessName ? `(${data.legalBusinessName})` : "", 55, 72);
      doc.text(`${data.shopAddress} | State: ${data.stateName} (${data.stateCode})`, 55, 83);

      doc.fontSize(14).font("Helvetica-Bold").fillColor(accentColor).text("TAX INVOICE", 400, 52, { align: "right" });
      doc.fontSize(8).font("Helvetica").fillColor(secondaryColor);
      doc.text(`GSTIN: ${data.gstinNumber || "N/A"}`, 400, 72, { align: "right" });
      doc.text(`PAN: ${data.panNumber || "N/A"}`, 400, 83, { align: "right" });

      doc.moveDown(2);

      // --- Invoice & Customer Metadata Box ---
      let y = 115;
      doc.rect(40, y, 250, 85).stroke(borderColor);
      doc.rect(305, y, 250, 85).stroke(borderColor);

      // Left Box: Billed To / Shipped To
      doc.fillColor(primaryColor).fontSize(9).font("Helvetica-Bold").text("BILLED TO / SHIP TO:", 50, y + 8);
      doc.fontSize(8).font("Helvetica").fillColor(secondaryColor);
      doc.text(`Name: ${data.customerName || "Valued Customer"}`, 50, y + 23);
      doc.text(`Phone: ${data.customerMobile || "N/A"}`, 50, y + 35);
      doc.text(`Email: ${data.customerEmail || "N/A"}`, 50, y + 47);
      doc.text(`Address: ${data.shippingAddress || "Local Store Pickup"}`, 50, y + 59, { width: 230, height: 25 });

      // Right Box: Invoice Meta
      doc.fillColor(primaryColor).fontSize(9).font("Helvetica-Bold").text("INVOICE DETAILS:", 315, y + 8);
      doc.fontSize(8).font("Helvetica").fillColor(secondaryColor);
      doc.text(`Invoice No: ${data.invoiceNumber}`, 315, y + 23);
      doc.text(`Invoice Date: ${data.invoiceDate.toLocaleDateString("en-IN", { dateStyle: "medium" })}`, 315, y + 35);
      doc.text(`Order ID: #${data.orderId.slice(0, 8).toUpperCase()}`, 315, y + 47);
      doc.text(`Payment: ${data.paymentMethod} ${data.paymentId ? `(${data.paymentId.slice(0, 14)}...)` : ""}`, 315, y + 59);

      // --- Items Table Header ---
      y = 215;
      const col = {
        sn: 45,
        desc: 75,
        hsn: 240,
        qty: 290,
        rate: 330,
        taxable: 390,
        gst: 455,
        total: 505,
      };

      doc.rect(40, y, 515, 20).fill(lightBg);
      doc.rect(40, y, 515, 20).stroke(borderColor);

      doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold");
      doc.text("#", col.sn, y + 6);
      doc.text("Item Description", col.desc, y + 6);
      doc.text("HSN", col.hsn, y + 6);
      doc.text("Qty", col.qty, y + 6);
      doc.text("MRP", col.rate, y + 6);
      doc.text("Taxable", col.taxable, y + 6);
      doc.text("GST", col.gst, y + 6);
      doc.text("Total", col.total, y + 6);

      // --- Items Table Rows ---
      y += 20;
      doc.font("Helvetica").fontSize(8);

      data.items.forEach((item, index) => {
        const itemGstRate = item.gstRatePercentage || 5;
        const totalItemGross = item.priceCents * item.quantity;
        const itemTaxable = Math.round(totalItemGross / (1 + itemGstRate / 100));
        const itemGst = totalItemGross - itemTaxable;

        doc.rect(40, y, 515, 22).stroke(borderColor);
        doc.fillColor(primaryColor);
        doc.text(String(index + 1), col.sn, y + 7);
        doc.text(item.name.slice(0, 30), col.desc, y + 7);
        doc.text(item.hsnCode || "1905", col.hsn, y + 7);
        doc.text(String(item.quantity), col.qty, y + 7);
        doc.text(formatINR(item.priceCents), col.rate, y + 7);
        doc.text(formatINR(itemTaxable), col.taxable, y + 7);
        doc.text(`${itemGstRate}% (${formatINR(itemGst)})`, col.gst, y + 7);
        doc.text(formatINR(totalItemGross), col.total, y + 7);

        y += 22;
      });

      // --- Tax Summary & Grand Total Block ---
      y += 10;
      const summaryLeft = 320;
      const summaryWidth = 235;

      doc.rect(summaryLeft, y, summaryWidth, 140).stroke(borderColor);

      const addSummaryRow = (label: string, value: string, isBold = false, isAccent = false) => {
        doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(isBold ? 9 : 8);
        doc.fillColor(isAccent ? accentColor : primaryColor);
        doc.text(label, summaryLeft + 10, y + 8);
        doc.text(value, summaryLeft + summaryWidth - 10, y + 8, { align: "right" });
        y += 16;
      };

      addSummaryRow("Total Taxable Value:", formatINR(data.taxableAmountCents));
      addSummaryRow(`CGST (Intra-state):`, formatINR(data.cgstCents));
      addSummaryRow(`SGST (Intra-state):`, formatINR(data.sgstCents));
      if (data.igstCents > 0) {
        addSummaryRow(`IGST (Inter-state):`, formatINR(data.igstCents));
      }
      if (data.shippingFeeCents > 0) {
        addSummaryRow("Delivery Charges:", formatINR(data.shippingFeeCents));
      }
      if (data.packagingFeeCents > 0) {
        addSummaryRow("Packaging Fee:", formatINR(data.packagingFeeCents));
      }
      if (data.discountCents > 0) {
        addSummaryRow("Discount Applied:", `-${formatINR(data.discountCents)}`, false, true);
      }

      doc.rect(summaryLeft, y + 2, summaryWidth, 1).stroke(borderColor);
      y += 6;
      addSummaryRow("GRAND TOTAL (Incl. GST):", formatINR(data.totalCents), true);

      // --- Left Column Notes & Declarations ---
      const notesY = y - 100;
      doc.font("Helvetica-Bold").fontSize(8).fillColor(primaryColor).text("DECLARATION & TERMS:", 45, notesY);
      doc.font("Helvetica").fontSize(7).fillColor(secondaryColor);
      doc.text("1. All bakery and confectionery goods are fresh and handcrafted.", 45, notesY + 14);
      doc.text("2. Tax-inclusive reverse calculation as per GST Council guidelines.", 45, notesY + 24);
      doc.text("3. Perishable items carry a 24-hour replacement guarantee with photo proof.", 45, notesY + 34);
      doc.text("4. This is a computer-generated tax invoice and requires no physical signature.", 45, notesY + 44);

      // Authorized Signatory Box
      doc.rect(40, notesY + 65, 230, 45).stroke(borderColor);
      doc.font("Helvetica-Bold").fontSize(7).fillColor(primaryColor).text(`For ${data.shopName.toUpperCase()}`, 50, notesY + 70);
      doc.font("Helvetica").fontSize(7).fillColor(secondaryColor).text("Authorized Signatory (System Generated)", 50, notesY + 95);

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
