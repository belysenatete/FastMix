"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import Transport from "@/components/transport";
import type { Locale } from "@/lib/locale";
import { createProject, listProjects, ProjectRecord, removeProject, setActiveProjectId } from "@/lib/projects";
import { serverMessage } from "@/lib/studio-messages";

type SortOrder = "newest" | "oldest" | "name-asc" | "name-desc";
type VersionRecord = { id: string; status: string; progress: number; processor: string; attempt: number; render?: "preview" | "full"; summary?: string | null; refinement?: string | null; error_code?: string | null; output_format?: string | null; output_size_bytes?: number | null; created_at: string };
type LibraryProject = ProjectRecord & { jobs: VersionRecord[] };

const copy = {
  en: {
    savedSession: "Saved session",
    untitled: "Untitled session",
    confirmDelete: (title: string) => `Delete “${title}” and its stored audio? This cannot be undone.`,
    deleteFailed: "This session could not be removed. Wait for processing to finish and check local services.",
    outputUnavailable: "The output is unavailable.",
    openFailed: "The output could not be opened.",
    downloadFailed: "The download could not be started.",
    status: { draft: "Draft", ready: "Ready", queued: "Queued", processing: "Mixing", completed: "Ready to play", failed: "Failed" } as Record<string, string>,
    title: "Library",
    description: "Every session and every version you have made.",
    newSession: "New session",
    dismiss: "Dismiss",
    search: "Search sessions",
    sort: "Sort",
    sortOptions: { newest: "Newest first", oldest: "Oldest first", nameAsc: "Name A–Z", nameDesc: "Name Z–A" },
    loading: "Loading your sessions…",
    master: "Master",
    mix: "Mix",
    tracks: (count: number) => `${count} ${count === 1 ? "track" : "tracks"}`,
    quote: (text: string) => `“${text}”`,
    open: "Open",
    hideVersions: "Hide versions",
    versions: (count: number) => `Versions (${count})`,
    deleteLabel: (title: string) => `Delete ${title}`,
    delete: "Delete",
    version: (number: number) => `Version ${number}`,
    fullTrack: "Full track",
    aiPreview: "AI preview",
    localPreview: "Local preview",
    yourNote: (note: string) => `Your note: “${note}”`,
    settings: (summary: string) => `Settings: ${summary}`,
    loadingShort: "Loading…",
    play: "Play",
    download: "Download",
    playerLabel: (number: number, title: string) => `Version ${number} of ${title}`,
    failed: "This version failed. Open the session to retry.",
    noMatch: "No sessions match that search.",
    noSessions: "No sessions yet.",
    noMatchHint: "Try another name or clear the search.",
    noSessionsHint: "Start a session and every version you make will appear here.",
    clearSearch: "Clear search",
    startSession: "Start a session",
    privacy: "Sessions and audio are private to your account.",
  },
  fr: {
    savedSession: "Session enregistrée",
    untitled: "Session sans titre",
    confirmDelete: (title: string) => `Supprimer « ${title} » et son audio enregistré ? Cette action est irréversible.`,
    deleteFailed: "Impossible de supprimer cette session. Attendez la fin du traitement et vérifiez les services locaux.",
    outputUnavailable: "Le fichier n'est pas disponible.",
    openFailed: "Impossible d'ouvrir le fichier.",
    downloadFailed: "Impossible de lancer le téléchargement.",
    status: { draft: "Brouillon", ready: "Prête", queued: "En attente", processing: "Mixage en cours", completed: "Prête à écouter", failed: "Échec" } as Record<string, string>,
    title: "Bibliothèque",
    description: "Toutes vos sessions et toutes vos versions.",
    newSession: "Nouvelle session",
    dismiss: "Fermer",
    search: "Rechercher une session",
    sort: "Trier",
    sortOptions: { newest: "Plus récentes", oldest: "Plus anciennes", nameAsc: "Nom de A à Z", nameDesc: "Nom de Z à A" },
    loading: "Chargement de vos sessions…",
    master: "Master",
    mix: "Mix",
    tracks: (count: number) => `${count} ${count <= 1 ? "piste" : "pistes"}`,
    quote: (text: string) => `« ${text} »`,
    open: "Ouvrir",
    hideVersions: "Masquer les versions",
    versions: (count: number) => `Versions (${count})`,
    deleteLabel: (title: string) => `Supprimer ${title}`,
    delete: "Supprimer",
    version: (number: number) => `Version ${number}`,
    fullTrack: "Titre complet",
    aiPreview: "Aperçu IA",
    localPreview: "Aperçu local",
    yourNote: (note: string) => `Votre note : « ${note} »`,
    settings: (summary: string) => `Réglages : ${summary}`,
    loadingShort: "Chargement…",
    play: "Écouter",
    download: "Télécharger",
    playerLabel: (number: number, title: string) => `Version ${number} de ${title}`,
    failed: "Cette version a échoué. Ouvrez la session pour réessayer.",
    noMatch: "Aucune session ne correspond à cette recherche.",
    noSessions: "Aucune session pour l'instant.",
    noMatchHint: "Essayez un autre nom ou effacez la recherche.",
    noSessionsHint: "Lancez une session : chaque version que vous créerez apparaîtra ici.",
    clearSearch: "Effacer la recherche",
    startSession: "Lancer une session",
    privacy: "Vos sessions et votre audio sont privés et réservés à votre compte.",
  },
};

function dateLabel(value: string, locale: Locale) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? copy[locale].savedSession : new Intl.DateTimeFormat(locale, { month:"short", day:"numeric", year:"numeric" }).format(date);
}

export default function ProjectLibrary() {
  const router = useRouter();
  const locale = useLocale();
  const t = copy[locale];
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
    const project = await createProject(t.untitled);
    setActiveProjectId(project.id);
    router.push("/studio/mixer");
  }

  async function deleteProject(project: LibraryProject) {
    if (!window.confirm(t.confirmDelete(project.title))) return;
    const deleted = await removeProject(project.id);
    if (!deleted) { setNotice(t.deleteFailed); return; }
    if (audio?.projectId === project.id) setAudio(null);
    await refresh();
  }

  async function getOutputUrl(projectId: string, jobId: string, inline: boolean) {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(jobId)}/download${inline ? "?inline=1" : ""}`);
    const body = await response.json().catch(() => ({})) as { url?: string; detail?: string; error?: string };
    if (!response.ok || !body.url) throw new Error((typeof body.detail === "string" && serverMessage(body.detail, locale)) || (body.error && serverMessage(body.error, locale)) || t.outputUnavailable);
    return body.url;
  }

  async function loadPlayer(projectId: string, jobId: string) {
    setBusyVersion(jobId);
    try {
      const url = await getOutputUrl(projectId, jobId, true);
      setAudio({ projectId, jobId, url });
    } catch (issue) { setNotice(issue instanceof Error ? issue.message : t.openFailed); }
    finally { setBusyVersion(""); }
  }

  async function download(projectId: string, jobId: string) {
    setBusyVersion(jobId);
    try { window.location.assign(await getOutputUrl(projectId, jobId, false)); }
    catch (issue) { setNotice(issue instanceof Error ? issue.message : t.downloadFailed); }
    finally { setBusyVersion(""); }
  }

  const statusLabel = t.status;

  return <div className="library">
    <div className="page-head"><div><h1>{t.title}</h1><p>{t.description}</p></div><button className="btn btn-primary" onClick={startSession}>{t.newSession}</button></div>
    {notice && <div className="notice-bar" role="status"><span>{notice}</span><button aria-label={t.dismiss} onClick={() => setNotice("")}>×</button></div>}
    <div className="toolbar"><label className="search"><span className="visually-hidden">{t.search}</span><input type="search" placeholder={t.search} value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="sort"><span>{t.sort}</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}><option value="newest">{t.sortOptions.newest}</option><option value="oldest">{t.sortOptions.oldest}</option><option value="name-asc">{t.sortOptions.nameAsc}</option><option value="name-desc">{t.sortOptions.nameDesc}</option></select></label></div>
    {!ready ? <p className="hint">{t.loading}</p> : visibleProjects.length ? <ul className="session-list">{visibleProjects.map((project) => {
      const trackCount = Math.max(project.tracks.length, project.trackCount || 0);
      const status = project.jobs[0]?.status || project.status;
      const open = expanded === project.id;
      return <li key={project.id} className="session-row">
        <div className="session-main">
          <button className="session-title" onClick={() => openProject(project)}>{project.title || t.untitled}</button>
          <p className="session-meta">{project.projectType === "master" ? t.master : t.mix} · {t.tracks(trackCount)} · {dateLabel(project.updatedAt, locale)}{project.prompt ? ` · ${t.quote(`${project.prompt.slice(0, 60)}${project.prompt.length > 60 ? "…" : ""}`)}` : ""}</p>
        </div>
        <span className={`status status-${status}`}>{statusLabel[status] || status}</span>
        <div className="session-actions">
          <button className="btn btn-secondary btn-small" onClick={() => openProject(project)}>{t.open}</button>
          {project.jobs.length > 0 && <button className="btn btn-ghost btn-small" aria-expanded={open} onClick={() => setExpanded(open ? null : project.id)}>{open ? t.hideVersions : t.versions(project.jobs.length)}</button>}
          <button className="btn-text btn-danger" aria-label={t.deleteLabel(project.title)} onClick={() => void deleteProject(project)}>{t.delete}</button>
        </div>
        {open && <ol className="versions" reversed>{project.jobs.map((version, index) => <li key={version.id} className="version-item">
          <div className="version-line"><b>{t.version(project.jobs.length - index)}</b><span className="tag">{version.render === "full" ? t.fullTrack : version.processor === "roex_tonn" ? t.aiPreview : t.localPreview}</span><span className={`status status-${version.status}`}>{statusLabel[version.status] || version.status}</span><span className="hint">{dateLabel(version.created_at, locale)}{version.output_format ? ` · ${version.output_format.toUpperCase()}` : ""}</span></div>
          {version.refinement && <p className="version-meta">{t.yourNote(version.refinement)}</p>}
          {version.summary && <p className="version-meta">{t.settings(version.summary)}</p>}
          {version.status === "completed" && <div className="button-row"><button className="btn btn-secondary btn-small" disabled={busyVersion === version.id} onClick={() => void loadPlayer(project.id, version.id)}>{busyVersion === version.id ? t.loadingShort : t.play}</button><button className="btn btn-ghost btn-small" disabled={busyVersion === version.id} onClick={() => void download(project.id, version.id)}>{t.download}</button></div>}
          {audio?.projectId === project.id && audio.jobId === version.id && <Transport src={audio.url} autoPlay label={t.playerLabel(project.jobs.length - index, project.title)} />}
          {version.status === "failed" && <p className="error-text">{t.failed}</p>}
        </li>)}</ol>}
      </li>;
    })}</ul> : <div className="empty"><h2>{query ? t.noMatch : t.noSessions}</h2><p>{query ? t.noMatchHint : t.noSessionsHint}</p>{query ? <button className="btn btn-secondary" onClick={() => setQuery("")}>{t.clearSearch}</button> : <button className="btn btn-primary" onClick={startSession}>{t.startSession}</button>}</div>}
    <p className="fine-print">{t.privacy}</p>
  </div>;
}
