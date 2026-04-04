import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  convertToModelMessages,
  Output,
  streamText,
  validateUIMessages,
  zodSchema,
} from "npm:ai@6";
import { createGoogleGenerativeAI } from "npm:@ai-sdk/google@3";
import { z } from "npm:zod@4";

/**
 * SYNC with src/lib/invoice-assistant-schema.ts — duplicate required for Deno deploy
 * (Vite client imports the src file; Edge cannot bundle from ../src).
 */
const invoiceDraftLineSchema = z.object({
  invoice_item_id: z.uuid().nullable().describe("Saved catalog invoice_item id from context when the line matches; otherwise null"),
  description: z.string().min(1).describe("Line description on the invoice"),
  quantity: z.number().positive().describe("Line quantity"),
  unit_price: z.number().min(0).describe("Line unit price"),
});

const invoiceDraftSchema = z.object({
  customer_id: z.uuid().nullable().describe("Customer id from context when clearly matched; null if unknown or ambiguous"),
  customer_name: z.string().describe("Customer display name (resolved or as stated by the user)"),
  issue_date: z.iso.date().describe("Issue date (ISO calendar date)"),
  due_date: z.iso.date().describe("Due date (ISO calendar date)"),
  lines: z.array(invoiceDraftLineSchema).min(1),
});

const assistantResponseSchema = z.object({
  reply: z.string().describe("What you say to the user in chat (brief, helpful)"),
  draft: invoiceDraftSchema
    .nullable()
    .describe("Full invoice draft when ready; null if you need more information first"),
});

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const CONTEXT_LIMIT = 100;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  const googleApiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
  if (!googleApiKey) {
    return jsonError("AI is not configured", 500);
  }

  const googleModel = createGoogleGenerativeAI({ apiKey: googleApiKey });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonError("Missing Authorization", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);
  const jwt = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !user) {
    return jsonError("Unauthorized", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages)) {
    return jsonError("messages array required", 400);
  }

  const [{ data: customerRows }, { data: itemRows }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(CONTEXT_LIMIT),
    supabase
      .from("invoice_items")
      .select("id, name, description, unit_price")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(CONTEXT_LIMIT),
  ]);

  const customers = customerRows ?? [];
  const items = itemRows ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const dueDefault = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const system = `You help users draft invoices. You MUST respond with a single JSON object matching the schema (reply + draft). Use structured fields only — no markdown outside "reply".

Today is ${today}. If the user does not specify dates, use issue_date=${today} and due_date=${dueDefault}.

Customers (JSON array; set customer_id only from this list when clearly matched): ${JSON.stringify(customers)}

Saved catalog items (JSON array; set invoice_item_id when a line clearly matches one): ${JSON.stringify(items)}

Rules:
- Match customers and items by name (case-insensitive; partial match only if unambiguous).
- If no customer matches, set customer_id to null and set customer_name from the user's text.
- Every line needs a non-empty description and positive quantity.
- Prefer catalog unit_price when invoice_item_id is set unless the user gave a different price.
- If you need more detail, set draft to null and ask in "reply".
- Only discuss invoice creation.`;

  try {
    const validated = await validateUIMessages({
      messages: rawMessages,
    });
    const modelMessages = await convertToModelMessages(validated);

    const result = streamText({
      model: googleModel("gemini-2.5-flash"),
      system,
      messages: modelMessages,
      output: Output.object({
        schema: zodSchema(assistantResponseSchema),
        name: "AssistantResponse",
        description: "Chat reply and invoice draft (Gemini JSON / structured output)",
      }),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: assistantResponseSchema,
      },
    });

    console.log(result.text);

    return result.toUIMessageStreamResponse({
      headers: corsHeaders,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    return jsonError(msg, 500);
  }
});
