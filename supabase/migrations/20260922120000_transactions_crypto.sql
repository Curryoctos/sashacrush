-- C-16: store on-chain tx details after owner signs in their wallet.
-- Private keys never touch SashaCrush; only public address + tx_hash are stored.

CREATE TABLE public.transactions_crypto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments (id) ON DELETE SET NULL,
  wallet_address text NOT NULL,
  crypto_type text NOT NULL CHECK (crypto_type IN ('ETH', 'USDT', 'BTC', 'WBTC', 'other')),
  crypto_amount numeric NOT NULL CHECK (crypto_amount > 0),
  usd_rate numeric,
  ugx_rate numeric,
  tx_hash text NOT NULL,
  chain_id integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'confirmed', 'failed')),
  created_by uuid NOT NULL REFERENCES public.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_crypto_tx_hash_unique UNIQUE (tx_hash)
);

CREATE INDEX transactions_crypto_payment_id_idx
  ON public.transactions_crypto (payment_id);
CREATE INDEX transactions_crypto_created_by_idx
  ON public.transactions_crypto (created_by);
CREATE INDEX transactions_crypto_created_at_idx
  ON public.transactions_crypto (created_at DESC);

COMMENT ON TABLE public.transactions_crypto IS
  'Owner-signed blockchain txs. Keys stay on device; server stores address + hash only.';

ALTER TABLE public.transactions_crypto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_crypto_admin_select"
  ON public.transactions_crypto
  FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['admin']));

CREATE POLICY "transactions_crypto_admin_insert"
  ON public.transactions_crypto
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(ARRAY['admin'])
    AND created_by = auth.uid()
  );

CREATE POLICY "transactions_crypto_admin_update"
  ON public.transactions_crypto
  FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));

GRANT SELECT, INSERT, UPDATE ON public.transactions_crypto TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.transactions_crypto TO service_role;
