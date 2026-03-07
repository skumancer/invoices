import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const PAGE_WIDTH = 210;
const TABLE_WIDTH = 180;

export interface BuildInvoicePdfParams {
  invNumber: string;
  fromLabel: string;
  fromEmail: string;
  fromTaxId: string | null;
  toName: string;
  toEmail: string;
  toTaxId: string | null;
  /** Preformatted issue date string (e.g. from formatDate or toLocaleDateString) */
  issueDate: string;
  /** Preformatted due date string */
  dueDate: string;
  lines: { description: string; quantity: number; unit_price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  taxType: "fixed" | "percent" | null;
  taxValue: number;
}

/**
 * Build invoice PDF as bytes. Callers must pass preformatted issueDate and dueDate.
 * Shared by the send-invoice-email edge function and the frontend PDF download.
 */
export function buildInvoicePdf(params: BuildInvoicePdfParams): Uint8Array {
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(18);
  doc.text("INVOICE", MARGIN_LEFT, y);
  doc.setFontSize(16);
  doc.text(`#${params.invNumber}`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: "right" });
  doc.setFontSize(10);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text(`From: ${params.fromLabel}`, MARGIN_LEFT, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  if (params.fromEmail) {
    doc.text(params.fromEmail, MARGIN_LEFT, y);
    y += 6;
  }
  if (params.fromTaxId) {
    doc.text(`Tax ID: ${params.fromTaxId}`, MARGIN_LEFT, y);
    y += 6;
  }
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(`To: ${params.toName}`, MARGIN_LEFT, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  if (params.toEmail) {
    doc.text(params.toEmail, MARGIN_LEFT, y);
    y += 6;
  }
  if (params.toTaxId) {
    doc.text(`Tax ID: ${params.toTaxId}`, MARGIN_LEFT, y);
    y += 6;
  }
  doc.text(`Issue: ${params.issueDate}  Due: ${params.dueDate}`, MARGIN_LEFT, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_LEFT },
    tableWidth: TABLE_WIDTH,
    head: [["Description", "Qty", "Unit", "Total"]],
    body: params.lines.map((l) => [
      l.description,
      String(l.quantity),
      `$${Number(l.unit_price).toFixed(2)}`,
      `$${(l.quantity * l.unit_price).toFixed(2)}`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [200, 200, 200], fontStyle: "bold" },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    styles: { fontSize: 10 },
    didParseCell: (data) => {
      if (data.section === "head")
        switch (data.column.index) {
          case 1:
            data.cell.styles.halign = "center";
            break;
          case 2:
            data.cell.styles.halign = "right";
            break;
          case 3:
            data.cell.styles.halign = "right";
            break;
          default:
            data.cell.styles.halign = "left";
            break;
        }
    },
  });

  y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 8;
  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: $${params.subtotal.toFixed(2)}`, MARGIN_LEFT + TABLE_WIDTH - 30, y);
  y += 6;
  if (params.tax > 0) {
    const label = params.taxType === "percent" ? `Tax (${params.taxValue}%):` : "Tax:";
    doc.text(`${label} $${params.tax.toFixed(2)}`, MARGIN_LEFT + TABLE_WIDTH - 30, y);
    y += 6;
  }
  doc.setFont("helvetica", "bold");
  doc.text(`Total: $${params.total.toFixed(2)}`, MARGIN_LEFT + TABLE_WIDTH - 30, y);
  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}
