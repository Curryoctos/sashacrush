-- Allow investors to abandon their own unfinished Stripe Checkout rows.

CREATE POLICY "investments_executive_cancel_own_stripe"
  ON public.investments
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'executive'
    AND executive_id = auth.uid()
    AND status = 'pending'
    AND method = 'stripe'
  )
  WITH CHECK (
    public.current_user_role() = 'executive'
    AND executive_id = auth.uid()
    AND status = 'rejected'
    AND method = 'stripe'
    AND rejection_reason IS NOT NULL
  );
