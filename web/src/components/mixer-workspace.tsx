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
];

function formatBytes(bytes: number) { return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }

export default function MixerWorkspace() {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<TrackCategory>("beat");
  const [notice, setNotice] = useState("");
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
      setActiveProjectId(active.id);
      if (mounted) setProject(active);
    })();
    return () => { mounted = false; };
  }, []);

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

  function addTrack(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !project) return;
    const allowed = /\.(wav|mp3|flac|aiff?|m4a|ogg)$/i.test(file.name);
    if (!file.type.startsWith("audio/") && !allowed) { setNotice("Choose an audio file such as WAV, MP3, FLAC, AIFF, M4A, or OGG."); return; }
    if (file.size > 100 * 1024 * 1024) { setNotice("This preview accepts files up to 100 MB."); return; }
    const track: TrackRecord = { id: crypto.randomUUID(), name: file.name, category, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, lastModified: file.lastModified };
    const next = persistProject({ ...project, tracks: [...project.tracks, track], status: "draft" });
    setProject(next);
    setNotice("Track details added to this browser preview. Secure audio upload is the next setup step.");
  }

  async function startNewSession() {
    const next = await createProject();
    setProject(next);
    setNotice("New mix session ready.");
  }

  async function deleteCurrentSession() {
    if (!project) return;
    await removeProject(project.id);
    const remaining = await listProjects();
    const next = remaining[0] || await createProject();
    setProject(next);
    setActiveProjectId(next.id);
    setNotice("Session removed from this preview.");
  }

  function removeTrack(id: string) {
    if (!project) return;
    updateProject({ tracks: project.tracks.filter((track) => track.id !== id) });
    setNotice("Track removed from this session.");
  }

  if (!project) return <div className="studio-loading" aria-live="polite">Opening your studio…</div>;

  const ready = project.tracks.length > 0 && project.prompt.trim().length > 0;
  return <div className="mixer-page">
    <div className="workspace-heading"><div><span className="studio-kicker">YOUR STUDIO <i>/</i> NEW SESSION</span><h1>What are we making today?</h1><p>Bring the pieces, then tell us what you want them to feel like.</p></div><div className="heading-actions"><button className="studio-button studio-button-outline" onClick={startNewSession}>＋ <span>New session</span></button><button className="more-button" aria-label="Session options" onClick={deleteCurrentSession}>···</button></div></div>
    {notice && <div className="inline-notice" role="status"><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}>×</button></div>}
    <div className="mixer-layout">
      <section className="mixer-main-card">
        <div className="session-title-row"><div><label htmlFor="session-title">SESSION NAME</label><input ref={titleRef} id="session-title" value={project.title} maxLength={120} onChange={(event) => updateProject({ title: event.target.value })} /></div><span className="draft-status"><i /> Draft saved locally</span></div>
        <div className="tracks-heading"><div><h2>Your tracks <span>{project.tracks.length.toString().padStart(2,"0")}</span></h2><p>Keep each part on its own track for more control.</p></div><div className="track-add-wrap"><button className="studio-button studio-button-lime" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>＋ Add a track</button>{menuOpen && <div className="track-type-menu" role="menu"><div className="track-menu-title">ADD A TRACK</div>{categories.map((item) => <button key={item.id} role="menuitem" onClick={() => chooseCategory(item.id)}><span className="category-icon">{item.icon}</span><span><b>{item.name}</b><small>{item.detail}</small></span><span className="category-plus">＋</span></button>)}</div>}</div><input ref={inputRef} className="visually-hidden" type="file" accept="audio/*,.wav,.mp3,.flac,.aiff,.aif,.m4a,.ogg" onChange={addTrack} aria-label={`Choose ${category} audio file`} /></div>
        {project.tracks.length === 0 ? <div className="empty-tracks"><div className="empty-track-icon">♫</div><b>Your session starts with a track</b><p>Add a beat, a vocal, or one instrument to see how it fits.</p><button className="empty-add" onClick={() => setMenuOpen(true)}>＋ Choose track type</button></div> : <div className="track-list">{project.tracks.map((track) => { const categoryName = categories.find((item) => item.id === track.category)?.name || "Track"; return <article className="track-row" key={track.id}><div className={`track-type-icon type-${track.category}`}>{categories.find((item) => item.id === track.category)?.icon}</div><div className="track-file-info"><b>{categoryName}</b><span title={track.name}>{track.name}</span></div><div className="track-meter" aria-hidden="true">{Array.from({length:36},(_,i)=><i key={i} style={{height:`${15 + Math.abs(Math.sin(i*1.81 + track.name.length))*68}%`}} />)}</div><span className="track-file-size">{formatBytes(track.sizeBytes)}</span><button className="track-remove" aria-label={`Remove ${track.name}`} onClick={() => removeTrack(track.id)}>×</button></article>; })}<button className="add-another" onClick={() => setMenuOpen(true)}>＋ Add another track</button></div>}
        <div className="direction-block"><div className="direction-heading"><div><label htmlFor="mix-direction">YOUR MIX DIRECTION</label><p>Use your own words. Be as specific or as open as you like.</p></div><button onClick={() => setProject((current) => current ? { ...current, prompt: "" } : current)} disabled={!project.prompt}>Clear</button></div><textarea id="mix-direction" maxLength={4000} value={project.prompt} onChange={(event) => updateProject({ prompt: event.target.value })} placeholder="A warm, close vocal with a little space on the ends of each line. Keep the beat punchy but let the hook breathe…" /><div className="prompt-footer"><span>Try describing the mood, vocal feel, effects, or energy.</span><span>{wordCount}/4000</span></div></div>
        <div className="mix-action-row"><div className="mix-readiness"><span className={ready ? "readiness-ready" : "readiness-waiting"}>{ready ? "● Ready for a direction" : "○ Add tracks and a direction"}</span><small>Processing will appear when an audio provider is connected.</small></div><button className="studio-button studio-button-disabled" disabled title="Audio processing is not configured yet">Shape this mix <span>↗</span></button></div>
      </section>
      <aside className="mixer-aside"><div className="aside-card sound-card"><span className="studio-kicker">A GOOD PLACE TO START</span><h3>Find the words<br/>for your sound.</h3><p>Not sure how to describe it? Browse prompt ideas for a starting point.</p><Link href="/studio/guide" className="aside-link">Explore the sound guide <span>↗</span></Link><div className="sound-card-orbit"><span>FM</span></div></div><div className="aside-card tips-card"><span className="aside-tip-icon">✳</span><h3>A small recording tip</h3><p>Give each vocal take its own file, and start with the cleanest recording you have.</p></div><button className="delete-session" onClick={deleteCurrentSession}>Delete this session</button></aside>
    </div>
  </div>;
}
