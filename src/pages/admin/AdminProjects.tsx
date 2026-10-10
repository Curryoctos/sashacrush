import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { Plus } from 'lucide-react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { ensureLeafletDefaults } from '@/features/maps/leafletSetup'
import {
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
} from '@/features/projects/projectVisuals'
import {
  fundingPercentage,
  slugifyProjectTitle,
} from '@/features/projects/projectUtils'
import {
  useCreateProject,
  type CreateProjectInput,
} from '@/features/projects/useCreateProject'
import { useProjects } from '@/features/projects/useProjects'
import { formatDate, formatUsd } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import {
  PROJECT_TYPES,
  type Project,
  type ProjectStatus,
  type ProjectType,
  type ProjectVisibility,
} from '@/types/projects'

ensureLeafletDefaults()

type SortKey =
  | 'title'
  | 'type'
  | 'status'
  | 'goal'
  | 'raised'
  | 'pct'
  | 'target'
  | 'visibility'

const FUNDING_BASE = '/admin/funding'

export function AdminProjectsPage() {
  const navigate = useNavigate()
  const { projects, isLoading, error } = useProjects()
  const { createProject, isLoading: creating, error: createError } =
    useCreateProject()

  const [typeFilter, setTypeFilter] = useState<ProjectType | ''>('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')
  const [visibilityFilter, setVisibilityFilter] = useState<
    ProjectVisibility | ''
  >('')
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortAsc, setSortAsc] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<CreateProjectInput>({
    title: '',
    description: '',
    cause: '',
    type: 'education',
    visibility: 'public',
    funding_goal_usd: 10000,
    min_contribution_usd: 10,
    location_name: '',
    country: 'Uganda',
    latitude: 0.3476,
    longitude: 32.5825,
    start_date: null,
    target_date: null,
    land_id: null,
  })
  const landsQuery = useQuery({
    queryKey: ['land-records', 'create-project-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_records')
        .select(
          'id, title, location, total_value_usd, latitude, longitude, status',
        )
        .neq('status', 'archived')
        .order('title')
      if (error) throw error
      return data ?? []
    },
  })
  const linkedLandIds = useMemo(
    () =>
      new Set(
        projects
          .map((project) => project.land_id)
          .filter((id): id is string => Boolean(id)),
      ),
    [projects],
  )
  const [participantChips, setParticipantChips] = useState<
    { email: string; role: 'counterpart' | 'collaborator' }[]
  >([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'counterpart' | 'collaborator'>(
    'collaborator',
  )
  const [formError, setFormError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let rows = [...projects]
    if (typeFilter) rows = rows.filter((p) => p.type === typeFilter)
    if (statusFilter) rows = rows.filter((p) => p.status === statusFilter)
    if (visibilityFilter) {
      rows = rows.filter((p) => p.visibility === visibilityFilter)
    }

    rows.sort((a, b) => {
      const dir = sortAsc ? 1 : -1
      const goalA = Number(a.funding_goal_usd ?? 0)
      const goalB = Number(b.funding_goal_usd ?? 0)
      const raisedA = Number(a.funding_raised_usd ?? 0)
      const raisedB = Number(b.funding_raised_usd ?? 0)
      switch (sortKey) {
        case 'type':
          return a.type.localeCompare(b.type) * dir
        case 'status':
          return a.status.localeCompare(b.status) * dir
        case 'goal':
          return (goalA - goalB) * dir
        case 'raised':
          return (raisedA - raisedB) * dir
        case 'pct':
          return (
            (fundingPercentage(raisedA, goalA) -
              fundingPercentage(raisedB, goalB)) *
            dir
          )
        case 'target':
          return (a.target_date ?? '').localeCompare(b.target_date ?? '') * dir
        case 'visibility':
          return a.visibility.localeCompare(b.visibility) * dir
        default:
          return a.title.localeCompare(b.title) * dir
      }
    })
    return rows
  }, [projects, typeFilter, statusFilter, visibilityFilter, sortKey, sortAsc])

  const summary = useMemo(() => {
    const active = projects.filter((p) => p.status === 'active').length
    const raised = projects.reduce(
      (s, p) => s + Number(p.funding_raised_usd ?? 0),
      0,
    )
    const goal = projects.reduce(
      (s, p) => s + Number(p.funding_goal_usd ?? 0),
      0,
    )
    return { total: projects.length, active, raised, goal }
  }, [projects])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const resetSheet = () => {
    setSheetOpen(false)
    setStep(1)
    setFormError(null)
  }

  const goNextStep = () => {
    if (step === 1) {
      if (!form.title.trim()) {
        setFormError('Enter a project title.')
        return
      }
      if (!form.description.trim()) {
        setFormError('Enter a project description.')
        return
      }
    }
    setFormError(null)
    setStep((s) => Math.min(5, s + 1))
  }

  const save = async (status: 'draft' | 'active') => {
    setFormError(null)
    if (!form.title.trim() || !form.description.trim()) {
      setFormError('Title and description are required.')
      setStep(1)
      return
    }
    const created = await createProject({ ...form, status })
    resetSheet()
    navigate(`${FUNDING_BASE}/${created.slug}`)
  }

  return (
    <div className="ui-page">
      <PageHeader
        title="Funding projects"
        description="Public causes or private deals. Link a land record when the project funds a site purchase."
        backTo="/admin/projects"
        backLabel="Projects"
        actions={
          <Button
            onClick={() => {
              setSheetOpen(true)
              setStep(1)
            }}
          >
            <Plus className="h-4 w-4" />
            New project
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ui-stat">
          <p className="ui-stat-label">Total projects</p>
          <p className="ui-stat-value">{summary.total}</p>
        </div>
        <div className="ui-stat">
          <p className="ui-stat-label">Active</p>
          <p className="ui-stat-value">{summary.active}</p>
        </div>
        <div className="ui-stat">
          <p className="ui-stat-label">Total raised</p>
          <p className="ui-stat-value">{formatUsd(summary.raised)}</p>
        </div>
        <div className="ui-stat">
          <p className="ui-stat-label">Total goal</p>
          <p className="ui-stat-value">{formatUsd(summary.goal)}</p>
        </div>
      </div>

      <div className="ui-field-row-3">
        <label className="ui-field">
          <span className="ui-label">Type</span>
          <select
            className="ui-input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ProjectType | '')}
          >
            <option value="">All types</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROJECT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-label">Status</span>
          <select
            className="ui-input"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ProjectStatus | '')
            }
          >
            <option value="">All statuses</option>
            {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-label">Visibility</span>
          <select
            className="ui-input"
            value={visibilityFilter}
            onChange={(e) =>
              setVisibilityFilter(e.target.value as ProjectVisibility | '')
            }
          >
            <option value="">Any</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className="ui-alert-danger" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-[13px] text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a funding project to appear here and on the public browse page when published as public."
          action={
            <Button
              onClick={() => {
                setSheetOpen(true)
                setStep(1)
              }}
            >
              New project
            </Button>
          }
        />
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                {(
                  [
                    ['title', 'Title'],
                    ['type', 'Type'],
                    ['status', 'Status'],
                    ['goal', 'Goal'],
                    ['raised', 'Raised'],
                    ['pct', '% Funded'],
                    ['target', 'Target'],
                    ['visibility', 'Visibility'],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key}>
                    <button type="button" onClick={() => toggleSort(key)}>
                      {label}
                    </button>
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onView={() => navigate(`${FUNDING_BASE}/${project.slug}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={sheetOpen}
        title="Create project"
        description={`Step ${step} of 5`}
        onClose={resetSheet}
        widthClassName="max-w-xl"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="ghost"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Back
            </Button>
            {step < 5 ? (
              <Button onClick={goNextStep}>Continue</Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={creating}
                  onClick={() => void save('draft')}
                >
                  Save as draft
                </Button>
                <Button disabled={creating} onClick={() => void save('active')}>
                  Publish
                </Button>
              </div>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {formError || createError ? (
            <p className="ui-alert-danger" role="alert">
              {formError ?? createError}
            </p>
          ) : null}

          {step === 1 && (
            <>
              <label className="ui-field">
                <span className="ui-label">Title</span>
                <input
                  className="ui-input"
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
                <p className="ui-hint">
                  Slug: {slugifyProjectTitle(form.title) || '—'}
                </p>
              </label>
              <label className="ui-field">
                <span className="ui-label">Type</span>
                <select
                  className="ui-input"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as ProjectType,
                      land_id:
                        e.target.value === 'land_acquisition'
                          ? f.land_id
                          : null,
                    }))
                  }
                >
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PROJECT_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              {(form.type === 'land_acquisition' || form.land_id) && (
                <label className="ui-field">
                  <span className="ui-label">Linked land deal (optional)</span>
                  <select
                    className="ui-input"
                    value={form.land_id ?? ''}
                    onChange={(e) => {
                      const landId = e.target.value || null
                      const land = (landsQuery.data ?? []).find(
                        (row) => row.id === landId,
                      )
                      setForm((f) => ({
                        ...f,
                        land_id: landId,
                        ...(land
                          ? {
                              title: f.title.trim() ? f.title : land.title,
                              location_name:
                                f.location_name?.trim()
                                  ? f.location_name
                                  : (land.location ?? ''),
                              funding_goal_usd:
                                f.funding_goal_usd && f.funding_goal_usd > 0
                                  ? f.funding_goal_usd
                                  : (land.total_value_usd ?? f.funding_goal_usd),
                              latitude: land.latitude ?? f.latitude,
                              longitude: land.longitude ?? f.longitude,
                              type: 'land_acquisition',
                            }
                          : {}),
                      }))
                    }}
                  >
                    <option value="">No land link</option>
                    {(landsQuery.data ?? []).map((land) => (
                      <option
                        key={land.id}
                        value={land.id}
                        disabled={linkedLandIds.has(land.id)}
                      >
                        {land.title}
                        {linkedLandIds.has(land.id) ? ' (already linked)' : ''}
                        {land.location ? ` · ${land.location}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="ui-hint">
                    Ties purchases and this project to the land workspace.
                  </p>
                </label>
              )}
              <label className="ui-field">
                <span className="ui-label">Description</span>
                <textarea
                  className="ui-input"
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </label>
              <label className="ui-field">
                <span className="ui-label">Cause</span>
                <textarea
                  className="ui-input"
                  value={form.cause ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cause: e.target.value }))
                  }
                  placeholder="What changes for real people when this succeeds?"
                />
              </label>
              <div className="ui-segment">
                {(['public', 'private'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, visibility: v }))}
                    className={cn(
                      'ui-segment-item capitalize',
                      form.visibility === v
                        ? 'ui-segment-item-active'
                        : 'ui-segment-item-idle',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="ui-hint">
                Public projects appear on /projects without login. Private ones
                are limited to admin, executives, and participants.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <label className="ui-field">
                <span className="ui-label">Funding goal (USD)</span>
                <input
                  type="number"
                  className="ui-input"
                  value={form.funding_goal_usd ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      funding_goal_usd: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="ui-field">
                <span className="ui-label">Minimum contribution (USD)</span>
                <input
                  type="number"
                  className="ui-input"
                  value={form.min_contribution_usd ?? 10}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      min_contribution_usd: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <div className="ui-field-row">
                <label className="ui-field">
                  <span className="ui-label">Start date</span>
                  <input
                    type="date"
                    className="ui-input"
                    value={form.start_date ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        start_date: e.target.value || null,
                      }))
                    }
                  />
                </label>
                <label className="ui-field">
                  <span className="ui-label">Target date</span>
                  <input
                    type="date"
                    className="ui-input"
                    value={form.target_date ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        target_date: e.target.value || null,
                      }))
                    }
                  />
                </label>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <label className="ui-field">
                <span className="ui-label">Location name</span>
                <input
                  className="ui-input"
                  value={form.location_name ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location_name: e.target.value }))
                  }
                />
              </label>
              <label className="ui-field">
                <span className="ui-label">Country</span>
                <input
                  className="ui-input"
                  value={form.country ?? 'Uganda'}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, country: e.target.value }))
                  }
                />
              </label>
              <div className="ui-field-row">
                <label className="ui-field">
                  <span className="ui-label">Latitude</span>
                  <input
                    type="number"
                    step="any"
                    className="ui-input"
                    value={form.latitude ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        latitude: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="ui-field">
                  <span className="ui-label">Longitude</span>
                  <input
                    type="number"
                    step="any"
                    className="ui-input"
                    value={form.longitude ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        longitude: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              <div className="h-40 overflow-hidden rounded-xl border border-border">
                <MapContainer
                  center={[
                    Number(form.latitude ?? 0.3476),
                    Number(form.longitude ?? 32.5825),
                  ]}
                  zoom={10}
                  className="h-full w-full"
                  scrollWheelZoom={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker
                    position={[
                      Number(form.latitude ?? 0.3476),
                      Number(form.longitude ?? 32.5825),
                    ]}
                  />
                </MapContainer>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="flex flex-wrap gap-2">
                <input
                  className="ui-input min-w-[160px] flex-1"
                  placeholder="Email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <select
                  className="ui-input w-auto"
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(
                      e.target.value as 'counterpart' | 'collaborator',
                    )
                  }
                >
                  <option value="counterpart">Counterpart</option>
                  <option value="collaborator">Collaborator</option>
                </select>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!inviteEmail.trim()) return
                    setParticipantChips((chips) => [
                      ...chips,
                      { email: inviteEmail.trim(), role: inviteRole },
                    ])
                    setInviteEmail('')
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {participantChips.map((chip) => (
                  <button
                    key={`${chip.email}-${chip.role}`}
                    type="button"
                    className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[12px] text-ink"
                    onClick={() =>
                      setParticipantChips((chips) =>
                        chips.filter(
                          (c) =>
                            !(c.email === chip.email && c.role === chip.role),
                        ),
                      )
                    }
                  >
                    {chip.email} · {chip.role} ×
                  </button>
                ))}
              </div>
              <p className="ui-hint">
                Invitees are linked after publish when their account email
                matches. Click a chip to remove it.
              </p>
            </>
          )}

          {step === 5 && (
            <div className="ui-panel space-y-2 p-4">
              <p className="text-[15px] font-medium text-ink">
                {form.title || 'Untitled'}
              </p>
              <p className="text-[13px] text-muted">
                {PROJECT_TYPE_LABEL[form.type]} · {form.visibility} ·{' '}
                {formatUsd(Number(form.funding_goal_usd ?? 0))} goal
              </p>
              <p className="text-[13px] text-muted">
                {[form.location_name, form.country].filter(Boolean).join(', ')}
              </p>
              <p className="line-clamp-3 text-[13px] text-muted">
                {form.description}
              </p>
              <p className="ui-hint">
                Participants queued: {participantChips.length}
              </p>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  )
}

function ProjectRow({
  project,
  onView,
}: {
  project: Project
  onView: () => void
}) {
  const goal = Number(project.funding_goal_usd ?? 0)
  const raised = Number(project.funding_raised_usd ?? 0)
  const pct = fundingPercentage(raised, goal)

  return (
    <tr className="cursor-pointer" onClick={onView}>
      <td className="font-medium">{project.title}</td>
      <td className="text-muted">{PROJECT_TYPE_LABEL[project.type]}</td>
      <td>
        <Badge tone={statusTone(project.status)}>
          {PROJECT_STATUS_LABEL[project.status]}
        </Badge>
      </td>
      <td className="tabular-nums">{formatUsd(goal)}</td>
      <td className="tabular-nums">{formatUsd(raised)}</td>
      <td className="tabular-nums">{pct.toFixed(1)}%</td>
      <td className="text-muted">
        {project.target_date ? formatDate(project.target_date) : '—'}
      </td>
      <td className="capitalize text-muted">{project.visibility}</td>
      <td>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={onView}>
            View
          </Button>
          <Button size="sm" variant="ghost" onClick={onView}>
            Edit
          </Button>
        </div>
      </td>
    </tr>
  )
}
