-- Add HTML content support for contract ingestion records and stored contracts
alter table if exists public.contract_ingestions
  add column if not exists extracted_html text;

alter table if exists public.contracts
  add column if not exists content_html text;
