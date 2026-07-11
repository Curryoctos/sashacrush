import type { LandRecord } from '@/types'

interface SellerLandSelectorProps {
  lands: LandRecord[]
  selectedLandId: string
  onSelect: (landId: string) => void
  id?: string
}

export function SellerLandSelector({
  lands,
  selectedLandId,
  onSelect,
  id = 'seller-land-select',
}: SellerLandSelectorProps) {
  if (lands.length <= 1) {
    return null
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        Property
      </label>
      <select
        id={id}
        value={selectedLandId}
        onChange={(event) => onSelect(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        {lands.map((land) => (
          <option key={land.id} value={land.id}>
            {land.title}
            {land.location ? ` — ${land.location}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
