"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Transport from "@/components/transport";
import { createProject, listProjects, ProjectRecord, removeProject, setActiveProjectId } from "@/lib/projects";

type SortOrder = "newest" | "oldest" | "name-asc" | "name-desc";
type VersionRecord = { id: string; status: string; progress: number; processor: string; attempt: number; render?: "preview" | "full"; summary?: string | null; refinement?: string | null; error_code?: string | null; output_format?: string | null; output_size_bytes?: number | null; created_at: string };
type LibraryProject = ProjectRecord & { jobs: VersionRecord[] };

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Saved session" : new Intl.DateTimeFormat("en", { month:"short", day:"numeric", year:"numeric" }).format(date);
}

export default function ProjectLibrary() {
  const router = useRouter();
  const [projects, setProjects] = useState<LibraryProject[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [audio, setAudio] = useState<{ projectId: string; jobId: string; url: string } | null>(null);
  const [busyVersion, setBusyVersion] = useState("");

  const withVersions = useCallback(async (items: ProjectRecord[]): Promise<LibraryProject[]> => {
    return Promise.all(items.map(async (project) => {
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/jobs`, { cache: "no-store" });
        if (response.ok) {
          const body = await response.json() as { jobs: VersionRecord[] };
          return { ...project, jobs: body.jobs || [] };
        }
      } catch { /* Keep the local browser preview available without worker services. */ }
      return { ...project, jobs: [] };
    }));
  }, []);

  const refresh = useCallback(async () => {
    const data = await listProjects();
    setProjects(await withVersions(data));
    setReady(true);
  }, [withVersions]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const visibleProjects = useMemo(() => {
    const filtered = projects.filter((project) => project.title.toLowerCase().includes(query.trim().toLowerCase()));
    return filtered.sort((a,b) => sort === "oldest" ? Date.parse(a.updatedAt)-Date.parse(b.updatedAt) : sort === "name-asc" ? a.title.localeCompare(b.title) : sort === "name-desc" ? b.title.localeCompare(a.title) : Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
  }, [projects, query, sort]);

  function openProject(project: LibraryProject) {
    setActiveProjectId(project.id);
    router.push("/studio/mixer");
  }

  async function startSession() {
    const project = await createProject();
    setActiveProjectId(project.id);
    router.push("/studio/mixer");
  }

  async function deleteProject(project: LibraryProject) {
    if (!window.confirm(`Delete “${project.title}” and its stored audio? This cannot be undone.`)) return;
    const deleted = await removeProject(project.id);
    if (!deleted) { setNotice("This session could not be removed. Wait for processing to finish and check local services."); return; }
    if (audio?.projectId === project.id) setAudio(null);
    await refresh();
  }

  async function getOutputUrl(projectId: string, jobId: string, inline: boolean) {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(jobId)}/download${inline ? "?inline=1" : ""}`);
    const body = await response.json().catch(() => ({})) as { url?: string; detail?: string; error?: string };
    if (!response.ok || !body.url) throw new Error(body.detail || body.error || "The output is unavailable.");
    return body.url;
  }

  async function loadPlayer(projectId: string, jobId: string) {
    setBusyVersion(jobId);
    try {
      const url = await getOutputUrl(projectId, jobId, true);
      setAudio({ projectId, jobId, url });
    } catch (issue) { setNotice(issue instanceof Error ? issue.message : "The output could not be opened."); }
    finally { setBusyVersion(""); }
  }

  async function download(projectId: string, jobId: string) {
    setBusyVersion(jobId);
    try { window.location.assign(await getOutputUrl(projectId, jobId, false)); }
    catch (issue) { setNotice(issue instanceof Error ? issue.message : "The download could not be started."); }
    finally { setBusyVersion(""); }
  }

  const statusLabel: Record<string, string> = { draft: "Draft", ready: "Ready", queued: "Queued", processing: "Mixing", completed: "Ready to play", failed: "Failed" };

  return <div className="library">
    <div className="page-head"><div><h1>Library</h1><p>Every session and every version you have made.</p></div><button className="btn btn-primary" onClick={startSession}>New session</button></div>
    {notice && <div className="notice-bar" role="status"><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}>×</button></div>}
    <div className="toolbar"><label className="search"><span className="visually-hidden">Search sessions</span><input type="search" placeholder="Search sessions" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="sort"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option></select></label></div>
    {!ready ? <p className="hint">Loading your sessions…</p> : visibleProjects.length ? <ul className="session-list">{visibleProjects.map((project) => {
      const trackCount = Math.max(project.tracks.length, project.trackCount || 0);
      const status = project.jobs[0]?.status || project.status;
      const open = expanded === project.id;
      return <li key={project.id} className="session-row">
        <div className="session-main">
          <button className="session-title" onClick={() => openProject(project)}>{project.title || "Untitled session"}</button>
          <p className="session-meta">{project.projectType === "master" ? "Master" : "Mix"} · {trackCount} {trackCount === 1 ? "track" : "tracks"} · {dateLabel(project.updatedAt)}{project.prompt ? ` · “${project.prompt.slice(0, 60)}${project.prompt.length > 60 ? "…" : ""}”` : ""}</p>
        </div>
        <span className={`status status-${status}`}>{statusLabel[status] || status}</span>
        <div className="session-actions">
          <button className="btn btn-secondary btn-small" onClick={() => openProject(project)}>Open</button>
          {project.jobs.length > 0 && <button className="btn btn-ghost btn-small" aria-expanded={open} onClick={() => setExpanded(open ? null : project.id)}>{open ? "Hide versions" : `Versions (${project.jobs.length})`}</button>}
          <button className="btn-text btn-danger" aria-label={`Delete ${project.title}`} onClick={() => void deleteProject(project)}>Delete</button>
        </div>
        {open && <ol className="versions" reversed>{project.jobs.map((version, index) => <li key={version.id} className="version-item">
          <div className="version-line"><b>Version {project.jobs.length - index}</b><span className="tag">{version.render === "full" ? "Full track" : version.processor === "roex_tonn" ? "AI preview" : "Local preview"}</span><span className={`status status-${version.status}`}>{statusLabel[version.status] || version.status}</span><span className="hint">{dateLabel(version.created_at)}{version.output_format ? ` · ${version.output_format.toUpperCase()}` : ""}</span></div>
          {version.refinement && <p className="version-meta">Your note: “{version.refinement}”</p>}
          {version.summary && <p className="version-meta">Settings: {version.summary}</p>}
          {version.status === "completed" && <div className="button-row"><button className="btn btn-secondary btn-small" disabled={busyVersion === version.id} onClick={() => void loadPlayer(project.id, version.id)}>{busyVersion === version.id ? "Loading…" : "Play"}</button><button className="btn btn-ghost btn-small" disabled={busyVersion === version.id} onClick={() => void download(project.id, version.id)}>Download</button></div>}
          {audio?.projectId === project.id && audio.jobId === version.id && <Transport src={audio.url} autoPlay label={`Version ${project.jobs.length - index} of ${project.title}`} />}
          {version.status === "failed" && <p className="error-text">This version failed. Open the session to retry.</p>}
        </li>)}</ol>}
      </li>;
    })}</ul> : <div className="empty"><h2>{query ? "No sessions match that search." : "No sessions yet."}</h2><p>{query ? "Try another name or clear the search." : "Start a session and every version you make will appear here."}</p>{query ? <button className="btn btn-secondary" onClick={() => setQuery("")}>Clear search</button> : <button className="btn btn-primary" onClick={startSession}>Start a session</button>}</div>}
    <p className="fine-print">Sessions and audio are private to your account.</p>
  </div>;
}
