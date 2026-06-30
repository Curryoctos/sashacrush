import type { LandRecordFormValues, LandRecordStatus } from '@/types/database'

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function emptyLandRecordForm(
  status: LandRecordStatus = 'active',
): LandRecordFormValues {
  return {
    title: '',
    description: '',
    location: '',
    total_value_usd: '',
    latitude: '',
    longitude: '',
    seller_id: '',
    status,
  }
}

export function landRecordToForm(record: {
  title: string
  description: string | null
  location: string | null
  total_value_usd: number
  latitude: number | null
  longitude: number | null
  seller_id: string | null
  status: string
}): LandRecordFormValues {
  return {
    title: record.title,
    description: record.description ?? '',
    location: record.location ?? '',
    total_value_usd: String(record.total_value_usd),
    latitude: record.latitude != null ? String(record.latitude) : '',
    longitude: record.longitude != null ? String(record.longitude) : '',
    seller_id: record.seller_id ?? '',
    status: record.status as LandRecordStatus,
  }
}

export function validateLandRecordForm(
  values: LandRecordFormValues,
): Partial<Record<keyof LandRecordFormValues, string>> {
  const errors: Partial<Record<keyof LandRecordFormValues, string>> = {}

  if (!values.title.trim()) {
    errors.title = 'Title is required.'
  }

  if (!values.location.trim()) {
    errors.location = 'Location is required.'
  }

  const value = Number(values.total_value_usd)
  if (!values.total_value_usd.trim() || Number.isNaN(value) || value <= 0) {
    errors.total_value_usd = 'Total value must be a positive number.'
  }

  if (values.latitude.trim() && Number.isNaN(Number(values.latitude))) {
    errors.latitude = 'Latitude must be a valid number.'
  }

  if (values.longitude.trim() && Number.isNaN(Number(values.longitude))) {
    errors.longitude = 'Longitude must be a valid number.'
  }

  return errors
}

export function formToLandRecordPayload(values: LandRecordFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    location: values.location.trim(),
    total_value_usd: Number(values.total_value_usd),
    latitude: values.latitude.trim() ? Number(values.latitude) : null,
    longitude: values.longitude.trim() ? Number(values.longitude) : null,
    seller_id: values.seller_id || null,
    status: values.status,
  }
}
