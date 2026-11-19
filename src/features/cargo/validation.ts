import {
  CARGO_STATUSES,
  MAX_CARGO_DOC_BYTES,
  CARGO_DOC_MIME_TYPES,
  type CargoStatus,
} from '@/types/cargo'

export interface CreateCargoShipmentInput {
  origin: string
  destination: string
  description: string
  expectedAt: string
  assigneeId?: string | null
}

export function validateCreateCargoShipment(input: CreateCargoShipmentInput): string | null {
  if (!input.origin.trim()) {
    return 'Origin is required.'
  }
  if (!input.destination.trim()) {
    return 'Destination is required.'
  }
  if (!input.description.trim()) {
    return 'Cargo description is required.'
  }
  if (!input.expectedAt) {
    return 'Expected date is required.'
  }
  const expected = Date.parse(input.expectedAt)
  if (!Number.isFinite(expected)) {
    return 'Expected date is invalid.'
  }
  return null
}

export function adminNextCargoStatus(current: CargoStatus): CargoStatus | null {
  const index = CARGO_STATUSES.indexOf(current)
  if (index < 0 || index >= CARGO_STATUSES.length - 1) {
    return null
  }
  return CARGO_STATUSES[index + 1] ?? null
}

export function validateCargoDocument(file: File, title: string): string | null {
  if (!title.trim()) {
    return 'Document title is required.'
  }
  if (!(CARGO_DOC_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Only PDF, Word, or image files are accepted.'
  }
  if (file.size <= 0 || file.size > MAX_CARGO_DOC_BYTES) {
    return 'Document must be under 25MB.'
  }
  return null
}

export function cargoObjectPath(shipmentId: string, fileName: string): string {
  const safe = fileName.replace(/[^\w.\-]+/g, '_').slice(0, 80)
  return `${shipmentId}/${Date.now()}-${safe}`
}
