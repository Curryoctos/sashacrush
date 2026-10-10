import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HierarchyNav } from '@/components/hierarchy/Hierarchy'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { LinkedLandCard } from '@/features/projects/components/LandProjectBridge'
import { ProjectWorkspaceFolders } from '@/features/projects/components/ProjectWorkspaceFolders'
import { useProject } from '@/features/projects/useProject'
import { projectLibraryPath } from '@/features/projects/projectFolders'
import {
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
} from '@/features/projects/projectVisuals'
import { formatDate, formatUsd } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import type {
  MilestoneStatus,
  ParticipantRole,
  UpdateType,
} from '@/types/projects'

type AdminTab =
  | 'about'
  | 'updates'
  | 'milestones'
  | 'payments'
  | 'notes'
  | 'participants'
  | 'post_update'

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'updates', label: 'Updates' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'payments', label: 'Purchases' },
  { id: 'notes', label: 'Internal notes' },
  { id: 'participants', label: 'Participants' },
  { id: 'post_update', label: 'Post update' },
]

export function AdminProjectDetailPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { project, participants, updates, milestones, isLoading, error } =
    useProject(slug)
  const [tab, setTab] = useState<AdminTab>('about')
  const [notes, setNotes] = useState('')
  const [updateTitle, setUpdateTitle] = useState('')
  const [updateBody, setUpdateBody] = useState('')
  const [updateType, setUpdateType] = useState<UpdateType>('general')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<ParticipantRole>('collaborator')
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [linkLandId, setLinkLandId] = useState('')

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['project', slug] })
    await queryClient.invalidateQueries({ queryKey: ['project-for-land'] })
  }

  const landsQuery = useQuery({
    queryKey: ['land-records', 'link-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title, location, status')
        .neq('status', 'archived')
        .order('title')
      if (error) throw error
      return data ?? []
    },
  })

  const linkedLandQuery = useQuery({
    queryKey: ['land-record', project?.land_id],
    enabled: Boolean(project?.land_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title')
        .eq('id', project!.land_id!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const linkLand = async () => {
    if (!project || !linkLandId) return
    setBusy(true)
    setMsg(null)
    const { error: err } = await supabase
      .from('projects')
      .update({ land_id: linkLandId })
      .eq('id', project.id)
    setBusy(false)
    if (err) {
      setMsg(
        err.message.includes('projects_land_id_unique')
          ? 'That land deal is already linked to another project.'
          : err.message,
      )
      return
    }
    setLinkLandId('')
    setMsg('Land deal linked.')
    await refresh()
  }

  const unlinkLand = async () => {
    if (!project?.land_id) return
    setBusy(true)
    setMsg(null)
    const { error: err } = await supabase
      .from('projects')
      .update({ land_id: null })
      .eq('id', project.id)
    setBusy(false)
    if (err) {
      setMsg(err.message)
      return
    }
    setMsg('Land deal unlinked.')
    await refresh()
  }

  const postUpdate = async () => {
    if (!project || !user) return
    setBusy(true)
    setMsg(null)
    const { error: err } = await supabase.from('project_updates').insert({
      project_id: project.id,
      author_id: user.id,
      title: updateTitle.trim(),
      body: updateBody.trim(),
      update_type: updateType,
      is_public: true,
    })
    setBusy(false)
    if (err) {
      setMsg(err.message)
      return
    }
    setUpdateTitle('')
    setUpdateBody('')
    setMsg('Update posted.')
    await refresh()
  }

  const addMilestone = async () => {
    if (!project || !milestoneTitle.trim()) return
    setBusy(true)
    const maxOrder = milestones.reduce(
      (max, m) => Math.max(max, m.order_index),
      -1,
    )
    const { error: err } = await supabase.from('project_milestones').insert({
      project_id: project.id,
      title: milestoneTitle.trim(),
      status: 'pending' satisfies MilestoneStatus,
      order_index: maxOrder + 1,
    })
    setBusy(false)
    if (err) {
      setMsg(err.message)
      return
    }
    setMilestoneTitle('')
    await refresh()
  }

  const completeMilestone = async (id: string) => {
    const { error: err } = await supabase
      .from('project_milestones')
      .update({
        status: 'completed',
        completed_date: new Date().toISOString().slice(0, 10),
      })
      .eq('id', id)
    if (err) setMsg(err.message)
    else await refresh()
  }

  const inviteParticipant = async () => {
    if (!project || !inviteEmail.trim()) return
    setBusy(true)
    setMsg(null)
    const { data: profile, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', inviteEmail.trim().toLowerCase())
      .maybeSingle()
    if (userErr || !profile) {
      setBusy(false)
      setMsg(userErr?.message ?? 'No user found with that email.')
      return
    }
    const { error: err } = await supabase.from('project_participants').insert({
      project_id: project.id,
      user_id: profile.id,
      role: inviteRole,
      invited_by: user?.id ?? null,
    })
    setBusy(false)
    if (err) {
      setMsg(err.message)
      return
    }
    setInviteEmail('')
    await refresh()
  }

  const removeParticipant = async (id: string) => {
    if (!window.confirm('Remove this participant?')) return
    const { error: err } = await supabase
      .from('project_participants')
      .delete()
      .eq('id', id)
    if (err) setMsg(err.message)
    else await refresh()
  }

  const sortedMilestones = useMemo(
    () => [...milestones].sort((a, b) => a.order_index - b.order_index),
    [milestones],
  )

  if (isLoading) {
    return (
      <div className="ui-page">
        <p className="text-[13px] text-muted">Loading…</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="ui-page">
        <EmptyState
          title="Project not found"
          description={error ?? 'This project does not exist or you lack access.'}
          action={
            <Link to="/admin/funding">
              <Button variant="secondary">Back to funding projects</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="ui-page">
      <PageHeader
        title={project.title}
        description={`${PROJECT_TYPE_LABEL[project.type]} · ${project.visibility} · Goal ${formatUsd(Number(project.funding_goal_usd ?? 0))}`}
        backTo="/admin/funding"
        backLabel="Funding projects"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(project.status)}>
              {PROJECT_STATUS_LABEL[project.status]}
            </Badge>
            <Link to={`/projects/${project.slug}`}>
              <Button variant="secondary" size="sm">
                Public view
              </Button>
            </Link>
          </div>
        }
      />

      <HierarchyNav
        crumbs={[
          { label: 'Projects', onClick: () => navigate('/admin/projects') },
          { label: 'Funding', onClick: () => navigate('/admin/funding') },
          { label: project.title },
        ]}
      />

      {msg ? <p className="ui-alert-info">{msg}</p> : null}

      {project.land_id && linkedLandQuery.data ? (
        <div className="space-y-2">
          <LinkedLandCard
            landId={project.land_id}
            landTitle={linkedLandQuery.data.title}
          />
          <button
            type="button"
            className="text-xs font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
            disabled={busy}
            onClick={() => void unlinkLand()}
          >
            Unlink land deal
          </button>
        </div>
      ) : (
        <aside className="rounded-lg border border-dashed border-border bg-surface-elevated px-4 py-3">
          <p className="text-sm font-medium text-ink">Link a land deal</p>
          <p className="mt-1 text-xs text-muted">
            Connect this project to a land workspace so purchases carry land
            context and the deal opens the right purchase folders.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              className="ui-input max-w-sm"
              value={linkLandId}
              onChange={(e) => setLinkLandId(e.target.value)}
            >
              <option value="">Select land record…</option>
              {(landsQuery.data ?? []).map((land) => (
                <option key={land.id} value={land.id}>
                  {land.title}
                  {land.location ? ` · ${land.location}` : ''}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={busy || !linkLandId}
              onClick={() => void linkLand()}
            >
              Link land
            </Button>
          </div>
        </aside>
      )}

      <ProjectWorkspaceFolders
        projectId={project.id}
        projectSlug={project.slug}
      />

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
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
        <section className="ui-panel space-y-3 p-5 sm:p-6">
          <h2 className="ui-section-title">About</h2>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
            {project.description}
          </p>
          {project.cause ? (
            <p className="text-[13px] italic text-muted">{project.cause}</p>
          ) : null}
          <p className="text-[13px] text-muted">
            Raised {formatUsd(Number(project.funding_raised_usd ?? 0))} of{' '}
            {formatUsd(Number(project.funding_goal_usd ?? 0))}
          </p>
          <p className="text-[13px] text-muted">
            {[project.location_name, project.country].filter(Boolean).join(', ')}
          </p>
        </section>
      )}

      {tab === 'updates' && (
        <div className="space-y-3">
          {updates.length === 0 ? (
            <EmptyState
              title="No updates yet"
              description="Post an update from the Post update tab."
            />
          ) : (
            updates.map((u) => (
              <article key={u.id} className="ui-panel p-4">
                <p className="text-[14px] font-medium text-ink">{u.title}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {u.update_type} · {formatDate(u.created_at)}
                </p>
                <p className="mt-2 text-[13px] text-muted">{u.body}</p>
              </article>
            ))
          )}
        </div>
      )}

      {tab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="ui-input min-w-[200px] flex-1"
              placeholder="New milestone title"
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
            />
            <Button disabled={busy} onClick={() => void addMilestone()}>
              Add
            </Button>
          </div>
          {sortedMilestones.length === 0 ? (
            <EmptyState
              title="No milestones"
              description="Break the project into trackable phases."
            />
          ) : (
            <ul className="ui-panel divide-y divide-border overflow-hidden">
              {sortedMilestones.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink">{m.title}</p>
                    <p className="text-[11px] text-muted">
                      {m.status}
                      {m.target_date ? ` · ${formatDate(m.target_date)}` : ''}
                    </p>
                  </div>
                  {m.status !== 'completed' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void completeMilestone(m.id)}
                    >
                      Complete
                    </Button>
                  ) : (
                    <Badge tone="success">Done</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <section className="ui-panel space-y-3 p-5 sm:p-6">
          <h2 className="ui-section-title">Purchases</h2>
          <p className="ui-section-desc">
            Goal {formatUsd(Number(project.funding_goal_usd ?? 0))} · Raised{' '}
            {formatUsd(Number(project.funding_raised_usd ?? 0))}. Record
            purchases with a disbursement reason, then clear pending payouts.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`${projectLibraryPath(project.id, 'payments')}&folder=collect`}
            >
              <Button size="sm">Record purchase</Button>
            </Link>
            <Link
              to={`${projectLibraryPath(project.id, 'payments')}&folder=needs-action`}
            >
              <Button variant="secondary" size="sm">
                Clear pending
              </Button>
            </Link>
            <Link to={projectLibraryPath(project.id, 'payments')}>
              <Button variant="ghost" size="sm">
                Open purchase folders
              </Button>
            </Link>
          </div>
        </section>
      )}

      {tab === 'notes' && (
        <section className="space-y-3">
          <p className="ui-hint">
            Private admin notes — never shown on the public project page.
          </p>
          <textarea
            className="ui-input min-h-40"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes…"
          />
          <Button
            variant="secondary"
            onClick={() => setMsg('Notes saved for this session.')}
          >
            Save notes
          </Button>
        </section>
      )}

      {tab === 'participants' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="ui-input min-w-[200px] flex-1"
              placeholder="Invite by email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className="ui-input w-auto"
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as ParticipantRole)
              }
            >
              <option value="investor">Investor</option>
              <option value="contributor">Contributor</option>
              <option value="counterpart">Counterpart</option>
              <option value="follower">Follower</option>
              <option value="collaborator">Collaborator</option>
            </select>
            <Button disabled={busy} onClick={() => void inviteParticipant()}>
              Invite
            </Button>
          </div>
          {participants.length === 0 ? (
            <EmptyState
              title="No participants"
              description="Invite collaborators, counterparts, or followers by email."
            />
          ) : (
            <ul className="ui-panel divide-y divide-border overflow-hidden">
              {participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 text-[13px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">
                      {p.profile?.full_name ?? p.profile?.email ?? p.user_id}
                    </p>
                    <p className="capitalize text-muted">{p.role}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void removeParticipant(p.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'post_update' && (
        <section className="ui-panel space-y-3 p-5 sm:p-6">
          <h2 className="ui-section-title">Post update</h2>
          <label className="ui-field">
            <span className="ui-label">Title</span>
            <input
              className="ui-input"
              value={updateTitle}
              onChange={(e) => setUpdateTitle(e.target.value)}
            />
          </label>
          <label className="ui-field">
            <span className="ui-label">Type</span>
            <select
              className="ui-input"
              value={updateType}
              onChange={(e) => setUpdateType(e.target.value as UpdateType)}
            >
              <option value="general">General</option>
              <option value="milestone">Milestone</option>
              <option value="funding">Funding</option>
              <option value="photo">Photo</option>
              <option value="document">Document</option>
              <option value="shipment">Shipment</option>
              <option value="completion">Completion</option>
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-label">Body</span>
            <textarea
              className="ui-input"
              value={updateBody}
              onChange={(e) => setUpdateBody(e.target.value)}
            />
          </label>
          <Button
            disabled={busy || !updateTitle.trim() || !updateBody.trim()}
            onClick={() => void postUpdate()}
          >
            Post update
          </Button>
        </section>
      )}
    </div>
  )
}
