"use client";

import Link from "next/link";
import { ChangeEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import SettingsKnobs, { VersionSettings } from "@/components/settings-knobs";
import WaitingLine from "@/components/waiting-line";
import Transport from "@/components/transport";
import { fetchUsage, resetDate, Usage } from "@/lib/usage";
import { createProject, getActiveProjectId, listProjects, persistProject, ProjectRecord, removeProject, setActiveProjectId, TrackCategory, TrackRecord } from "@/lib/projects";

const categories: Array<{ id: TrackCategory; name: string; detail: string }> = [
  { id: "beat", name: "Beat", detail: "The instrumental, already mixed" },
  { id: "lead_vocal", name: "Lead vocal", detail: "The main vocal" },
  { id: "doubles", name: "Doubles", detail: "Takes that thicken the lead" },
  { id: "backing_vocals", name: "Backing vocals", detail: "Harmonies and support" },
  { id: "adlibs", name: "Ad-libs", detail: "Short bits between lines" },
  { id: "instrument", name: "Instrument", detail: "A single instrument" },
  { id: "master", name: "Finished song", detail: "One finished mix to master" },
];

const quickPhrases = {
  mix: ["afrobeats", "trap", "vocals upfront", "light autotune", "some reverb", "loud and punchy"],
  master: ["streaming-ready", "loud club master", "keep it dynamic", "warm"],
};

type JobItem = { id: string; status: string; progress: number; processor: string; attempt: number; render: "preview" | "full"; settings: VersionSettings | null; summary: string | null; refinement: string | null; error_code?: string | null; output_format?: string | null; output_size_bytes?: number | null };
const optionalText = (value: unknown) => typeof value === "string" ? value : null;
function jobFromApi(row: Record<string, unknown>): JobItem { return { id: String(row.id), status: String(row.status), progress: Number(row.progress || 0), processor: String(row.processor || "ffmpeg_preview"), attempt: Number(row.attempt || 0), render: row.render === "full" ? "full" : "preview", settings: row.settings && typeof row.settings === "object" ? row.settings as VersionSettings : null, summary: optionalText(row.summary), refinement: optionalText(row.refinement), error_code: optionalText(row.error_code), output_format: optionalText(row.output_format), output_size_bytes: typeof row.output_size_bytes === "number" ? row.output_size_bytes : null }; }

function formatBytes(bytes: number) { return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }

const failureMessages: Record<string, string> = {
  provider_credits: "Your RoEx credit balance is too low. Add credits in the Tonn portal, then retry.",
  provider_auth: "RoEx rejected the API key. Check ROEX_API_KEY, rebuild the API and processor, then retry.",
  provider_not_configured: "RoEx AI isn't configured. Add ROEX_API_KEY to the root .env and rebuild the API and processor.",
  provider_dev_key: "The RoEx key in .env is a development key, which only returns placeholder results. Put your production key in ROEX_API_KEY, rebuild the API and processor, then retry.",
  provider_expired: "The RoEx download link expired. Retry to request it again.",
  invalid_audio: "RoEx couldn't process this audio. Use clean tracks under 8 minutes each, then retry.",
  queue_unavailable: "The processing queue was unavailable. Retry in a moment.",
};

type StepState = "done" | "current" | "todo";

function Step({ number, title, state, status, children }: { number: number; title: string; state: StepState; status?: string; children: ReactNode }) {
  return <section className={`step step-${state}`} aria-labelledby={`step-${number}`}>
    <header className="step-head">
      <span className="step-badge" aria-hidden="true">{state === "done" ? "✓" : number}</span>
      <h2 id={`step-${number}`}><span className="visually-hidden">Step {number}: </span>{title}</h2>
      {status && <span className="step-status">{status}</span>}
    </header>
    <div className="step-body">{children}</div>
  </section>;
}

function RefineForm({ disabled, onRefine }: { disabled: boolean; onRefine: (note: string) => Promise<boolean> }) {
  const [note, setNote] = useState("");
  return <form className="refine" onSubmit={(event) => { event.preventDefault(); void onRefine(note.trim()).then((created) => { if (created) setNote(""); }); }}>
    <label htmlFor="refine-note">What should change in the next version?</label>
    <div className="field-row"><input id="refine-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Vocal louder, more reverb, harder autotune…" /><button type="submit" className="btn btn-primary" disabled={disabled || !note.trim()}>Make a new version</button></div>
    <p className="hint">Earlier versions stay in your library.</p>
  </form>;
}

function versionHeading(job: JobItem, projectType: "mix" | "master") {
  const ai = job.processor === "roex_tonn";
  if (job.render === "full") return job.status === "completed" ? "Full-length track ready" : job.status === "failed" ? "The full-length track failed" : "Rendering the full-length track…";
  if (job.status === "completed") return ai ? `AI ${projectType === "master" ? "master" : "mix"} preview ready` : "Local preview ready";
  if (job.status === "failed") return "The preview failed";
  return job.status === "queued" ? "Waiting in the queue…" : "Mixing your preview…";
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
  const [usage, setUsage] = useState<Usage | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const wordCount = useMemo(() => project?.prompt.length || 0, [project?.prompt]);

  // Refresh the plan allowance whenever a version starts or finishes.
  useEffect(() => {
    let mounted = true;
    void fetchUsage().then((result) => { if (mounted) setUsage(result); });
    return () => { mounted = false; };
  }, [job?.id, job?.status]);

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
      setNotice(createdJob.processor === "roex_tonn" ? "RoEx AI preview queued. Your audio will be sent to RoEx for processing; this requests a preview only." : "Local preview queued. FastMix's basic engine applies your vocal level, reverb, autotune and loudness; AI mixing starts once RoEx is connected.");
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
    const remaining = usage ? usage.fullTracks.limit - usage.fullTracks.used : null;
    if (!window.confirm(remaining === null ? "Render the full-length track? This uses one of your full-length tracks this month." : `Render the full-length track? This uses 1 of your ${remaining} remaining full-length tracks this month.`)) return;
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
    if (!window.confirm(`Delete “${project.title}” and its stored audio? This cannot be undone.`)) return;
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

  const master = project.projectType === "master";
  const hasTracks = master ? project.tracks.length === 1 : project.tracks.length > 0;
  const hasDirection = project.prompt.trim().length > 0;
  const ready = hasTracks && hasDirection;
  const busy = jobPending || job?.status === "queued" || job?.status === "processing";
  const fullTracksLeft = usage ? Math.max(0, usage.fullTracks.limit - usage.fullTracks.used) : null;
  const allowanceText: ReactNode = !usage ? "Uses one of your full-length tracks this month."
    : usage.fullTracks.limit === 0 ? <>Full-length tracks come with Pro and Artist. <Link className="text-link" href="/pricing">See plans</Link></>
    : fullTracksLeft === 0 ? `You've used all ${usage.fullTracks.limit} full-length tracks on ${usage.planName} this month. They reset on ${resetDate(usage)}.`
    : `Uses 1 of your ${fullTracksLeft} remaining full-length tracks this month (${usage.planName}, resets ${resetDate(usage)}).`;
  const completed = job?.status === "completed";
  const ai = job?.processor === "roex_tonn";
  const categoryOptions = master ? categories.filter((item) => item.id === "master") : categories.filter((item) => item.id !== "master");
  const missing = !hasTracks ? (master ? "Add one finished song in step 1." : "Add at least one track in step 1.") : !hasDirection ? "Describe the sound in step 2." : "";
  const trackStatus = project.tracks.length ? `${project.tracks.length} ${project.tracks.length === 1 ? "track" : "tracks"}` : undefined;

  function addPhrase(phrase: string) {
    if (!project) return;
    const current = project.prompt.trim();
    if (current.toLowerCase().includes(phrase.toLowerCase())) return;
    updateProject({ prompt: current ? `${current}, ${phrase}` : phrase.charAt(0).toUpperCase() + phrase.slice(1) });
  }

  return <div className="mixer">
    <div className="mixer-head">
      <div className="title-field">
        <label htmlFor="session-title">Session name</label>
        <input ref={titleRef} id="session-title" value={project.title} maxLength={120} onChange={(event) => updateProject({ title: event.target.value })} />
      </div>
      <div className="mixer-head-actions">
        <div className="segmented" role="group" aria-label="Session type">
          <button aria-pressed={!master} onClick={() => chooseProjectType("mix")}>Mix</button>
          <button aria-pressed={master} onClick={() => chooseProjectType("master")}>Master</button>
        </div>
        <button className="btn btn-secondary" onClick={startNewSession}>New session</button>
      </div>
    </div>
    <p className="mixer-intro">{master ? "Master mode finishes one song that's already mixed." : "Mix mode balances your beat and vocals into one song."} Changes save automatically.</p>
    {notice && <div className="notice-bar" role="status"><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}>×</button></div>}

    <Step number={1} title={master ? "Add your finished song" : "Add your tracks"} state={hasTracks ? "done" : "current"} status={trackStatus}>
      {project.tracks.length > 0 && <ul className="track-list">{project.tracks.map((track) => {
        const name = categories.find((item) => item.id === track.category)?.name || "Track";
        return <li key={track.id} className="track"><span className={`chip chip-${track.category}`}>{name}</span><span className="track-name" title={track.name}>{track.name}</span><span className="track-size">{formatBytes(track.sizeBytes)}</span><button className="btn-text" aria-label={`Remove ${track.name}`} onClick={() => removeTrack(track.id)}>Remove</button></li>;
      })}</ul>}
      {!(master && project.tracks.length >= 1) && <div className="add-track">
        <button className="btn btn-primary" disabled={uploading} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{uploading ? "Uploading…" : project.tracks.length ? "Add another track" : "Add a track"}</button>
        {menuOpen && <div className="menu" role="menu">{categoryOptions.map((item) => <button key={item.id} role="menuitem" onClick={() => chooseCategory(item.id)}><b>{item.name}</b><span>{item.detail}</span></button>)}</div>}
        <p className="hint">{master ? "One finished song: WAV, MP3, FLAC, AIFF, M4A or OGG, up to 100 MB." : "Give each part its own file: a beat plus your vocal is enough. WAV, MP3, FLAC, AIFF, M4A or OGG, up to 100 MB each."}</p>
      </div>}
      <input ref={inputRef} className="visually-hidden" type="file" accept="audio/*,.wav,.mp3,.flac,.aiff,.aif,.m4a,.ogg" onChange={addTrack} aria-label={`Choose ${category} audio file`} />
    </Step>

    <Step number={2} title="Describe the sound" state={hasDirection ? "done" : hasTracks ? "current" : "todo"}>
      <label className="visually-hidden" htmlFor="mix-direction">{master ? "Your master direction" : "Your mix direction"}</label>
      <textarea id="mix-direction" maxLength={4000} value={project.prompt} onChange={(event) => updateProject({ prompt: event.target.value })} placeholder={master ? "Streaming-ready, warm and wide, not too loud…" : "Afrobeats party, vocals upfront, light autotune, some reverb, loud and punchy…"} />
      <div className="phrase-row"><span className="hint">Add:</span>{quickPhrases[master ? "master" : "mix"].map((phrase) => <button key={phrase} className="phrase" onClick={() => addPhrase(phrase)}>+ {phrase}</button>)}</div>
      <p className="hint">Name a style, then say what you want to hear: vocal level, reverb, autotune (subtle or hard, optionally with the key) and loudness. <Link className="text-link" href="/studio/guide">More ideas in the guide</Link> <span className="counter">{wordCount}/4000</span></p>
    </Step>

    <Step number={3} title="Listen and refine" state={completed ? "done" : ready ? "current" : "todo"}>
      {job && <div className={`version version-${job.status}`} aria-live="polite">
        <div className="version-head"><b>{versionHeading(job, project.projectType)}</b><span className="tag">{ai ? job.render === "full" ? "AI · full track" : "AI preview" : "Local preview"}</span></div>
        {job.refinement && <p className="version-meta">Your note: “{job.refinement}”</p>}
        {job.settings ? <SettingsKnobs settings={job.settings} caption={(job.status === "queued" || job.status === "processing") ? <WaitingLine mode={master ? "master" : "mix"} autotune={Boolean(job.settings.autotune)} /> : undefined} /> : job.summary && <p className="version-meta">Settings: {job.summary}</p>}
        {(job.status === "queued" || job.status === "processing") && <div className="progress" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Processing progress"><i style={{ width: `${Math.max(4, job.progress)}%` }} /></div>}
        {completed && <>
          <p className="hint">{job.render === "full" ? "Your full-length track is ready." : ai ? "A free 30-second preview of your mix." : "Preview from FastMix's basic local engine. AI mixing starts once RoEx is connected."}</p>
          {!outputUrl && <div className="button-row"><button className="btn btn-secondary" disabled={outputPending} onClick={() => void playOutput()}>{outputPending ? "Loading…" : job.render === "full" ? "Load the full track" : "Load the preview"}</button></div>}
          {outputUrl && <Transport src={outputUrl} autoPlay label={`${job.render === "full" ? "Full track" : "Preview"} of ${project.title}`} />}
          {!master && <RefineForm disabled={jobPending} onRefine={refineVersion} />}
        </>}
        {job.status === "failed" && <><p className="error-text">{failureMessages[job.error_code || ""] || "Processing could not be completed. Check the audio format and processor setup, then retry."}</p><button className="btn btn-secondary" disabled={jobPending} onClick={() => void startProcessing(true)}>Retry</button></>}
      </div>}
      {(!job || completed || job.status === "failed") && <div className="create-row">
        <button className={`btn ${job ? "btn-secondary" : "btn-primary btn-large"}`} disabled={!ready || busy || uploading} onClick={() => void startProcessing()}>{jobPending ? "Starting…" : job ? "Start over from the direction" : master ? "Create a free master preview" : "Create a free preview"}</button>
        <p className="hint">{missing || (job ? "Uses your current tracks and direction instead of the notes above." : "Takes about two minutes. Previews are free.")}</p>
      </div>}
    </Step>

    <Step number={4} title="Download" state={completed && job?.render === "full" ? "done" : completed ? "current" : "todo"}>
      {completed && job ? <div className="button-row">
        {ai && job.render === "preview" && <button className="btn btn-primary" disabled={jobPending || fullTracksLeft === 0} onClick={() => void requestFullTrack()}>Get the full track</button>}
        <button className="btn btn-secondary" onClick={downloadOutput}>Download {job.render === "full" ? "full track" : "this preview"} ({job.output_format?.toUpperCase() || "WAV"})</button>
        {ai && job.render === "preview" && <p className="hint">{allowanceText}</p>}
      </div> : <p className="hint">Available once a version is ready.</p>}
    </Step>

    <p className="danger-zone"><button className="btn-text btn-danger" onClick={deleteCurrentSession}>Delete this session</button></p>
  </div>;
}
