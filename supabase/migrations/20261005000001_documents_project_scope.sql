-- Allow project-scoped documents (land_id and investor_id both null when project_id set).
-- Previous check only allowed land XOR investor, which blocked project library uploads.

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_scope_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_scope_check CHECK (
    -- Classic deal document
    (land_id IS NOT NULL AND investor_id IS NULL)
    -- Investor / capital agreement
    OR (investor_id IS NOT NULL AND land_id IS NULL)
    -- Funding-project document (land optional for land_acquisition linkage)
    OR (project_id IS NOT NULL AND investor_id IS NULL)
  );

COMMENT ON CONSTRAINT documents_scope_check ON public.documents IS
  'Documents must be scoped to a land deal, an investor agreement, or a funding project.';
