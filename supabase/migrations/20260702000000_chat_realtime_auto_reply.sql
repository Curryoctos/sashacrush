-- Realtime + secure auto-reply RPC for seller_channel

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

CREATE OR REPLACE FUNCTION public.send_chat_auto_reply(
  p_land_id uuid,
  p_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
BEGIN
  IF public.current_user_role() <> 'seller' THEN
    RAISE EXCEPTION 'Auto-reply is only available for land owners';
  END IF;

  IF NOT public.is_seller_of_land(p_land_id) THEN
    RAISE EXCEPTION 'Not authorized for this land record';
  END IF;

  SELECT id INTO admin_id
  FROM public.users
  WHERE role = 'admin'
  ORDER BY created_at
  LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user configured';
  END IF;

  INSERT INTO public.chat_messages (channel, land_id, sender_id, body)
  VALUES ('seller_channel', p_land_id, admin_id, p_body);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_chat_auto_reply(uuid, text) TO authenticated;
