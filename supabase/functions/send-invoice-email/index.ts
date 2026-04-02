import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding/base64";
import { buildInvoicePdf } from "../_shared/invoice-pdf.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function formatPdfDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
}

const MAX_MESSAGE_LENGTH = 10_000;

interface ReqBody {
  invoiceId: string;
  to?: string;
  message?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainTextToEmailHtml(text: string, invNumber: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return `<p>Please find your invoice ${escapeHtml(invNumber)} attached.</p>`;
  }
  const escaped = escapeHtml(trimmed);
  const withBreaks = escaped.replace(/\r\n|\r|\n/g, "<br>");
  return `<p>${withBreaks}</p>`;
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

    if (!RESEND_API_KEY) {
      return jsonResponse({ error: "Email service is not configured. Please contact support." }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json()) as ReqBody;
    const { invoiceId, to, message } = body;
    if (!invoiceId) {
      return jsonResponse({ error: "Invoice ID is required" }, 400);
    }

    if (typeof message === "string" && message.length > MAX_MESSAGE_LENGTH) {
      return jsonResponse({ error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` }, 400);
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

    const { data: profile } = await supabase.from("profiles").select("first_name, last_name, tax_id").eq("id", user.id).maybeSingle();
    const first = (profile as { first_name?: string | null } | null)?.first_name?.trim() ?? "";
    const last = (profile as { last_name?: string | null } | null)?.last_name?.trim() ?? "";
    const senderName = [first, last].filter(Boolean).join(" ") || user.email;

    const { data: lines } = await supabase.from("invoice_lines").select("*").eq("invoice_id", invoiceId).order("sort_order");
    const customer = (inv as { customer?: { email?: string; name?: string; tax_id?: string | null } }).customer;

    if (!customer) {
      return jsonResponse({ error: "Customer not found" }, 404);
    }

    const toEmail = to ?? customer.email;
    if (!toEmail) {
      return jsonResponse({ error: "No recipient email address" }, 400);
    }

    const subtotal = (lines ?? []).reduce((s: number, l: { quantity: number; unit_price: number }) => s + l.quantity * l.unit_price, 0);
    const taxType = (inv as { tax_type?: "fixed" | "percent" | null }).tax_type ?? null;
    const taxValue = Number((inv as { tax_value?: number }).tax_value ?? 0);
    const tax = !taxType || taxValue === 0 ? 0 : taxType === "percent" ? (subtotal * taxValue) / 100 : taxValue;
    const total = subtotal + tax;
    const invNumber = (inv as { number_display?: string | null; number?: number }).number_display ?? String((inv as { number?: number }).number ?? "");
    const fromTaxId = (profile as { tax_id?: string | null } | null)?.tax_id?.trim() || null;
    const toTaxId = customer?.tax_id?.trim() || null;
    const pdfBytes = buildInvoicePdf({
      invNumber,
      fromLabel: senderName,
      fromEmail: user.email,
      fromTaxId: fromTaxId || null,
      toName: customer.name,
      toEmail: customer.email,
      toTaxId: toTaxId || null,
      issueDate: formatPdfDate(inv.issue_date),
      dueDate: formatPdfDate(inv.due_date),
      lines: lines ?? [],
      subtotal,
      tax,
      total,
      taxType,
      taxValue,
    });

    const base64Pdf = encodeBase64(pdfBytes);
    const messageText = typeof message === "string" ? message : "";
    const htmlBody = plainTextToEmailHtml(messageText, invNumber);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        reply_to: user.email,
        subject: `Invoice ${invNumber} - from ${senderName}`,
        html: htmlBody,
        attachments: [{ filename: `invoice-${invNumber}.pdf`, content: base64Pdf }],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return jsonResponse({ error: data.message ?? "Email provider error. Please try again later." }, 502);
    }

    return jsonResponse({ message: "Email sent.", id: data.id }, 200);
  } catch {
    return jsonResponse({ error: "An unexpected error occurred. Please try again." }, 500);
  }
});
