export type CargoStatus =
  | 'ordered'
  | 'in_transit'
  | 'at_port'
  | 'cleared'
  | 'delivered'

export const CARGO_STATUSES: CargoStatus[] = [
  'ordered',
  'in_transit',
  'at_port',
  'cleared',
  'delivered',
]

export const CARGO_STATUS_LABEL: Record<CargoStatus, string> = {
  ordered: 'Ordered',
  in_transit: 'In transit',
  at_port: 'At port',
  cleared: 'Cleared',
  delivered: 'Delivered',
}

export const CARGO_BUCKET = 'cargo'
export const MAX_CARGO_DOC_BYTES = 26_214_400 // 25MB
export const CARGO_DOC_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export interface CargoShipment {
  id: string
  origin: string
  destination: string
  description: string
  expected_at: string
  status: CargoStatus
  assignee_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CargoShipmentWithMeta extends CargoShipment {
  assignee_name: string | null
  assignee_email: string | null
  approved_stages: CargoStatus[]
}

export interface CargoDocument {
  id: string
  shipment_id: string
  uploader_id: string
  title: string
  file_path: string
  mime_type: string
  size_bytes: number
  created_at: string
  signed_url?: string | null
}

export interface CargoApproval {
  id: string
  shipment_id: string
  stage: CargoStatus
  approver_id: string
  note: string | null
  created_at: string
}

export const CARGO_SHIPMENT_COLUMNS =
  'id, origin, destination, description, expected_at, status, assignee_id, created_by, created_at, updated_at'

export const CARGO_DOCUMENT_COLUMNS =
  'id, shipment_id, uploader_id, title, file_path, mime_type, size_bytes, created_at'

export const CARGO_APPROVAL_COLUMNS =
  'id, shipment_id, stage, approver_id, note, created_at'
