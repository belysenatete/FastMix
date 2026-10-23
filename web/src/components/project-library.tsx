"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createProject, listProjects, ProjectRecord, removeProject, setActiveProjectId } from "@/lib/projects";

type SortOrder = "newest" | "oldest" | "name-asc" | "name-desc";
type VersionRecord = { id: string; status: string; progress: number; processor: string; attempt: number; render?: "preview" | "full"; error_code?: string | null; output_format?: string | null; output_size_bytes?: number | null; created_at: string };
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

  return <div className="library-page">
    <div className="workspace-heading"><div><span className="studio-kicker">YOUR WORKSPACE <i>/</i> LIBRARY</span><h1>Keep the good takes close.</h1><p>Your sessions, versions, and next ideas all in one place.</p></div><button className="studio-button studio-button-lime" onClick={startSession}>＋ New session</button></div>
    {notice && <div className="inline-notice" role="status">{notice}<button aria-label="Dismiss" onClick={() => setNotice("")}>×</button></div>}
    <div className="library-toolbar"><label className="library-search"><span>⌕</span><input aria-label="Search sessions" placeholder="Search your sessions…" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label><label className="sort-select"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option></select></label></div>
    {!ready ? <div className="library-loading">Loading your sessions…</div> : visibleProjects.length ? <div className="project-grid">{visibleProjects.map((project) => {
      const trackCount = Math.max(project.tracks.length, project.trackCount || 0);
      const latest = project.jobs[0];
      return <article key={project.id} className="project-card">
        <button className="project-card-open" onClick={() => openProject(project)}><div className="project-art"><div className="project-art-ring"><span>FM</span></div><div className="project-art-wave">{Array.from({length:42},(_,i)=><i key={i} style={{height:`${12 + Math.abs(Math.sin(i*1.4 + project.title.length))*75}%`}} />)}</div><span className="project-kind">{project.projectType === "master" ? "MASTER" : "MIX SESSION"}</span></div><div className="project-card-body"><div className="project-card-top"><h2>{project.title || "Untitled session"}</h2><span className={`project-status status-${latest?.status || project.status}`}>{latest?.status || project.status}</span></div><p>{trackCount} {trackCount === 1 ? "track" : "tracks"}{project.prompt ? ` · ${project.prompt.slice(0,62)}${project.prompt.length > 62 ? "…" : ""}` : " · Add a mix direction"}</p><div className="project-card-meta"><span>{dateLabel(project.updatedAt)}</span><span>Open session <b>↗</b></span></div></div></button>
        <button className="project-delete" aria-label={`Delete ${project.title}`} onClick={() => void deleteProject(project)}>···</button>
        {project.jobs.length > 0 && <div className="version-history"><button className="version-history-toggle" aria-expanded={expanded === project.id} onClick={() => setExpanded(expanded === project.id ? null : project.id)}>Versions <span>{project.jobs.length.toString().padStart(2,"0")}</span><i>{expanded === project.id ? "−" : "+"}</i></button>{expanded === project.id && <div className="version-list">{project.jobs.map((version,index) => <div className="version-row" key={version.id}><div className="version-row-title"><b>Version {project.jobs.length-index}{version.render === "full" ? " · Full track" : version.processor === "roex_tonn" ? " · AI preview" : ""}</b><span className={`project-status status-${version.status}`}>{version.status}</span></div><small>{dateLabel(version.created_at)}{version.output_format ? ` · ${version.output_format.toUpperCase()}` : ""}</small>{version.status === "completed" && <div className="version-actions"><button disabled={busyVersion === version.id} onClick={() => void loadPlayer(project.id,version.id)}>{busyVersion === version.id ? "Loading…" : "Play"}</button><button disabled={busyVersion === version.id} onClick={() => void download(project.id,version.id)}>Download</button></div>}{audio?.projectId === project.id && audio.jobId === version.id && <audio className="version-audio" controls autoPlay src={audio.url} aria-label={`Play preview version ${project.jobs.length-index}`} />}{version.status === "failed" && <span className="version-error">Preview processing failed</span>}</div>)}</div>}</div>}
      </article>;
    })}</div> : <div className="library-empty"><div className="empty-library-art"><span className="brand-mark"><i/><i/><i/><i/><i/></span></div><span className="studio-kicker">YOUR NEXT TAKE IS WAITING</span><h2>{query ? "No sessions match that search." : "Nothing in the library yet."}</h2><p>{query ? "Try another title or clear the search." : "Start a session and your work will stay together here."}</p>{query ? <button className="studio-button studio-button-outline" onClick={() => setQuery("")}>Clear search</button> : <button className="studio-button studio-button-lime" onClick={startSession}>＋ Start a new session</button>}</div>}
    <p className="library-storage-note">Sessions and audio files are private to your account. Local preview details are also cached in this browser.</p>
  </div>;
}
