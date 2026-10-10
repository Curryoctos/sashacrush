import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { HierarchyNav } from '@/components/hierarchy/Hierarchy'
import { PageHeader } from '@/components/ui/PageHeader'
import { LinkedLandCard } from '@/features/projects/components/LandProjectBridge'
import {
  PROJECT_FOLDER_DESCRIPTIONS,
  PROJECT_FOLDER_LABELS,
  type ProjectFolderId,
} from '@/features/projects/projectFolders'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/types/projects'

interface ProjectLibraryShellProps {
  projectId: string
  folder: ProjectFolderId
  children: ReactNode
}

/** Shared chrome when a library page is opened scoped to a project. */
export function ProjectLibraryShell({
  projectId,
  folder,
  children,
}: ProjectLibraryShellProps) {
  const navigate = useNavigate()
  const projectQuery = useQuery({
    queryKey: ['project-by-id', projectId],
    queryFn: async (): Promise<
      Pick<Project, 'id' | 'title' | 'slug' | 'land_id'>
    > => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, slug, land_id')
        .eq('id', projectId)
        .single()
      if (error || !data) {
        throw error ?? new Error('Project not found.')
      }
      return data as Pick<Project, 'id' | 'title' | 'slug' | 'land_id'>
    },
  })

  const linkedLandQuery = useQuery({
    queryKey: ['land-record', projectQuery.data?.land_id],
    enabled: Boolean(projectQuery.data?.land_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title')
        .eq('id', projectQuery.data!.land_id!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const project = projectQuery.data
  const fundingPath = project ? `/admin/funding/${project.slug}` : '/admin/funding'

  return (
    <div className="ui-page space-y-5">
      <PageHeader
        backTo={fundingPath}
        backLabel={project?.title ?? 'Project'}
        title={PROJECT_FOLDER_LABELS[folder]}
        description={
          project
            ? `${PROJECT_FOLDER_DESCRIPTIONS[folder]} · ${project.title}`
            : PROJECT_FOLDER_DESCRIPTIONS[folder]
        }
      />

      <HierarchyNav
        crumbs={[
          { label: 'Projects', onClick: () => navigate('/admin/projects') },
          { label: 'Funding', onClick: () => navigate('/admin/funding') },
          {
            label: project?.title ?? 'Project',
            onClick: () => navigate(fundingPath),
          },
          { label: PROJECT_FOLDER_LABELS[folder] },
        ]}
      />

      {projectQuery.isLoading ? (
        <p className="text-[13px] text-muted">Loading project…</p>
      ) : null}

      {projectQuery.error ? (
        <p className="ui-alert-danger" role="alert">
          {(projectQuery.error as Error).message}
        </p>
      ) : null}

      {project ? (
        <p className="text-[13px] text-muted">
          Scoped to{' '}
          <Link className="font-medium text-ink underline" to={fundingPath}>
            {project.title}
          </Link>
        </p>
      ) : null}

      {project?.land_id && linkedLandQuery.data ? (
        <LinkedLandCard
          landId={project.land_id}
          landTitle={linkedLandQuery.data.title}
        />
      ) : null}

      {children}
    </div>
  )
}
