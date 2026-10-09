"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createProject, getActiveProjectId, listProjects, ProjectRecord, removeProject, setActiveProjectId } from "@/lib/projects";

type SortOrder = "newest" | "oldest" | "name-asc" | "name-desc";

export default function ProjectLibrary() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [ready, setReady] = useState(false);

  useEffect(() => { void listProjects().then((data) => { setProjects(data); setReady(true); }); }, []);

  const visibleProjects = useMemo(() => {
    const filtered = projects.filter((project) => project.title.toLowerCase().includes(query.trim().toLowerCase()));
    return filtered.sort((a,b) => sort === "oldest" ? Date.parse(a.updatedAt)-Date.parse(b.updatedAt) : sort === "name-asc" ? a.title.localeCompare(b.title) : sort === "name-desc" ? b.title.localeCompare(a.title) : Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
  }, [projects, query, sort]);

  function openProject(project: ProjectRecord) {
    setActiveProjectId(project.id);
    router.push("/studio/mixer");
  }

  async function startSession() {
    const project = await createProject();
    setProjects(await listProjects());
    setActiveProjectId(project.id);
    router.push("/studio/mixer");
  }

  async function deleteProject(project: ProjectRecord) {
    if (!window.confirm(`Delete “${project.title}” from this preview?`)) return;
    await removeProject(project.id);
    setProjects(await listProjects());
  }

  return <div className="library-page">
    <div className="workspace-heading"><div><span className="studio-kicker">YOUR WORKSPACE <i>/</i> LIBRARY</span><h1>Keep the good takes close.</h1><p>Your sessions, versions, and next ideas all in one place.</p></div><button className="studio-button studio-button-lime" onClick={startSession}>＋ New session</button></div>
    <div className="library-toolbar"><label className="library-search"><span>⌕</span><input aria-label="Search sessions" placeholder="Search your sessions…" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label><label className="sort-select"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option></select></label></div>
    {!ready ? <div className="library-loading">Loading your sessions…</div> : visibleProjects.length ? <div className="project-grid">{visibleProjects.map((project) => <article key={project.id} className="project-card"><button className="project-card-open" onClick={() => openProject(project)}><div className="project-art"><div className="project-art-ring"><span>FM</span></div><div className="project-art-wave">{Array.from({length:42},(_,i)=><i key={i} style={{height:`${12 + Math.abs(Math.sin(i*1.4 + project.title.length))*75}%`}} />)}</div><span className="project-kind">{project.projectType === "master" ? "MASTER" : "MIX SESSION"}</span></div><div className="project-card-body"><div className="project-card-top"><h2>{project.title || "Untitled session"}</h2><span className={`project-status status-${project.status}`}>{project.status}</span></div><p>{project.tracks.length} {project.tracks.length === 1 ? "track" : "tracks"}{project.prompt ? ` · ${project.prompt.slice(0,62)}${project.prompt.length > 62 ? "…" : ""}` : " · Add a mix direction"}</p><div className="project-card-meta"><span>{new Intl.DateTimeFormat("en", { month:"short", day:"numeric", year:"numeric" }).format(new Date(project.updatedAt))}</span><span>Open session <b>↗</b></span></div></div></button><button className="project-delete" aria-label={`Delete ${project.title}`} onClick={() => void deleteProject(project)}>···</button></article>)}</div> : <div className="library-empty"><div className="empty-library-art"><span className="brand-mark"><i/><i/><i/><i/><i/></span></div><span className="studio-kicker">YOUR NEXT TAKE IS WAITING</span><h2>{query ? "No sessions match that search." : "Nothing in the library yet."}</h2><p>{query ? "Try another title or clear the search." : "Start a session and your work will stay together here."}</p>{query ? <button className="studio-button studio-button-outline" onClick={() => setQuery("")}>Clear search</button> : <button className="studio-button studio-button-lime" onClick={startSession}>＋ Start a new session</button>}</div>}
    <p className="library-storage-note">Local preview saves project details in this browser. Configure PostgreSQL for server-backed session records.</p>
  </div>;
}
