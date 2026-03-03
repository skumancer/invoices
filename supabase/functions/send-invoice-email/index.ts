import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import { encodeBase64 } from "jsr:@std/encoding/base64";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const PDF_DESC_MAX_WIDTH = 75;
const PDF_LINE_HEIGHT = 1;
const TABLE_LEFT = 20;
const TABLE_RIGHT = 200;
const TABLE_PAD = 4;
const HEADER_ROW_HEIGHT = 4;
const COLS_X = [20, 120, 140, 170, 200] as const;

function formatPdfDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
}

function buildInvoicePdf(params: {
  invNumber: string;
  fromLabel: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  issueDate: string;
  dueDate: string;
  lines: { description: string; quantity: number; unit_price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  taxType: "fixed" | "percent" | null;
  taxValue: number;
}): Uint8Array {
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(18);
  doc.text("INVOICE", 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`#${params.invNumber}`, 20, y);
  y += 6;
  doc.text(`From: ${params.fromLabel}`, 20, y);
  y += 6;
  if (params.fromEmail) {
    doc.text(params.fromEmail, 20, y);
    y += 6;
  }
  y += 4;
  doc.text(`To: ${params.toName}`, 20, y);
  y += 6;
  if (params.toEmail) {
    doc.text(params.toEmail, 20, y);
    y += 6;
  }
  doc.text(`Issue: ${formatPdfDate(params.issueDate)}  Due: ${formatPdfDate(params.dueDate)}`, 20, y);
  y += 12;
  doc.setFontSize(10);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  const tableTopY = y - 4;
  doc.setFont("helvetica", "bold");
  doc.text("Description", TABLE_LEFT + TABLE_PAD, y);
  doc.text("Qty", 120 + TABLE_PAD, y);
  doc.text("Unit", 140 + TABLE_PAD, y);
  doc.text("Total", 170 + TABLE_PAD, y);
  doc.setFont("helvetica", "normal");
  const headerBottomY = y + HEADER_ROW_HEIGHT;
  doc.line(TABLE_LEFT, tableTopY, TABLE_RIGHT, tableTopY);
  doc.line(TABLE_LEFT, headerBottomY, TABLE_RIGHT, headerBottomY);
  y += HEADER_ROW_HEIGHT;
  for (const l of params.lines) {
    const descLines = doc.splitTextToSize(l.description, PDF_DESC_MAX_WIDTH);
    const lineTotal = l.quantity * l.unit_price;
    const rowContentY = y + TABLE_PAD;
    doc.text(descLines, TABLE_LEFT + TABLE_PAD, rowContentY);
    const descHeight = descLines.length * PDF_LINE_HEIGHT;
    doc.text(String(l.quantity), 120 + TABLE_PAD, rowContentY);
    doc.text(`$${Number(l.unit_price).toFixed(2)}`, 140 + TABLE_PAD, rowContentY);
    doc.text(`$${lineTotal.toFixed(2)}`, 170 + TABLE_PAD, rowContentY);
    const contentHeight = Math.max(descHeight, PDF_LINE_HEIGHT);
    const rowHeight = TABLE_PAD + contentHeight + TABLE_PAD;
    doc.line(TABLE_LEFT, y + rowHeight, TABLE_RIGHT, y + rowHeight);
    y += rowHeight;
  }
  const tableBottomY = y;
  for (let i = 0; i < COLS_X.length; i++) {
    doc.line(COLS_X[i], tableTopY, COLS_X[i], tableBottomY);
  }
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: $${params.subtotal.toFixed(2)}`, 140, y);
  y += 6;
  if (params.tax > 0) {
    const label = params.taxType === "percent" ? `Tax (${params.taxValue}%):` : "Tax:";
    doc.text(`${label} $${params.tax.toFixed(2)}`, 140, y);
    y += 6;
  }
  doc.setFont("helvetica", "bold");
  doc.text(`Total: $${params.total.toFixed(2)}`, 140, y);
  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}

interface ReqBody {
  invoiceId: string;
  to?: string;
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const body = (await req.json()) as ReqBody;
    const { invoiceId, to } = body;
    if (!invoiceId) {
      return jsonResponse({ error: "Invoice ID is required" }, 400);
    }
    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .select("*, customer:customers(*)")
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();
    if (invErr || !inv) {
      return jsonResponse({ error: "Invoice not found" }, 404);
    }
    const { data: profile } = await supabase.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle();
    const first = (profile as { first_name?: string | null } | null)?.first_name?.trim() ?? "";
    const last = (profile as { last_name?: string | null } | null)?.last_name?.trim() ?? "";
    const senderName = [first, last].filter(Boolean).join(" ") || user.email;
    const { data: lines } = await supabase.from("invoice_lines").select("*").eq("invoice_id", invoiceId).order("sort_order");
    const customer = (inv as { customer?: { email?: string; name?: string } }).customer;
    const toEmail = to ?? customer?.email;
    if (!toEmail) {
      return jsonResponse({ error: "No recipient email address" }, 400);
    }
    if (!RESEND_API_KEY) {
      return jsonResponse({ error: "Email service is not configured. Please contact support." }, 500);
    }
    const subtotal = (lines ?? []).reduce((s: number, l: { quantity: number; unit_price: number }) => s + l.quantity * l.unit_price, 0);
    const taxType = (inv as { tax_type?: "fixed" | "percent" | null }).tax_type ?? null;
    const taxValue = Number((inv as { tax_value?: number }).tax_value ?? 0);
    const tax = !taxType || taxValue === 0 ? 0 : taxType === "percent" ? (subtotal * taxValue) / 100 : taxValue;
    const total = subtotal + tax;
    const invNumber = String((inv as { number?: number }).number ?? "");
    const pdfBytes = buildInvoicePdf({
      invNumber,
      fromLabel: senderName || "—",
      fromEmail: user.email ?? "",
      toName: customer?.name ?? "—",
      toEmail: customer?.email ?? "",
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      lines: lines ?? [],
      subtotal,
      tax,
      total,
      taxType,
      taxValue,
    });
    const base64Pdf = encodeBase64(pdfBytes);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        subject: senderName ? `Invoice #${invNumber} - from ${senderName}` : `Invoice #${invNumber}`,
        html: `<p>Please find your invoice #${invNumber} attached.</p>`,
        attachments: [{ filename: `invoice-${invNumber}.pdf`, content: base64Pdf }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return jsonResponse({ error: data.message ?? "Email provider error. Please try again later." }, 502);
    }
    return jsonResponse({ message: "Email sent.", id: data.id }, 200);
  } catch (e) {
    return jsonResponse({ error: "An unexpected error occurred. Please try again." }, 500);
  }
});
