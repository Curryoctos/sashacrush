-- C-21: executive_channel is Admin + Executive only (agents keep seller_channel).

DROP POLICY IF EXISTS "chat_messages_admin_agent_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_admin_agent_insert" ON public.chat_messages;

CREATE POLICY "chat_messages_admin_select"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "chat_messages_admin_insert"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'admin'
    AND sender_id = auth.uid()
  );

CREATE POLICY "chat_messages_agent_select_seller_channel"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'agent'
    AND channel = 'seller_channel'
  );

CREATE POLICY "chat_messages_agent_insert_seller_channel"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'agent'
    AND channel = 'seller_channel'
    AND sender_id = auth.uid()
  );

-- Belt-and-suspenders: agents never read/write executive_channel.
CREATE POLICY "chat_messages_block_agent_executive_channel_select"
  ON public.chat_messages
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    NOT (
      public.current_user_role() = 'agent'
      AND channel = 'executive_channel'
    )
  );

CREATE POLICY "chat_messages_block_agent_executive_channel_insert"
  ON public.chat_messages
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT (
      public.current_user_role() = 'agent'
      AND channel = 'executive_channel'
    )
  );
