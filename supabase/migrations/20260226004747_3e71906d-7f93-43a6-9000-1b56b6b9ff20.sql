
-- Add SMTP/POP email configuration columns to empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS email_smtp_host text,
  ADD COLUMN IF NOT EXISTS email_smtp_port integer DEFAULT 587,
  ADD COLUMN IF NOT EXISTS email_smtp_user text,
  ADD COLUMN IF NOT EXISTS email_smtp_password text,
  ADD COLUMN IF NOT EXISTS email_smtp_ssl boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_pop_host text,
  ADD COLUMN IF NOT EXISTS email_pop_port integer DEFAULT 995,
  ADD COLUMN IF NOT EXISTS email_pop_user text,
  ADD COLUMN IF NOT EXISTS email_pop_password text,
  ADD COLUMN IF NOT EXISTS email_pop_ssl boolean DEFAULT true;
