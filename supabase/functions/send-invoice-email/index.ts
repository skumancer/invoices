import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

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
    return new Response(null, { headers: corsHeaders });
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
    const invNumber = (inv as { number?: number }).number ?? "";
    const rows = (lines ?? [])
      .map((l: { description: string; quantity: number; unit_price: number }) =>
        `<tr><td>${l.description}</td><td>${l.quantity}</td><td>$${Number(l.unit_price).toFixed(2)}</td><td>$${(l.quantity * l.unit_price).toFixed(2)}</td></tr>`
      )
      .join("");
    const taxRow = tax > 0
      ? `<p>${taxType === "percent" ? `Tax (${taxValue}%):` : "Tax:"} $${tax.toFixed(2)}</p>`
      : "";
    const html = `
      <h2>Invoice #${invNumber}</h2>
      <p>To: ${customer?.name ?? "—"}</p>
      <p>Issue: ${inv.issue_date} | Due: ${inv.due_date}</p>
      <table border="1" cellpadding="8" style="border-collapse:collapse">
        <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Subtotal: $${subtotal.toFixed(2)}</p>
      ${taxRow}
      <p><strong>Total: $${total.toFixed(2)}</strong></p>
    `;
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
        html,
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
