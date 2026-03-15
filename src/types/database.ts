export type CustomerType = 'company' | 'person'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled'

export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  tax_id: string | null
  created_at: string
  updated_at: string
}
export type RecurrenceUnit = 'days' | 'weeks' | 'months' | 'years'

export interface Customer {
  id: string
  user_id: string
  name: string
  type: CustomerType
  email: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  user_id: string
  name: string
  description: string | null
  unit_price: number
  created_at: string
}

export type TaxType = 'fixed' | 'percent' | null

export interface InvoiceSequence {
  user_id: string
  prefix: string
  suffix: string
  length: number
  counter: number
}

export interface Invoice {
  id: string
  user_id: string
  customer_id: string
  status: InvoiceStatus
  number: number
  number_display: string | null
  issue_date: string
  due_date: string
  is_recurring: boolean
  recurrence_every: number | null
  recurrence_unit: RecurrenceUnit | null
  next_recurrence_at: string | null
  tax_type: TaxType
  tax_value: number
  created_at: string
  updated_at: string
}

export interface InvoiceLine {
  id: string
  invoice_id: string
  invoice_item_id: string | null
  description: string
  quantity: number
  unit_price: number
  sort_order: number
}

export interface InvoiceWithDetails extends Invoice {
  customer: Customer | null
  lines: (InvoiceLine & { total: number })[]
}
