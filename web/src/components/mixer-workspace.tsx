"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createProject, getActiveProjectId, listProjects, persistProject, ProjectRecord, removeProject, setActiveProjectId, TrackCategory, TrackRecord } from "@/lib/projects";

const categories: Array<{ id: TrackCategory; name: string; detail: string; icon: string }> = [
  { id: "beat", name: "Beat", detail: "The full beat, already mixed", icon: "◉" },
  { id: "lead_vocal", name: "Lead vocals", detail: "The song's main vocal", icon: "◖" },
  { id: "doubles", name: "Doubles", detail: "Takes that thicken the lead", icon: "◫" },
  { id: "backing_vocals", name: "Backing vocals", detail: "Harmonies and support", icon: "♬" },
  { id: "adlibs", name: "Ad-libs", detail: "Short bits between lines", icon: "✳" },
  { id: "instrument", name: "Instrument", detail: "A single instrument", icon: "⌁" },
  { id: "master", name: "Finished track", detail: "One mix for loudness normalization", icon: "◉" },
];

type JobItem = { id: string; status: string; progress: number; processor: string; attempt: number; render: "preview" | "full"; summary: string | null; refinement: string | null; error_code?: string | null; output_format?: string | null; output_size_bytes?: number | null };
const optionalText = (value: unknown) => typeof value === "string" ? value : null;
function jobFromApi(row: Record<string, unknown>): JobItem { return { id: String(row.id), status: String(row.status), progress: Number(row.progress || 0), processor: String(row.processor || "ffmpeg_preview"), attempt: Number(row.attempt || 0), render: row.render === "full" ? "full" : "preview", summary: optionalText(row.summary), refinement: optionalText(row.refinement), error_code: optionalText(row.error_code), output_format: optionalText(row.output_format), output_size_bytes: typeof row.output_size_bytes === "number" ? row.output_size_bytes : null }; }

function formatBytes(bytes: number) { return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }

const failureMessages: Record<string, string> = {
  provider_credits: "Your RoEx credit balance is too low. Add credits in the Tonn portal, then retry.",
  provider_auth: "RoEx rejected the API key. Check ROEX_API_KEY, rebuild the API and processor, then retry.",
  provider_not_configured: "RoEx AI isn't configured. Add ROEX_API_KEY to the root .env and rebuild the API and processor.",
  provider_expired: "The RoEx download link expired. Retry to request it again.",
  invalid_audio: "RoEx couldn't process this audio. Use clean tracks under 8 minutes each, then retry.",
  queue_unavailable: "The processing queue was unavailable. Retry in a moment.",
};

type JobPanelProps = { job: JobItem; projectType: "mix" | "master"; title: string; outputUrl: string | null; outputPending: boolean; jobPending: boolean; onPlay: () => void; onDownload: () => void; onRetry: () => void; onFullTrack: () => void; onRefine: (note: string) => Promise<boolean> };

function RefineForm({ disabled, onRefine }: { disabled: boolean; onRefine: (note: string) => Promise<boolean> }) {
  const [note, setNote] = useState("");
  return <form className="refine-form" onSubmit={(event) => { event.preventDefault(); void onRefine(note.trim()).then((created) => { if (created) setNote(""); }); }}>
    <label htmlFor="refine-note">What should change in the next version?</label>
    <div><input id="refine-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Vocal louder, more reverb, harder autotune, more punch…" /><button type="submit" className="job-action job-action-primary" disabled={disabled || !note.trim()}>New version <span>↗</span></button></div>
    <small>Earlier versions stay in your library.</small>
  </form>;
}

function JobPanel({ job, projectType, title, outputUrl, outputPending, jobPending, onPlay, onDownload, onRetry, onFullTrack, onRefine }: JobPanelProps) {
  const ai = job.processor === "roex_tonn";
  const full = job.render === "full";
  const active = job.status === "queued" || job.status === "processing";
  const kind = projectType === "master" ? "master" : "mix";
  const heading = full
    ? job.status === "completed" ? "Full-length track ready" : job.status === "failed" ? "Full-length render failed" : "Rendering the full-length track"
    : job.status === "completed" ? ai ? `AI ${kind} preview ready` : "Local audio preview ready" : job.status === "failed" ? "Preview processing failed" : job.status === "queued" ? "In the preview queue" : "Shaping your preview";
  const completedText = full
    ? "Your full-length track is ready to play and download."
    : ai ? "This is a 30-second AI preview. When it sounds right, get the full-length track; it uses RoEx credits (about $2–2.50) once for this version." : "Local preview: FastMix's basic engine applied your vocal level, reverb, autotune and loudness. AI mixing starts once RoEx is connected.";
  return <div className={`job-panel job-${job.status}`} aria-live="polite">
    <div className="job-panel-top"><div><span className="job-indicator" /><b>{heading}</b></div><span className="job-processor">{ai ? full ? "ROEX AI · FULL TRACK" : "ROEX AI PREVIEW" : "FFMPEG PREVIEW"}</span></div>
    {(job.refinement || job.summary) && <p className="job-settings">{job.refinement && <>Your note: “{job.refinement}”<br /></>}{job.summary && <>Settings: {job.summary}</>}</p>}
    {active ? <><div className="job-progress-track"><i style={{ width: `${Math.max(4, job.progress)}%` }} /></div><p>{job.status === "queued" ? "Waiting for the processor…" : `Processing your audio · ${job.progress}%`}</p></>
      : job.status === "completed" ? <><p>{completedText}</p><div className="job-actions"><button className="job-action" disabled={outputPending} onClick={onPlay}>{outputPending ? "Preparing playback…" : full ? "Play full track" : "Play preview"}</button><button className="job-action" onClick={onDownload}>Download {job.output_format?.toUpperCase() || "WAV"} <span>↓</span></button>{ai && !full && <button className="job-action job-action-primary" disabled={jobPending} onClick={onFullTrack}>Get full track <span>↗</span></button>}</div>{outputUrl && <audio className="version-audio" controls preload="none" src={outputUrl} aria-label={`Play ${full ? "full track" : "preview"} for ${title}`} />}{projectType === "mix" && <RefineForm disabled={jobPending} onRefine={onRefine} />}</>
      : <><p>{failureMessages[job.error_code || ""] || "Processing could not be completed. Check the audio format and processor setup, then retry."}</p><button className="job-action" disabled={jobPending} onClick={onRetry}>Retry <span>↻</span></button></>}
  </div>;
}

export default function MixerWorkspace() {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<TrackCategory>("beat");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<JobItem | null>(null);
  const [jobPending, setJobPending] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputPending, setOutputPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const wordCount = useMemo(() => project?.prompt.length || 0, [project?.prompt]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const projects = await listProjects();
      const activeId = getActiveProjectId();
      let active = projects.find((item) => item.id === activeId) || projects[0];
      if (!active) active = await createProject();
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(active.id)}/tracks`, { cache: "no-store" });
        if (response.ok) {
          const body = await response.json() as { tracks: Array<{ id: string; category: TrackCategory; original_name: string; mime_type: string; size_bytes: number; created_at: string }> };
          active = { ...active, tracks: body.tracks.map((track) => ({ id: track.id, category: track.category, name: track.original_name, mimeType: track.mime_type, sizeBytes: track.size_bytes, lastModified: Date.parse(track.created_at) || 0 })) };
          persistProject(active);
        }
      } catch { /* Keep local preview data visible when the private storage service is offline. */ }
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(active.id)}/jobs`, { cache: "no-store" });
        if (response.ok) {
          const body = await response.json() as { jobs: Array<Record<string, unknown>> };
          if (body.jobs[0]) setJob(jobFromApi(body.jobs[0]));
        }
      } catch { /* Jobs require the local API and queue services. */ }
      setActiveProjectId(active.id);
      if (mounted) setProject(active);
    })();
    return () => { mounted = false; };
  }, []);

  const projectId = project?.id;
  const jobId = job?.id;
  const jobStatus = job?.status;
  useEffect(() => {
    if (!projectId || !jobId || !jobStatus || !["queued", "processing"].includes(jobStatus)) return;
    const timer = window.setInterval(() => {
      void fetch(`/api/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" })
        .then(async (response) => response.ok ? response.json() as Promise<{ job: Record<string, unknown> }> : null)
        .then((body) => { if (body?.job) setJob(jobFromApi(body.job)); })
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [projectId, jobId, jobStatus]);

  function updateProject(update: Partial<ProjectRecord>) {
    if (!project) return;
    const next = persistProject({ ...project, ...update });
    setProject(next);
  }

  function chooseCategory(id: TrackCategory) {
    setCategory(id);
    setMenuOpen(false);
    window.setTimeout(() => inputRef.current?.click(), 0);
  }

  function chooseProjectType(projectType: "mix" | "master") {
    updateProject({ projectType });
    setCategory(projectType === "master" ? "master" : "beat");
  }

  async function startProcessing(retry = false) {
    if (!project) return;
    setJobPending(true);
    setNotice(retry ? "Re-adding this job to the local processor…" : "Adding your session to the local preview queue…");
    try {
      if (project.projectType === "master" && project.tracks.length !== 1) throw new Error("A mastering preview needs exactly one finished track.");
      const saved = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: project.title, prompt: project.prompt, projectType: project.projectType }),
      });
      if (!saved.ok) {
        const saveError = await saved.json().catch(() => ({})) as { detail?: string; error?: string };
        throw new Error(saveError.detail || saveError.error || "Start PostgreSQL before queueing a preview.");
      }
      const base = `/api/projects/${encodeURIComponent(project.id)}/jobs`;
      const url = retry && job ? `${base}/${encodeURIComponent(job.id)}/retry` : base;
      const response = await fetch(url, { method: "POST" });
      const body = await response.json().catch(() => ({})) as { job?: Record<string, unknown>; detail?: string; error?: string };
      if (!response.ok || !body.job) throw new Error(body.detail || body.error || "The processor could not accept this session.");
      const createdJob = jobFromApi(body.job);
      setJob(createdJob);
      updateProject({ status: "queued" });
      setNotice(createdJob.processor === "roex_tonn" ? "RoEx AI preview queued. Your audio will be sent to RoEx for processing; this requests a preview only." : "Local audio preview queued. This applies basic FFmpeg mixing and loudness normalization, not AI processing.");
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : "The processor could not accept this session.");
    } finally { setJobPending(false); }
  }

  async function refineVersion(note: string) {
    if (!project || !job || job.status !== "completed" || !note) return false;
    setJobPending(true);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/jobs/${encodeURIComponent(job.id)}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const body = await response.json().catch(() => ({})) as { job?: Record<string, unknown>; changes?: string[]; detail?: unknown; error?: string };
      if (!response.ok || !body.job) throw new Error(typeof body.detail === "string" ? body.detail : body.error || "The new version could not be created.");
      setJob(jobFromApi(body.job));
      setOutputUrl(null);
      updateProject({ status: "queued" });
      setNotice(`New version queued: ${(body.changes || []).join(", ")}.`);
      return true;
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : "The new version could not be created.");
      return false;
    } finally { setJobPending(false); }
  }

  async function requestFullTrack() {
    if (!project || !job || job.render !== "preview" || job.status !== "completed") return;
    if (!window.confirm("Render the full-length track? This uses RoEx credits (about $2–2.50) once for this version.")) return;
    setJobPending(true);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/jobs/${encodeURIComponent(job.id)}/full`, { method: "POST" });
      const body = await response.json().catch(() => ({})) as { job?: Record<string, unknown>; detail?: string; error?: string };
      if (!response.ok || !body.job) throw new Error(body.detail || body.error || "The full-length track could not be requested.");
      setJob(jobFromApi(body.job));
      setOutputUrl(null);
      updateProject({ status: "queued" });
      setNotice("Full-length track requested. It will appear here and in your library when it's ready.");
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : "The full-length track could not be requested.");
    } finally { setJobPending(false); }
  }

  async function downloadOutput() {
    if (!project || !job) return;
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/jobs/${encodeURIComponent(job.id)}/download`);
      const body = await response.json().catch(() => ({})) as { url?: string; detail?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.detail || body.error || "The output download could not be prepared.");
      window.location.assign(body.url);
    } catch (issue) { setNotice(issue instanceof Error ? issue.message : "The output download could not be prepared."); }
  }

  async function playOutput() {
    if (!project || !job || job.status !== "completed") return;
    setOutputPending(true);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/jobs/${encodeURIComponent(job.id)}/download?inline=1`);
      const body = await response.json().catch(() => ({})) as { url?: string; detail?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.detail || body.error || "The preview could not be opened.");
      setOutputUrl(body.url);
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : "The preview could not be opened.");
    } finally {
      setOutputPending(false);
    }
  }

  async function addTrack(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !project) return;
    const allowed = /\.(wav|mp3|flac|aiff?|m4a|ogg)$/i.test(file.name);
    if (!file.type.startsWith("audio/") && !allowed) { setNotice("Choose an audio file such as WAV, MP3, FLAC, AIFF, M4A, or OGG."); return; }
    if (file.size > 100 * 1024 * 1024) { setNotice("This preview accepts files up to 100 MB."); return; }
    const form = new FormData();
    form.set("category", category);
    form.set("file", file, file.name);
    setUploading(true);
    setNotice("Uploading to private audio storage…");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/tracks`, { method: "POST", body: form });
      const body = await response.json().catch(() => ({})) as { track?: { id: string; category: TrackCategory; original_name: string; mime_type: string; size_bytes: number; created_at?: string }; detail?: string; error?: string };
      if (!response.ok || !body.track) throw new Error(body.detail || body.error || "The audio upload could not be completed.");
      const track: TrackRecord = { id: body.track.id, name: body.track.original_name, category: body.track.category, mimeType: body.track.mime_type, sizeBytes: body.track.size_bytes, lastModified: body.track.created_at ? Date.parse(body.track.created_at) : file.lastModified };
      const next = persistProject({ ...project, tracks: [...project.tracks, track], status: "ready" });
      setProject(next);
      setNotice("Track uploaded to private storage and added to this session.");
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : "The audio upload could not be completed.");
    } finally { setUploading(false); }
  }

  async function startNewSession() {
    const next = await createProject();
    setProject(next);
    setJob(null);
    setNotice("New mix session ready.");
  }

  async function deleteCurrentSession() {
    if (!project) return;
    const deleted = await removeProject(project.id);
    if (!deleted) { setNotice("This session could not be removed. Wait for processing to finish and check local services."); return; }
    const remaining = await listProjects();
    const next = remaining[0] || await createProject();
    setProject(next);
    setJob(null);
    setActiveProjectId(next.id);
    setNotice("Session removed from this preview.");
  }

  async function removeTrack(id: string) {
    if (!project) return;
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/tracks/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string; error?: string };
        setNotice(body.detail || body.error || "The track could not be deleted.");
        return;
      }
    } catch { setNotice("The track service is unavailable. Nothing was removed."); return; }
    updateProject({ tracks: project.tracks.filter((track) => track.id !== id) });
    setNotice("Track removed from this session.");
  }

  if (!project) return <div className="studio-loading" aria-live="polite">Opening your studio…</div>;

  const ready = project.tracks.length > 0 && project.prompt.trim().length > 0;
  const busy = jobPending || job?.status === "queued" || job?.status === "processing";
  const categoryOptions = project.projectType === "master" ? categories.filter((item) => item.id === "master") : categories.filter((item) => item.id !== "master");
  return <div className="mixer-page">
    <div className="workspace-heading"><div><span className="studio-kicker">YOUR STUDIO <i>/</i> NEW SESSION</span><h1>{project.projectType === "master" ? "Give your finished track a final shape." : "What are we making today?"}</h1><p>{project.projectType === "master" ? "Add one finished mix and describe the master direction." : "Bring the pieces, then tell us what you want them to feel like."}</p></div><div className="heading-actions"><button className="studio-button studio-button-outline" onClick={startNewSession}>＋ <span>New session</span></button><button className="more-button" aria-label="Session options" onClick={deleteCurrentSession}>···</button></div></div>
    {notice && <div className="inline-notice" role="status"><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}>×</button></div>}
    <div className="mixer-layout">
      <section className="mixer-main-card">
        <div className="session-title-row"><div><label htmlFor="session-title">SESSION NAME</label><input ref={titleRef} id="session-title" value={project.title} maxLength={120} onChange={(event) => updateProject({ title: event.target.value })} /></div><div className="session-controls"><div className="project-mode" role="group" aria-label="Session type"><button aria-pressed={project.projectType === "mix"} onClick={() => chooseProjectType("mix")}>Mix</button><button aria-pressed={project.projectType === "master"} onClick={() => chooseProjectType("master")}>Master</button></div><span className="draft-status"><i /> Draft saved</span></div></div>
        <div className="tracks-heading"><div><h2>{project.projectType === "master" ? "Finished track" : "Your tracks"} <span>{project.tracks.length.toString().padStart(2,"0")}</span></h2><p>{project.projectType === "master" ? "Master preview accepts one finished audio file." : "Keep each part on its own track for more control."}</p></div><div className="track-add-wrap"><button className="studio-button studio-button-lime" disabled={uploading} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{uploading ? "Uploading…" : "＋ Add a track"}</button>{menuOpen && <div className="track-type-menu" role="menu"><div className="track-menu-title">ADD A TRACK</div>{categoryOptions.map((item) => <button key={item.id} role="menuitem" onClick={() => chooseCategory(item.id)}><span className="category-icon">{item.icon}</span><span><b>{item.name}</b><small>{item.detail}</small></span><span className="category-plus">＋</span></button>)}</div>}</div><input ref={inputRef} className="visually-hidden" type="file" accept="audio/*,.wav,.mp3,.flac,.aiff,.aif,.m4a,.ogg" onChange={addTrack} aria-label={`Choose ${category} audio file`} /></div>
        {project.tracks.length === 0 ? <div className="empty-tracks"><div className="empty-track-icon">♫</div><b>Your session starts with a track</b><p>Add a beat, a vocal, or one instrument to see how it fits.</p><button className="empty-add" onClick={() => setMenuOpen(true)}>＋ Choose track type</button></div> : <div className="track-list">{project.tracks.map((track) => { const categoryName = categories.find((item) => item.id === track.category)?.name || "Track"; return <article className="track-row" key={track.id}><div className={`track-type-icon type-${track.category}`}>{categories.find((item) => item.id === track.category)?.icon}</div><div className="track-file-info"><b>{categoryName}</b><span title={track.name}>{track.name}</span></div><div className="track-meter" aria-hidden="true">{Array.from({length:36},(_,i)=><i key={i} style={{height:`${15 + Math.abs(Math.sin(i*1.81 + track.name.length))*68}%`}} />)}</div><span className="track-file-size">{formatBytes(track.sizeBytes)}</span><button className="track-remove" aria-label={`Remove ${track.name}`} onClick={() => removeTrack(track.id)}>×</button></article>; })}<button className="add-another" onClick={() => setMenuOpen(true)}>＋ Add another track</button></div>}
        <div className="direction-block"><div className="direction-heading"><div><label htmlFor="mix-direction">{project.projectType === "master" ? "YOUR MASTER DIRECTION" : "YOUR MIX DIRECTION"}</label><p>Use your own words. Be as specific or as open as you like.</p></div><button onClick={() => updateProject({ prompt: "" })} disabled={!project.prompt}>Clear</button></div><textarea id="mix-direction" maxLength={4000} value={project.prompt} onChange={(event) => updateProject({ prompt: event.target.value })} placeholder="A warm, close vocal with a little space on the ends of each line. Keep the beat punchy but let the hook breathe…" /><div className="prompt-footer"><span>Try describing the mood, vocal feel, effects, or energy.</span><span>{wordCount}/4000</span></div></div>
        {job && <JobPanel job={job} projectType={project.projectType} title={project.title} outputUrl={outputUrl} outputPending={outputPending} jobPending={jobPending} onPlay={() => void playOutput()} onDownload={downloadOutput} onRetry={() => void startProcessing(true)} onFullTrack={() => void requestFullTrack()} onRefine={refineVersion} />}
        <div className="mix-action-row"><div className="mix-readiness"><span className={ready ? "readiness-ready" : "readiness-waiting"}>{ready ? "● Ready for a direction" : "○ Add tracks and a direction"}</span><small>Name a style (trap, drill, afro, reggaeton, pop…), autotune (subtle or hard, optionally with the key), the vocal level, reverb and loudness. FastMix turns them into AI mix settings and starts with a free 30-second preview.</small></div><button className={`studio-button ${ready && !busy ? "studio-button-lime" : "studio-button-disabled"}`} disabled={!ready || busy || uploading} onClick={() => void startProcessing()}>{jobPending ? "Queueing…" : project.projectType === "master" ? "Create master preview" : "Create audio preview"} <span>↗</span></button></div>
      </section>
      <aside className="mixer-aside"><div className="aside-card sound-card"><span className="studio-kicker">A GOOD PLACE TO START</span><h3>Find the words<br/>for your sound.</h3><p>Not sure how to describe it? Browse prompt ideas for a starting point.</p><Link href="/studio/guide" className="aside-link">Explore the sound guide <span>↗</span></Link><div className="sound-card-orbit"><span>FM</span></div></div><div className="aside-card tips-card"><span className="aside-tip-icon">✳</span><h3>A small recording tip</h3><p>Give each vocal take its own file, and start with the cleanest recording you have.</p></div><button className="delete-session" onClick={deleteCurrentSession}>Delete this session</button></aside>
    </div>
  </div>;
}
