-- C-24 Cargo & Import Tracker (CurryOctos)
-- Status: ordered → in_transit → at_port → cleared → delivered
-- Admin creates/updates; assigned agent views, uploads docs, approves stages.

CREATE TABLE public.cargo_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL,
  destination text NOT NULL,
  description text NOT NULL,
  expected_at date NOT NULL,
  status text NOT NULL DEFAULT 'ordered'
    CHECK (status IN ('ordered', 'in_transit', 'at_port', 'cleared', 'delivered')),
  assignee_id uuid REFERENCES public.users (id),
  created_by uuid NOT NULL REFERENCES public.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cargo_shipments_origin_nonempty CHECK (char_length(btrim(origin)) > 0),
  CONSTRAINT cargo_shipments_destination_nonempty CHECK (char_length(btrim(destination)) > 0),
  CONSTRAINT cargo_shipments_description_nonempty CHECK (char_length(btrim(description)) > 0)
);

CREATE INDEX cargo_shipments_assignee_id_idx ON public.cargo_shipments (assignee_id);
CREATE INDEX cargo_shipments_status_idx ON public.cargo_shipments (status);

CREATE TABLE public.cargo_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.cargo_shipments (id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.users (id),
  title text NOT NULL,
  file_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cargo_documents_title_nonempty CHECK (char_length(btrim(title)) > 0)
);

CREATE INDEX cargo_documents_shipment_id_idx ON public.cargo_documents (shipment_id);

CREATE TABLE public.cargo_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.cargo_shipments (id) ON DELETE CASCADE,
  stage text NOT NULL
    CHECK (stage IN ('ordered', 'in_transit', 'at_port', 'cleared', 'delivered')),
  approver_id uuid NOT NULL REFERENCES public.users (id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cargo_approvals_shipment_stage_unique UNIQUE (shipment_id, stage)
);

CREATE INDEX cargo_approvals_shipment_id_idx ON public.cargo_approvals (shipment_id);

COMMENT ON TABLE public.cargo_shipments IS
  'C-24 CurryOctos China→USA cargo shipments. Admin-managed; agent assignee collaborates.';
COMMENT ON TABLE public.cargo_documents IS
  'Import approval documents attached to a cargo shipment.';
COMMENT ON TABLE public.cargo_approvals IS
  'Stage approvals by assigned collaborator (timestamp + identity).';

ALTER TABLE public.cargo_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargo_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargo_approvals ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargo_shipments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.cargo_documents TO authenticated;
GRANT SELECT, INSERT ON public.cargo_approvals TO authenticated;

-- Shipments
CREATE POLICY "cargo_shipments_admin_all"
  ON public.cargo_shipments
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "cargo_shipments_agent_select_assigned"
  ON public.cargo_shipments
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'agent'
    AND assignee_id = auth.uid()
  );

-- Documents
CREATE POLICY "cargo_documents_admin_all"
  ON public.cargo_documents
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "cargo_documents_agent_select_assigned"
  ON public.cargo_documents
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'agent'
    AND EXISTS (
      SELECT 1 FROM public.cargo_shipments s
      WHERE s.id = shipment_id AND s.assignee_id = auth.uid()
    )
  );

CREATE POLICY "cargo_documents_agent_insert_assigned"
  ON public.cargo_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'agent'
    AND uploader_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cargo_shipments s
      WHERE s.id = shipment_id AND s.assignee_id = auth.uid()
    )
  );

-- Approvals
CREATE POLICY "cargo_approvals_admin_select"
  ON public.cargo_approvals
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "cargo_approvals_agent_select_assigned"
  ON public.cargo_approvals
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'agent'
    AND EXISTS (
      SELECT 1 FROM public.cargo_shipments s
      WHERE s.id = shipment_id AND s.assignee_id = auth.uid()
    )
  );

CREATE POLICY "cargo_approvals_agent_insert_assigned"
  ON public.cargo_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'agent'
    AND approver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cargo_shipments s
      WHERE s.id = shipment_id
        AND s.assignee_id = auth.uid()
        AND s.status = stage
    )
  );

CREATE OR REPLACE FUNCTION public.touch_cargo_shipments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER cargo_shipments_touch_updated_at
  BEFORE UPDATE ON public.cargo_shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_cargo_shipments_updated_at();

-- Private storage for cargo docs (25MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cargo',
  'cargo',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "cargo_storage_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'cargo'
    AND public.current_user_role() = 'admin'
  )
  WITH CHECK (
    bucket_id = 'cargo'
    AND public.current_user_role() = 'admin'
  );

CREATE POLICY "cargo_storage_agent_assigned"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'cargo'
    AND public.current_user_role() = 'agent'
    AND EXISTS (
      SELECT 1
      FROM public.cargo_documents d
      JOIN public.cargo_shipments s ON s.id = d.shipment_id
      WHERE d.file_path = storage.objects.name
        AND s.assignee_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'cargo'
    AND public.current_user_role() = 'agent'
    AND (storage.foldername(name))[1] IN (
      SELECT s.id::text
      FROM public.cargo_shipments s
      WHERE s.assignee_id = auth.uid()
    )
  );
