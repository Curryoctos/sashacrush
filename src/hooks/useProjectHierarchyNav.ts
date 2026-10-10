import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/** URL-driven project → folder navigation (mirrors useLandHierarchyNav). */
export function useProjectHierarchyNav<T extends { id: string }>(projects: T[]) {
  const [searchParams, setSearchParams] = useSearchParams()
  const projectFromQuery = searchParams.get('project')
  const folderFromQuery = searchParams.get('folder')

  const selectedProjectId = useMemo(() => {
    if (
      projectFromQuery &&
      projects.some((project) => project.id === projectFromQuery)
    ) {
      return projectFromQuery
    }
    return null
  }, [projectFromQuery, projects])

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null
  const selectedFolder = folderFromQuery

  const setNavigation = (
    projectId: string | null,
    folder: string | null = null,
  ) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (projectId) {
        next.set('project', projectId)
      } else {
        next.delete('project')
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
    selectedProjectId,
    selectedProject,
    selectedFolder,
    setNavigation,
  }
}
