import { z } from 'zod'

/** Line item; matches DB invoice_lines + optional catalog link. */
export const invoiceDraftLineSchema = z.object({
  invoice_item_id: z.uuid().nullable().describe('Saved catalog invoice_item id from context when the line matches; otherwise null'),
  description: z.string().min(1).describe('Line description on the invoice'),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
})

export const invoiceDraftSchema = z.object({
  customer_id: z.uuid().nullable().describe('Customer id from context when clearly matched; null if unknown or ambiguous'),
  customer_name: z.string().describe('Customer display name (resolved or as stated by the user)'),
  issue_date: z.iso.date().describe('Issue date (ISO calendar date)'),
  due_date: z.iso.date().describe('Due date (ISO calendar date)'),
  lines: z.array(invoiceDraftLineSchema).min(1),
})

/**
 * Single structured response: conversational text + optional draft.
 * Put `reply` before `draft` so providers that stream JSON in schema key order surface the message first
 * (see [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)).
 */
export const assistantResponseSchema = z.object({
  reply: z.string().describe('What you say to the user in chat (brief, helpful)'),
  draft: invoiceDraftSchema.nullable().describe('Full invoice draft when ready; null if you need more information first'),
})

export type InvoiceDraftLine = z.infer<typeof invoiceDraftLineSchema>
export type InvoiceDraft = z.infer<typeof invoiceDraftSchema>
export type AssistantResponse = z.infer<typeof assistantResponseSchema>
