-- pgTAP tests for public.format_invoice_display.
-- Run with: supabase test db
-- Mirrors src/lib/invoice-number.ts (formatInvoiceNumber) so the SQL and app
-- formatters can never diverge. The first case is the regression that produced
-- "N6" instead of "N62" for a user whose sequence length was 1.
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Regression: counter has more digits than length must NOT truncate.
select is(
  public.format_invoice_display('N', 1, '', 62),
  'N62',
  'counter longer than length is not truncated (was "N6")'
);

select is(
  public.format_invoice_display('N', 1, '', 61),
  'N61',
  'counter 61 with length 1 renders N61'
);

-- Parity with formatInvoiceNumber('INV-', 4, '', 7) => 'INV-0007'.
select is(
  public.format_invoice_display('INV-', 4, '', 7),
  'INV-0007',
  'pads counter to length and concatenates prefix'
);

-- Parity with formatInvoiceNumber('', 0, 'X', 42) => '42X' (minimum length 1).
select is(
  public.format_invoice_display('', 0, 'X', 42),
  '42X',
  'length 0 falls back to minimum length 1'
);

-- Parity with formatInvoiceDisplay(seq{ACME-,3,-FY}, 12) => 'ACME-012-FY'.
select is(
  public.format_invoice_display('ACME-', 3, '-FY', 12),
  'ACME-012-FY',
  'prefix, padded counter, and suffix concatenate'
);

-- Parity with formatInvoiceDisplay(null, 3) => '3' (null seq defaults).
select is(
  public.format_invoice_display(null, null, null, 3),
  '3',
  'null prefix/length/suffix default to empty and length 1'
);

-- The other production sequence (No., length 4): single digit still pads.
select is(
  public.format_invoice_display('No.', 4, '', 6),
  'No.0006',
  'single digit counter pads to length 4'
);

-- Exact-fit boundary: counter digit count equals length.
select is(
  public.format_invoice_display('', 3, '', 100),
  '100',
  'counter equal to length renders unchanged'
);

select * from finish();

rollback;
