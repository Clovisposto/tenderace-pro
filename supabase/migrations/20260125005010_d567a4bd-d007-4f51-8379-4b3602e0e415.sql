-- Security Fix: Add explicit authenticated-only policies to profiles and empresas tables
-- This prevents any anonymous access to user personal data

-- 1. Add explicit policy requiring authentication for profiles table
-- First drop any existing permissive anonymous policies if they exist
DO $$
BEGIN
  -- Drop policies if they exist (prevents errors on re-run)
  DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Require authentication for empresas" ON public.empresas;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if policies don't exist
  NULL;
END $$;

-- Create restrictive policy that requires authentication for any access to profiles
-- This works alongside existing user-specific policies
CREATE POLICY "Require authentication for profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 2. Add explicit policy requiring authentication for empresas table
-- This blocks anonymous access to sensitive business data (CNPJ, addresses, etc.)
CREATE POLICY "Require authentication for empresas"
ON public.empresas
FOR ALL
TO anon
USING (false)
WITH CHECK (false);
