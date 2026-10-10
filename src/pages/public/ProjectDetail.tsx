import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Camera,
  Check,
  FileText,
  MapPin,
} from 'lucide-react'
import { MapContainer, Marker, Polygon, TileLayer } from 'react-leaflet'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/PageHeader'
import { ContributeModal } from '@/features/projects/components/ContributeModal'
import {
  parseBoundaryGeoJson,
  polygonToLatLngs,
} from '@/features/maps/geojson'
import { ensureLeafletDefaults } from '@/features/maps/leafletSetup'
import { fundingPercentage } from '@/features/projects/projectUtils'
import {
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_ICON,
  PROJECT_TYPE_LABEL,
  PROJECT_TYPE_SURFACE,
  projectStatusTone,
} from '@/features/projects/projectVisuals'
import { useProject } from '@/features/projects/useProject'
import { formatDate, formatUsd } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types/documents'
import type { LandPhoto } from '@/types/photos'

ensureLeafletDefaults()

type Tab = 'about' | 'updates' | 'milestones' | 'photos' | 'documents'

function daysRemaining(target: string | null): number | null {
  if (!target) return null
  const ms = new Date(target).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function ProjectDetailPage() {
  const { slug = '' } = useParams()
  const { project, participants, updates, milestones, isLoading, error } =
    useProject(slug)
  const [tab, setTab] = useState<Tab>('about')
  const [contributeOpen, setContributeOpen] = useState(false)
  const [photoDialog, setPhotoDialog] = useState<LandPhoto | null>(null)

  const photosQuery = useQuery({
    queryKey: ['project-photos', project?.id],
    enabled: Boolean(project?.id),
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('photos')
        .select(
          'id, land_id, project_id, uploader_id, file_path, latitude, longitude, accuracy_m, captured_at',
        )
        .eq('project_id', project!.id)
        .order('captured_at', { ascending: false })
      if (qErr) throw qErr
      return (data ?? []) as LandPhoto[]
    },
  })

  const docsQuery = useQuery({
    queryKey: ['project-documents', project?.id],
    enabled: Boolean(project?.id),
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('documents')
        .select(
          'id, land_id, project_id, investor_id, investment_id, uploader_id, assigned_to, signed_by, file_path, title, status, signature_hash, signed_at, created_at',
        )
        .eq('project_id', project!.id)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
      if (qErr) throw qErr
      return (data ?? []) as Document[]
    },
  })

  const roleCounts = useMemo(() => {
    const counts = { investor: 0, follower: 0, collaborator: 0 }
    for (const p of participants) {
      if (p.role in counts) {
        counts[p.role as keyof typeof counts] += 1
      }
    }
    return counts
  }, [participants])

  if (isLoading) {
    return <p className="text-[13px] text-muted">Loading project…</p>
  }

  if (error || !project) {
    return (
      <EmptyState
        title="Project not found"
        description={error ?? 'This project is private or does not exist.'}
        action={
          <Link to="/projects">
            <Button variant="secondary">Back to projects</Button>
          </Link>
        }
      />
    )
  }

  const Icon = PROJECT_TYPE_ICON[project.type]
  const goal = Number(project.funding_goal_usd ?? 0)
  const raised = Number(project.funding_raised_usd ?? 0)
  const pct = fundingPercentage(raised, goal)
  const days = daysRemaining(project.target_date)
  const completedMilestones = milestones.filter(
    (m) => m.status === 'completed',
  ).length
  const boundary = parseBoundaryGeoJson(project.boundary_geojson)
  const polygon = boundary ? polygonToLatLngs(boundary) : null
  const center: [number, number] =
    project.latitude != null && project.longitude != null
      ? [Number(project.latitude), Number(project.longitude)]
      : [0.5833, 31.3667]

  const tabs: { id: Tab; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'updates', label: 'Updates' },
    { id: 'milestones', label: 'Milestones' },
    { id: 'photos', label: 'Photos' },
    { id: 'documents', label: 'Documents' },
  ]

  const openDoc = async (doc: Document) => {
    if (!doc.file_path) return
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative h-56 overflow-hidden rounded-xl border border-border sm:h-64">
        {project.cover_image_path ? (
          <img
            src={project.cover_image_path}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center',
              PROJECT_TYPE_SURFACE[project.type],
            )}
          >
            <Icon className="h-14 w-14 text-muted" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-6">
          <header className="space-y-3">
            <h1 className="text-[28px] font-semibold tracking-tight text-ink">
              {project.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{PROJECT_TYPE_LABEL[project.type]}</Badge>
              <Badge tone={projectStatusTone(project.status)}>
                {PROJECT_STATUS_LABEL[project.status]}
              </Badge>
              <span className="text-[12px] text-muted">{project.country}</span>
            </div>
            <p className="flex items-center gap-1.5 text-[13px] text-muted">
              <MapPin className="h-3.5 w-3.5" />
              {project.location_name ?? project.country}
            </p>
          </header>

          <div className="ui-panel p-4 lg:hidden">
            <FundingBox
              goal={goal}
              raised={raised}
              pct={pct}
              days={days}
              backers={roleCounts.investor}
              onFund={() => setContributeOpen(true)}
            />
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  tab === t.id
                    ? 'shrink-0 border-b-2 border-ink px-3 py-2 text-[13px] font-medium text-ink'
                    : 'shrink-0 border-b-2 border-transparent px-3 py-2 text-[13px] text-muted hover:text-ink'
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'about' && (
            <div className="space-y-6 text-[13px] leading-relaxed text-ink">
              <p className="whitespace-pre-wrap">{project.description}</p>
              {project.cause ? (
                <div className="ui-panel border-l-2 border-l-ink p-4">
                  <h3 className="ui-section-title">Community impact</h3>
                  <p className="mt-1 text-muted">{project.cause}</p>
                </div>
              ) : null}
              {(project.start_date || project.target_date) && (
                <div>
                  <h3 className="ui-section-title mb-3">Timeline</h3>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[11px] text-muted">Start</p>
                      <p className="font-medium">
                        {project.start_date
                          ? formatDate(project.start_date)
                          : '—'}
                      </p>
                    </div>
                    <div className="h-px flex-1 bg-border" />
                    <div>
                      <p className="text-[11px] text-muted">Target</p>
                      <p className="font-medium">
                        {project.target_date
                          ? formatDate(project.target_date)
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <h3 className="ui-section-title mb-3">Location</h3>
                <div className="h-52 overflow-hidden rounded-xl border border-border">
                  <MapContainer
                    center={center}
                    zoom={12}
                    className="h-full w-full"
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={center} />
                    {polygon ? <Polygon positions={polygon} /> : null}
                  </MapContainer>
                </div>
              </div>
              <p className="text-muted">
                {roleCounts.investor} investors · {roleCounts.follower}{' '}
                followers · {roleCounts.collaborator} collaborators
              </p>
            </div>
          )}

          {tab === 'updates' && (
            <div className="space-y-3">
              {updates.length === 0 ? (
                <EmptyState
                  title="No updates posted yet"
                  description="Follow this project to be notified when updates arrive."
                />
              ) : (
                updates.map((update) => {
                  const name =
                    update.author?.full_name ??
                    update.author?.email ??
                    'Staff'
                  const initials = name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                  return (
                    <article key={update.id} className="ui-panel p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-[11px] font-medium text-ink">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-ink">
                            {name}
                          </p>
                          <p className="text-[11px] text-muted">
                            {formatDate(update.created_at)}
                          </p>
                        </div>
                        <Badge tone="neutral">{update.update_type}</Badge>
                      </div>
                      <h3 className="mt-3 text-[14px] font-medium text-ink">
                        {update.title}
                      </h3>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] text-muted">
                        {update.body}
                      </p>
                    </article>
                  )
                })
              )}
            </div>
          )}

          {tab === 'milestones' && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted">
                {completedMilestones} of {milestones.length} milestones completed
              </p>
              {milestones.length === 0 ? (
                <EmptyState title="No milestones yet" />
              ) : (
                <ol className="relative space-y-5 border-l border-border pl-6">
                  {milestones.map((m) => (
                    <li key={m.id} className="relative">
                      <span
                        className={cn(
                          'absolute -left-[1.9rem] flex h-5 w-5 items-center justify-center rounded-full border',
                          m.status === 'completed' &&
                            'border-success bg-success text-ink-inverse',
                          m.status === 'in_progress' &&
                            'animate-pulse border-warning bg-warning',
                          m.status === 'pending' && 'border-border bg-canvas',
                          m.status === 'blocked' &&
                            'border-danger bg-danger text-white',
                        )}
                      >
                        {m.status === 'completed' ? (
                          <Check className="h-3 w-3" />
                        ) : null}
                        {m.status === 'blocked' ? (
                          <AlertCircle className="h-3 w-3" />
                        ) : null}
                      </span>
                      <p className="text-[14px] font-medium text-ink">
                        {m.title}
                      </p>
                      {m.description ? (
                        <p className="mt-0.5 text-[13px] text-muted">
                          {m.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-muted">
                        {m.target_date
                          ? `Target ${formatDate(m.target_date)}`
                          : null}
                        {m.completed_date
                          ? ` · Completed ${formatDate(m.completed_date)}`
                          : null}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {tab === 'photos' && (
            <div>
              {(photosQuery.data ?? []).length === 0 ? (
                <EmptyState
                  title="No site photos yet"
                  description="GPS-tagged field photos will appear here."
                />
              ) : (
                <div className="columns-1 gap-3 sm:columns-2">
                  {(photosQuery.data ?? []).map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl border border-border text-left"
                      onClick={() => setPhotoDialog(photo)}
                    >
                      {photo.file_path ? (
                        <img
                          src={photo.file_path}
                          alt=""
                          className="w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-32 items-center justify-center bg-surface">
                          <Camera className="h-6 w-6 text-muted" />
                        </div>
                      )}
                      <div className="px-2 py-1.5 text-[11px] text-muted">
                        {formatDate(photo.captured_at)}
                        {photo.latitude != null && photo.longitude != null
                          ? ` · ${Number(photo.latitude).toFixed(4)}, ${Number(photo.longitude).toFixed(4)}`
                          : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'documents' && (
            <div className="space-y-2">
              {(docsQuery.data ?? []).length === 0 ? (
                <EmptyState title="No public documents available yet." />
              ) : (
                (docsQuery.data ?? []).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {doc.title ?? 'Document'}
                      </p>
                      <p className="text-[11px] text-muted">
                        {formatDate(doc.created_at)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void openDoc(doc)}
                    >
                      View
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4 rounded-xl border border-border bg-surface-elevated p-4">
            <FundingBox
              goal={goal}
              raised={raised}
              pct={pct}
              days={days}
              backers={roleCounts.investor}
              onFund={() => setContributeOpen(true)}
            />
            <div>
              <p className="mb-2 text-[12px] font-medium text-muted">
                Recent contributors
              </p>
              <ul className="space-y-1 text-[13px] text-ink">
                {participants
                  .filter(
                    (p) => p.role === 'investor' || p.role === 'contributor',
                  )
                  .slice(0, 5)
                  .map((p) => (
                    <li key={p.id}>
                      {p.profile?.full_name ?? p.profile?.email ?? 'Anonymous'}
                    </li>
                  ))}
                {participants.filter(
                  (p) => p.role === 'investor' || p.role === 'contributor',
                ).length === 0 ? (
                  <li className="text-muted">No contributors yet</li>
                ) : null}
              </ul>
            </div>
            <Button className="w-full" onClick={() => setContributeOpen(true)}>
              Contribute now
            </Button>
          </div>
        </aside>
      </div>

      <ContributeModal
        open={contributeOpen}
        project={project}
        onClose={() => setContributeOpen(false)}
      />

      {photoDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-overlay"
            aria-label="Close photo"
            onClick={() => setPhotoDialog(null)}
          />
          <div className="relative z-10 max-h-[90dvh] max-w-3xl overflow-auto rounded-xl border border-border bg-canvas p-2">
            {photoDialog.file_path ? (
              <img
                src={photoDialog.file_path}
                alt=""
                className="max-h-[80dvh] w-full object-contain"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FundingBox({
  goal,
  raised,
  pct,
  days,
  backers,
  onFund,
}: {
  goal: number
  raised: number
  pct: number
  days: number | null
  backers: number
  onFund: () => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[13px] text-muted">Goal</p>
        <p className="mt-1 text-[28px] font-semibold tracking-tight tabular-nums text-ink">
          {formatUsd(goal)}
        </p>
      </div>
      <p className="text-[14px] font-medium text-ink">
        {formatUsd(raised)} raised
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-ink"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="flex justify-between text-[12px] text-muted">
        <span>
          {pct.toFixed(1)}% · {backers} backers
        </span>
        {days != null ? <span>{days} days left</span> : null}
      </div>
      <Button className="w-full" onClick={onFund}>
        Fund this project
      </Button>
      <Button variant="secondary" className="w-full">
        Follow project
      </Button>
    </div>
  )
}
