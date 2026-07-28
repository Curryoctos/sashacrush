import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/** URL-driven land → folder navigation shared across portal screens. */
export function useLandHierarchyNav<T extends { id: string }>(lands: T[]) {
  const [searchParams, setSearchParams] = useSearchParams()
  const landFromQuery = searchParams.get('land')
  const folderFromQuery = searchParams.get('folder')

  const selectedLandId = useMemo(() => {
    if (landFromQuery && lands.some((land) => land.id === landFromQuery)) {
      return landFromQuery
    }
    return null
  }, [landFromQuery, lands])

  const selectedLand = lands.find((land) => land.id === selectedLandId) ?? null
  const selectedFolder = folderFromQuery

  const setNavigation = (landId: string | null, folder: string | null = null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (landId) {
        next.set('land', landId)
      } else {
        next.delete('land')
      }
      if (folder) {
        next.set('folder', folder)
      } else {
        next.delete('folder')
      }
      return next
    })
  }

  return {
    searchParams,
    setSearchParams,
    selectedLandId,
    selectedLand,
    selectedFolder,
    setNavigation,
  }
}
