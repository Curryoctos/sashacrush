-- Fix PL/pgSQL variable shadowing column name in investment access gate.
-- Error: column reference "terms_version" is ambiguous (42702).

CREATE OR REPLACE FUNCTION public.agent_contribution_block_reason(p_agent_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_terms_version text := public.current_investment_terms_version();
  pending_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_agent_id
      AND u.role = 'agent'
      AND u.is_active = true
  ) THEN
    RETURN 'Only active agents can invest toward a deal.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.investor_consents c
    WHERE c.agent_id = p_agent_id
      AND c.terms_version = v_terms_version
  ) THEN
    RETURN 'Accept the investment terms and conditions before investing.';
  END IF;

  SELECT COUNT(*)::integer INTO pending_count
  FROM public.documents d
  WHERE d.investor_id = p_agent_id
    AND d.assigned_to = p_agent_id
    AND d.status = 'sent';

  IF pending_count > 0 THEN
    RETURN 'Sign all pending investment agreements before investing.';
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.agent_contribution_block_reason(uuid) IS
  'Returns a human-readable block reason for agent deal investments, or NULL if allowed.';
