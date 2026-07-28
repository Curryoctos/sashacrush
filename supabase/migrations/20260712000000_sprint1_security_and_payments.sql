-- Sprint 1: chat sender integrity
-- Sprint 2: payment confirmation + receipt creation RLS

DROP POLICY IF EXISTS "chat_messages_admin_agent_insert" ON public.chat_messages;

CREATE POLICY "chat_messages_admin_agent_insert"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(ARRAY['admin', 'agent'])
    AND sender_id = auth.uid()
  );

-- Admin/agent can confirm payments
CREATE POLICY "payments_admin_agent_update"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']))
  WITH CHECK (public.has_role(ARRAY['admin', 'agent']));

-- Admin/agent can create receipts when confirming payments
CREATE POLICY "receipts_admin_agent_insert"
  ON public.receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['admin', 'agent']));

-- Admin/agent can insert pending payments
CREATE POLICY "payments_admin_agent_insert"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['admin', 'agent']));
