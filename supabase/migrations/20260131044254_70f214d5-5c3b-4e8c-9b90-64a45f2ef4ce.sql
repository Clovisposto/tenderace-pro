-- =====================================================
-- SECURITY FIX: Complete RLS hardening for all tables
-- =====================================================

-- 1. FIX: historico_disputas - Add UPDATE/DELETE protection
-- Users should NOT be able to modify or delete bid history
CREATE POLICY "historico_disputas_no_update"
ON public.historico_disputas
FOR UPDATE
USING (false);

CREATE POLICY "historico_disputas_no_delete"
ON public.historico_disputas
FOR DELETE
USING (false);

-- 2. FIX: logs_auditoria - Complete protection for audit logs
-- Only service role can insert (via triggers), users cannot modify
CREATE POLICY "audit_logs_insert_service_only"
ON public.logs_auditoria
FOR INSERT
WITH CHECK (false);

CREATE POLICY "audit_logs_no_update"
ON public.logs_auditoria
FOR UPDATE
USING (false);

CREATE POLICY "audit_logs_no_delete"
ON public.logs_auditoria
FOR DELETE
USING (false);

-- 3. FIX: user_roles - Prevent privilege escalation
-- Only admins can manage roles, regular users cannot modify
CREATE POLICY "user_roles_insert_admin_only"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_update_admin_only"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_delete_admin_only"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 4. FIX: compliance_empresas - Ensure users only see their own company data
-- Drop existing overly permissive policies if any and add strict ones
DROP POLICY IF EXISTS "Usuários podem ver compliance de suas empresas" ON public.compliance_empresas;

CREATE POLICY "compliance_own_companies_only"
ON public.compliance_empresas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = compliance_empresas.empresa_id
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "compliance_insert_own_companies"
ON public.compliance_empresas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = empresa_id
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "compliance_update_own_companies"
ON public.compliance_empresas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = compliance_empresas.empresa_id
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "compliance_delete_own_companies"
ON public.compliance_empresas
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = compliance_empresas.empresa_id
    AND e.user_id = auth.uid()
  )
);