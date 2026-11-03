"use client";

import Link from "next/link";
import { ChangeEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import SettingsKnobs, { VersionSettings } from "@/components/settings-knobs";
import WaitingLine from "@/components/waiting-line";
import Transport from "@/components/transport";
import type { Locale } from "@/lib/locale";
import { fetchUsage, planName, resetDate, Usage } from "@/lib/usage";
import { createProject, getActiveProjectId, listProjects, persistProject, ProjectRecord, removeProject, setActiveProjectId, TrackCategory, TrackRecord } from "@/lib/projects";
import { serverMessage } from "@/lib/studio-messages";

const categoryIds: TrackCategory[] = ["beat", "lead_vocal", "doubles", "backing_vocals", "adlibs", "instrument", "master"];

// Setup problems are explained to the operator in development and kept generic for artists in production.
// The development explanations are for the operator and stay in English.
const isDevelopment = process.env.NODE_ENV === "development";

const frCategories: Record<TrackCategory, [string, string]> = {
  beat: ["Beat", "L'instrumental, déjà mixé"],
  lead_vocal: ["Voix lead", "La voix principale"],
  doubles: ["Doublages", "Des prises qui épaississent la voix lead"],
  backing_vocals: ["Chœurs", "Harmonies et soutien"],
  adlibs: ["Backs", "De courtes interventions entre les phrases"],
  instrument: ["Instrument", "Un seul instrument"],
  master: ["Morceau fini", "Un mix terminé à masteriser"],
};

const copy = {
  en: {
    categories: {
      beat: ["Beat", "The instrumental, already mixed"],
      lead_vocal: ["Lead vocal", "The main vocal"],
      doubles: ["Doubles", "Takes that thicken the lead"],
      backing_vocals: ["Backing vocals", "Harmonies and support"],
      adlibs: ["Ad-libs", "Short bits between lines"],
      instrument: ["Instrument", "A single instrument"],
      master: ["Finished song", "One finished mix to master"],
    } as Record<TrackCategory, [string, string]>,
    quickPhrases: {
      mix: ["afrobeats", "trap", "vocals upfront", "light autotune", "some reverb", "loud and punchy"],
      master: ["streaming-ready", "loud club master", "keep it dynamic", "warm"],
    },
    unavailable: "AI mixing is paused on our side for a moment. This didn't use any of your tracks; please retry a little later.",
    failures: {
      provider_expired: "The RoEx download link expired. Retry to request it again.",
      invalid_audio: "RoEx couldn't process this audio. Use clean tracks under 8 minutes each, then retry.",
      queue_unavailable: "The processing queue was unavailable. Retry in a moment.",
    } as Record<string, string>,
    failureDefault: "Processing could not be completed. Check the audio format and processor setup, then retry.",
    step: (number: number) => `Step ${number}: `,
    refineLabel: "What should change in the next version?",
    refinePlaceholder: "Vocal louder, more reverb, harder autotune…",
    refineButton: "Make a new version",
    refineHint: "Earlier versions stay in your library.",
    headings: {
      fullReady: "Full-length track ready", fullFailed: "The full-length track failed", fullRendering: "Rendering the full-length track…",
      aiReady: (master: boolean) => `AI ${master ? "master" : "mix"} preview ready`, localReady: "Local preview ready",
      failed: "The preview failed", queued: "Waiting in the queue…", mixing: "Mixing your preview…",
    },
    untitled: "Untitled session",
    retrying: "Trying this version again…",
    starting: "Starting your preview…",
    masterNeedsOne: "A mastering preview needs exactly one finished track.",
    notAccepted: "The processor could not accept this session.",
    queuedAi: "RoEx AI preview queued. Your audio will be sent to RoEx for processing; this requests a preview only.",
    queuedLocal: "Local preview queued. FastMix's basic engine applies your vocal level, reverb, autotune and loudness; AI mixing starts once RoEx is connected.",
    refineFailed: "The new version could not be created.",
    refineQueued: (changes: string) => `New version queued: ${changes}.`,
    confirmFull: "Render the full-length track? This uses one of your full-length tracks this month.",
    confirmFullCount: (remaining: number) => `Render the full-length track? This uses 1 of your ${remaining} remaining full-length tracks this month.`,
    fullFailed: "The full-length track could not be requested.",
    fullRequested: "Full-length track requested. It will appear here and in your library when it's ready.",
    downloadFailed: "The output download could not be prepared.",
    previewFailed: "The preview could not be opened.",
    chooseAudio: "Choose an audio file such as WAV, MP3, FLAC, AIFF, M4A, or OGG.",
    tooLarge: "This preview accepts files up to 100 MB.",
    uploadingNotice: "Uploading to private audio storage…",
    uploadNotStarted: "The audio upload could not be started.",
    storageFailed: "The audio could not be sent to storage. Please retry.",
    uploadFailed: "The audio upload could not be completed.",
    uploaded: "Track uploaded to private storage and added to this session.",
    newSessionReady: "New mix session ready.",
    confirmDelete: (title: string) => `Delete “${title}” and its stored audio? This cannot be undone.`,
    deleteFailed: "This session could not be removed. Wait for processing to finish and check local services.",
    sessionRemoved: "Session removed from this preview.",
    trackDeleteFailed: "The track could not be deleted.",
    trackServiceDown: "The track service is unavailable. Nothing was removed.",
    trackRemoved: "Track removed from this session.",
    opening: "Opening your studio…",
    allowanceUnknown: "Uses one of your full-length tracks this month.",
    allowanceNone: "Full-length tracks come with a paid plan. ",
    seePlans: "See plans",
    allowanceUsed: (limit: number, plan: string, date: string) => `You've used all ${limit} full-length tracks on ${plan} this month. They reset on ${date}.`,
    allowanceLeft: (left: number, plan: string, date: string) => `Uses 1 of your ${left} remaining full-length tracks this month (${plan}, resets ${date}).`,
    missingSong: "Add one finished song in step 1.",
    missingTrack: "Add at least one track in step 1.",
    missingDirection: "Describe the sound in step 2.",
    tracks: (count: number) => `${count} ${count === 1 ? "track" : "tracks"}`,
    sessionName: "Session name",
    sessionType: "Session type",
    mix: "Mix",
    master: "Master",
    newSession: "New session",
    introMaster: "Master mode finishes one song that's already mixed.",
    introMix: "Mix mode balances your beat and vocals into one song.",
    autosave: " Changes save automatically.",
    dismiss: "Dismiss",
    step1Master: "Add your finished song",
    step1Mix: "Add your tracks",
    trackFallback: "Track",
    removeLabel: (name: string) => `Remove ${name}`,
    remove: "Remove",
    uploading: "Uploading…",
    addAnother: "Add another track",
    addTrack: "Add a track",
    hintMaster: "One finished song: WAV, MP3, FLAC, AIFF, M4A or OGG, up to 100 MB.",
    hintMix: "Give each part its own file: a beat plus your vocal is enough. WAV, MP3, FLAC, AIFF, M4A or OGG, up to 100 MB each.",
    chooseFile: (category: TrackCategory) => `Choose ${category} audio file`,
    step2: "Describe the sound",
    directionMaster: "Your master direction",
    directionMix: "Your mix direction",
    placeholderMaster: "Streaming-ready, warm and wide, not too loud…",
    placeholderMix: "Afrobeats party, vocals upfront, light autotune, some reverb, loud and punchy…",
    add: "Add:",
    directionHint: "Name a style, then say what you want to hear: vocal level, reverb, autotune (subtle or hard, optionally with the key) and loudness. ",
    guideLink: "More ideas in the guide",
    step3: "Listen and refine",
    tagAiFull: "AI · full track",
    tagAi: "AI preview",
    tagLocal: "Local preview",
    yourNote: (note: string) => `Your note: “${note}”`,
    settings: (summary: string) => `Settings: ${summary}`,
    progress: "Processing progress",
    fullReadyHint: "Your full-length track is ready.",
    aiPreviewHint: "A free 30-second preview of your mix.",
    localPreviewHint: "Preview from FastMix's basic local engine. AI mixing starts once RoEx is connected.",
    loading: "Loading…",
    loadFull: "Load the full track",
    loadPreview: "Load the preview",
    playerLabel: (full: boolean, title: string) => `${full ? "Full track" : "Preview"} of ${title}`,
    retry: "Retry",
    startingShort: "Starting…",
    startOver: "Start over from the direction",
    createMaster: "Create a free master preview",
    createPreview: "Create a free preview",
    startOverHint: "Uses your current tracks and direction instead of the notes above.",
    createHint: "Takes about two minutes. Previews are free.",
    step4: "Download",
    getFull: "Get the full track",
    downloadMp3: "Download MP3",
    downloadWav: "Download WAV",
    wavWithArtist: "WAV downloads come with Artist. ",
    downloadPreview: (format: string) => `Download this preview (${format})`,
    availableLater: "Available once a version is ready.",
    deleteSession: "Delete this session",
  },
  fr: {
    categories: frCategories,
    // Parsed by the worker like the English ones (see worker/app/direction.py).
    quickPhrases: {
      mix: ["afrobeats", "trap", "voix devant", "autotune léger", "un peu de réverbe", "puissant et percutant"],
      master: ["prêt pour le streaming", "master club puissant", "garder de la dynamique", "chaleureux"],
    },
    unavailable: "Le mixage IA est momentanément en pause de notre côté. Aucun de vos titres n'a été décompté ; réessayez un peu plus tard.",
    failures: {
      provider_expired: "Le lien de téléchargement RoEx a expiré. Réessayez pour en obtenir un nouveau.",
      invalid_audio: "RoEx n'a pas pu traiter cet audio. Utilisez des pistes propres de moins de 8 minutes chacune, puis réessayez.",
      queue_unavailable: "La file de traitement était indisponible. Réessayez dans un instant.",
    } as Record<string, string>,
    failureDefault: "Le traitement n'a pas pu aboutir. Vérifiez le format audio et la configuration du processeur, puis réessayez.",
    step: (number: number) => `Étape ${number} : `,
    refineLabel: "Que faut-il changer dans la prochaine version ?",
    refinePlaceholder: "Voix plus forte, plus de réverbe, moins d'autotune…",
    refineButton: "Créer une nouvelle version",
    refineHint: "Les versions précédentes restent dans votre bibliothèque.",
    headings: {
      fullReady: "Titre complet prêt", fullFailed: "Le rendu du titre complet a échoué", fullRendering: "Rendu du titre complet en cours…",
      aiReady: (master: boolean) => `Aperçu IA du ${master ? "master" : "mix"} prêt`, localReady: "Aperçu local prêt",
      failed: "L'aperçu a échoué", queued: "En attente dans la file…", mixing: "Mixage de votre aperçu…",
    },
    untitled: "Session sans titre",
    retrying: "Nouvelle tentative pour cette version…",
    starting: "Lancement de votre aperçu…",
    masterNeedsOne: "Un aperçu de mastering nécessite exactement un morceau fini.",
    notAccepted: "Le processeur n'a pas pu accepter cette session.",
    queuedAi: "Aperçu IA RoEx en file d'attente. Votre audio sera envoyé à RoEx pour traitement ; seul un aperçu est demandé.",
    queuedLocal: "Aperçu local en file d'attente. Le moteur de base de FastMix applique le niveau de la voix, la réverbe, l'autotune et le volume ; le mixage IA démarrera dès que RoEx sera connecté.",
    refineFailed: "La nouvelle version n'a pas pu être créée.",
    refineQueued: (changes: string) => `Nouvelle version en file d'attente : ${changes}.`,
    confirmFull: "Lancer le rendu du titre complet ? Cela utilise l'un de vos titres complets de ce mois-ci.",
    confirmFullCount: (remaining: number) => `Lancer le rendu du titre complet ? Cela utilise 1 de vos ${remaining} ${remaining <= 1 ? "titre complet restant" : "titres complets restants"} ce mois-ci.`,
    fullFailed: "Le titre complet n'a pas pu être demandé.",
    fullRequested: "Titre complet demandé. Il apparaîtra ici et dans votre bibliothèque dès qu'il sera prêt.",
    downloadFailed: "Le téléchargement n'a pas pu être préparé.",
    previewFailed: "L'aperçu n'a pas pu être ouvert.",
    chooseAudio: "Choisissez un fichier audio, par exemple WAV, MP3, FLAC, AIFF, M4A ou OGG.",
    tooLarge: "Cet aperçu accepte des fichiers jusqu'à 100 Mo.",
    uploadingNotice: "Import vers le stockage audio privé…",
    uploadNotStarted: "L'import audio n'a pas pu démarrer.",
    storageFailed: "L'audio n'a pas pu être envoyé au stockage. Veuillez réessayer.",
    uploadFailed: "L'import audio n'a pas pu aboutir.",
    uploaded: "Piste importée dans le stockage privé et ajoutée à cette session.",
    newSessionReady: "Nouvelle session de mix prête.",
    confirmDelete: (title: string) => `Supprimer « ${title} » et son audio enregistré ? Cette action est irréversible.`,
    deleteFailed: "Impossible de supprimer cette session. Attendez la fin du traitement et vérifiez les services locaux.",
    sessionRemoved: "Session supprimée.",
    trackDeleteFailed: "La piste n'a pas pu être supprimée.",
    trackServiceDown: "Le service des pistes est indisponible. Rien n'a été supprimé.",
    trackRemoved: "Piste retirée de cette session.",
    opening: "Ouverture de votre studio…",
    allowanceUnknown: "Utilise l'un de vos titres complets de ce mois-ci.",
    allowanceNone: "Les titres complets sont inclus dans les forfaits payants. ",
    seePlans: "Voir les formules",
    allowanceUsed: (limit: number, plan: string, date: string) => `Vous avez utilisé les ${limit} titres complets de votre formule ${plan} ce mois-ci. Remise à zéro le ${date}.`,
    allowanceLeft: (left: number, plan: string, date: string) => `Utilise 1 de vos ${left} ${left <= 1 ? "titre complet restant" : "titres complets restants"} ce mois-ci (${plan}, remise à zéro le ${date}).`,
    missingSong: "Ajoutez un morceau fini à l'étape 1.",
    missingTrack: "Ajoutez au moins une piste à l'étape 1.",
    missingDirection: "Décrivez le son à l'étape 2.",
    tracks: (count: number) => `${count} ${count <= 1 ? "piste" : "pistes"}`,
    sessionName: "Nom de la session",
    sessionType: "Type de session",
    mix: "Mix",
    master: "Master",
    newSession: "Nouvelle session",
    introMaster: "Le mode Master finalise un morceau déjà mixé.",
    introMix: "Le mode Mix équilibre votre beat et vos voix en un seul morceau.",
    autosave: " Les modifications sont enregistrées automatiquement.",
    dismiss: "Fermer",
    step1Master: "Ajoutez votre morceau fini",
    step1Mix: "Ajoutez vos pistes",
    trackFallback: "Piste",
    removeLabel: (name: string) => `Retirer ${name}`,
    remove: "Retirer",
    uploading: "Import en cours…",
    addAnother: "Ajouter une autre piste",
    addTrack: "Ajouter une piste",
    hintMaster: "Un morceau fini : WAV, MP3, FLAC, AIFF, M4A ou OGG, jusqu'à 100 Mo.",
    hintMix: "Un fichier par partie : un beat et votre voix suffisent. WAV, MP3, FLAC, AIFF, M4A ou OGG, jusqu'à 100 Mo chacun.",
    chooseFile: (category: TrackCategory) => `Choisir le fichier audio : ${frCategories[category][0]}`,
    step2: "Décrivez le son",
    directionMaster: "Votre description du master",
    directionMix: "Votre description du mix",
    placeholderMaster: "Prêt pour le streaming, chaleureux et large, volume modéré…",
    placeholderMix: "Afrobeats festif, voix devant, autotune léger, un peu de réverbe, puissant et percutant…",
    add: "Ajouter :",
    directionHint: "Indiquez un style, puis ce que vous voulez entendre : niveau de la voix, réverbe, autotune (discret ou fort, avec la tonalité si vous le souhaitez) et volume. ",
    guideLink: "Plus d'idées dans le guide",
    step3: "Écoutez et affinez",
    tagAiFull: "IA · titre complet",
    tagAi: "Aperçu IA",
    tagLocal: "Aperçu local",
    yourNote: (note: string) => `Votre note : « ${note} »`,
    settings: (summary: string) => `Réglages : ${summary}`,
    progress: "Progression du traitement",
    fullReadyHint: "Votre titre complet est prêt.",
    aiPreviewHint: "Un aperçu gratuit de 30 secondes de votre mix.",
    localPreviewHint: "Aperçu réalisé par le moteur local de base de FastMix. Le mixage IA démarrera dès que RoEx sera connecté.",
    loading: "Chargement…",
    loadFull: "Charger le titre complet",
    loadPreview: "Charger l'aperçu",
    playerLabel: (full: boolean, title: string) => `${full ? "Titre complet" : "Aperçu"} de ${title}`,
    retry: "Réessayer",
    startingShort: "Lancement…",
    startOver: "Repartir de la description",
    createMaster: "Créer un aperçu de master gratuit",
    createPreview: "Créer un aperçu gratuit",
    startOverHint: "Utilise vos pistes et votre description actuelles, sans les notes ci-dessus.",
    createHint: "Environ deux minutes. Les aperçus sont gratuits.",
    step4: "Télécharger",
    getFull: "Obtenir le titre complet",
    downloadMp3: "Télécharger le MP3",
    downloadWav: "Télécharger le WAV",
    wavWithArtist: "Les téléchargements en WAV sont inclus dans Artist. ",
    downloadPreview: (format: string) => `Télécharger cet aperçu (${format})`,
    availableLater: "Disponible dès qu'une version est prête.",
    deleteSession: "Supprimer cette session",
  },
};

type Copy = (typeof copy)["en"];

type JobItem = { id: string; status: string; progress: number; processor: string; attempt: number; render: "preview" | "full"; settings: VersionSettings | null; summary: string | null; refinement: string | null; error_code?: string | null; output_format?: string | null; output_size_bytes?: number | null };
const optionalText = (value: unknown) => typeof value === "string" ? value : null;
function jobFromApi(row: Record<string, unknown>): JobItem { return { id: String(row.id), status: String(row.status), progress: Number(row.progress || 0), processor: String(row.processor || "ffmpeg_preview"), attempt: Number(row.attempt || 0), render: row.render === "full" ? "full" : "preview", settings: row.settings && typeof row.settings === "object" ? row.settings as VersionSettings : null, summary: optionalText(row.summary), refinement: optionalText(row.refinement), error_code: optionalText(row.error_code), output_format: optionalText(row.output_format), output_size_bytes: typeof row.output_size_bytes === "number" ? row.output_size_bytes : null }; }

function formatBytes(bytes: number, locale: Locale) {
  const fr = locale === "fr";
  if (bytes > 1024 * 1024) {
    const megabytes = (bytes / 1024 / 1024).toFixed(1);
    return fr ? `${megabytes.replace(".", ",")} Mo` : `${megabytes} MB`;
  }
  const kilobytes = Math.max(1, Math.round(bytes / 1024));
  return fr ? `${kilobytes} Ko` : `${kilobytes} KB`;
}

const setupMessage = (detail: string, t: Copy) => isDevelopment ? detail : t.unavailable;
// Operator-facing explanations, shown only in development.
const setupFailures: Record<string, string> = {
  provider_credits: "The RoEx credit balance is empty, so previews and full tracks stop. Top up in the Tonn portal (or turn on Auto Top-Up), then retry.",
  provider_auth: "RoEx rejected the API key. Check ROEX_API_KEY, rebuild the API and processor, then retry.",
  provider_not_configured: "RoEx AI isn't configured. Add ROEX_API_KEY to the root .env and rebuild the API and processor.",
  provider_dev_key: "The RoEx key in .env is a development key, which only returns placeholder results. Put your production key in ROEX_API_KEY, rebuild the API and processor, then retry.",
};
function failureMessage(code: string, t: Copy) {
  if (setupFailures[code]) return setupMessage(setupFailures[code], t);
  return t.failures[code] || t.failureDefault;
}

type StepState = "done" | "current" | "todo";

function Step({ number, title, state, status, children }: { number: number; title: string; state: StepState; status?: string; children: ReactNode }) {
  const t = copy[useLocale()];
  return <section className={`step step-${state}`} aria-labelledby={`step-${number}`}>
    <header className="step-head">
      <span className="step-badge" aria-hidden="true">{state === "done" ? "✓" : number}</span>
      <h2 id={`step-${number}`}><span className="visually-hidden">{t.step(number)}</span>{title}</h2>
      {status && <span className="step-status">{status}</span>}
    </header>
    <div className="step-body">{children}</div>
  </section>;
}

function RefineForm({ disabled, onRefine }: { disabled: boolean; onRefine: (note: string) => Promise<boolean> }) {
  const t = copy[useLocale()];
  const [note, setNote] = useState("");
  return <form className="refine" onSubmit={(event) => { event.preventDefault(); void onRefine(note.trim()).then((created) => { if (created) setNote(""); }); }}>
    <label htmlFor="refine-note">{t.refineLabel}</label>
    <div className="field-row"><input id="refine-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder={t.refinePlaceholder} /><button type="submit" className="btn btn-primary" disabled={disabled || !note.trim()}>{t.refineButton}</button></div>
    <p className="hint">{t.refineHint}</p>
  </form>;
}

function versionHeading(job: JobItem, projectType: "mix" | "master", t: Copy) {
  const ai = job.processor === "roex_tonn";
  const h = t.headings;
  if (job.render === "full") return job.status === "completed" ? h.fullReady : job.status === "failed" ? h.fullFailed : h.fullRendering;
  if (job.status === "completed") return ai ? h.aiReady(projectType === "master") : h.localReady;
  if (job.status === "failed") return h.failed;
  return job.status === "queued" ? h.queued : h.mixing;
}

export default function MixerWorkspace() {
  const locale = useLocale();
  const t = copy[locale];
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
  const untitled = t.untitled;

  /** The message to show for a failed API call, in the page language when it is a known message (see lib/studio-messages.ts). */
  const apiError = (body: { detail?: unknown; error?: string }, fallback: string) =>
    (typeof body.detail === "string" && serverMessage(body.detail, locale)) || (body.error && serverMessage(body.error, locale)) || fallback;

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
      if (!active) active = await createProject(untitled);
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
  }, [untitled]);

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
    setNotice(retry ? t.retrying : t.starting);
    try {
      if (project.projectType === "master" && project.tracks.length !== 1) throw new Error(t.masterNeedsOne);
      const saved = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: project.title, prompt: project.prompt, projectType: project.projectType }),
      });
      if (!saved.ok) {
        const saveError = await saved.json().catch(() => ({})) as { detail?: string; error?: string };
        throw new Error(apiError(saveError, setupMessage("Start PostgreSQL before queueing a preview.", t)));
      }
      const base = `/api/projects/${encodeURIComponent(project.id)}/jobs`;
      const url = retry && job ? `${base}/${encodeURIComponent(job.id)}/retry` : base;
      const response = await fetch(url, { method: "POST" });
      const body = await response.json().catch(() => ({})) as { job?: Record<string, unknown>; detail?: string; error?: string };
      if (!response.ok || !body.job) throw new Error(apiError(body, t.notAccepted));
      const createdJob = jobFromApi(body.job);
      setJob(createdJob);
      updateProject({ status: "queued" });
      setNotice(createdJob.processor === "roex_tonn" ? t.queuedAi : t.queuedLocal);
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : t.notAccepted);
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
      if (!response.ok || !body.job) throw new Error(apiError(body, t.refineFailed));
      setJob(jobFromApi(body.job));
      setOutputUrl(null);
      updateProject({ status: "queued" });
      setNotice(t.refineQueued((body.changes || []).join(", ")));
      return true;
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : t.refineFailed);
      return false;
    } finally { setJobPending(false); }
  }

  async function requestFullTrack() {
    if (!project || !job || job.render !== "preview" || job.status !== "completed") return;
    const remaining = usage ? usage.fullTracks.limit - usage.fullTracks.used : null;
    if (!window.confirm(remaining === null ? t.confirmFull : t.confirmFullCount(remaining))) return;
    setJobPending(true);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/jobs/${encodeURIComponent(job.id)}/full`, { method: "POST" });
      const body = await response.json().catch(() => ({})) as { job?: Record<string, unknown>; detail?: string; error?: string };
      if (!response.ok || !body.job) throw new Error(apiError(body, t.fullFailed));
      setJob(jobFromApi(body.job));
      setOutputUrl(null);
      updateProject({ status: "queued" });
      setNotice(t.fullRequested);
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : t.fullFailed);
    } finally { setJobPending(false); }
  }

  async function downloadOutput(format?: "mp3" | "wav") {
    if (!project || !job) return;
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/jobs/${encodeURIComponent(job.id)}/download${format ? `?format=${format}` : ""}`);
      const body = await response.json().catch(() => ({})) as { url?: string; detail?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(apiError(body, t.downloadFailed));
      window.location.assign(body.url);
    } catch (issue) { setNotice(issue instanceof Error ? issue.message : t.downloadFailed); }
  }

  async function playOutput() {
    if (!project || !job || job.status !== "completed") return;
    setOutputPending(true);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/jobs/${encodeURIComponent(job.id)}/download?inline=1`);
      const body = await response.json().catch(() => ({})) as { url?: string; detail?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(apiError(body, t.previewFailed));
      setOutputUrl(body.url);
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : t.previewFailed);
    } finally {
      setOutputPending(false);
    }
  }

  async function addTrack(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !project) return;
    const allowed = /\.(wav|mp3|flac|aiff?|m4a|ogg)$/i.test(file.name);
    if (!file.type.startsWith("audio/") && !allowed) { setNotice(t.chooseAudio); return; }
    if (file.size > 100 * 1024 * 1024) { setNotice(t.tooLarge); return; }
    setUploading(true);
    setNotice(t.uploadingNotice);
    try {
      // 1. Get a signed link, 2. send the file straight to storage, 3. have the API check and add it.
      const tracksUrl = `/api/projects/${encodeURIComponent(project.id)}/tracks`;
      const json = { "Content-Type": "application/json" };
      const linkResponse = await fetch(`${tracksUrl}/uploads`, { method: "POST", headers: json, body: JSON.stringify({ filename: file.name, category, size_bytes: file.size }) });
      const link = await linkResponse.json().catch(() => ({})) as { trackId?: string; url?: string; contentType?: string; detail?: string; error?: string };
      if (!linkResponse.ok || !link.trackId || !link.url) throw new Error(apiError(link, t.uploadNotStarted));
      const stored = await fetch(link.url, { method: "PUT", headers: { "Content-Type": link.contentType || "application/octet-stream" }, body: file });
      if (!stored.ok) throw new Error(t.storageFailed);
      const response = await fetch(tracksUrl, { method: "POST", headers: json, body: JSON.stringify({ track_id: link.trackId, filename: file.name, category }) });
      const body = await response.json().catch(() => ({})) as { track?: { id: string; category: TrackCategory; original_name: string; mime_type: string; size_bytes: number; created_at?: string }; detail?: string; error?: string };
      if (!response.ok || !body.track) throw new Error(apiError(body, t.uploadFailed));
      const track: TrackRecord = { id: body.track.id, name: body.track.original_name, category: body.track.category, mimeType: body.track.mime_type, sizeBytes: body.track.size_bytes, lastModified: body.track.created_at ? Date.parse(body.track.created_at) : file.lastModified };
      const next = persistProject({ ...project, tracks: [...project.tracks, track], status: "ready" });
      setProject(next);
      setNotice(t.uploaded);
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : t.uploadFailed);
    } finally { setUploading(false); }
  }

  async function startNewSession() {
    const next = await createProject(untitled);
    setProject(next);
    setJob(null);
    setNotice(t.newSessionReady);
  }

  async function deleteCurrentSession() {
    if (!project) return;
    if (!window.confirm(t.confirmDelete(project.title))) return;
    const deleted = await removeProject(project.id);
    if (!deleted) { setNotice(t.deleteFailed); return; }
    const remaining = await listProjects();
    const next = remaining[0] || await createProject(untitled);
    setProject(next);
    setJob(null);
    setActiveProjectId(next.id);
    setNotice(t.sessionRemoved);
  }

  async function removeTrack(id: string) {
    if (!project) return;
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/tracks/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string; error?: string };
        setNotice(apiError(body, t.trackDeleteFailed));
        return;
      }
    } catch { setNotice(t.trackServiceDown); return; }
    updateProject({ tracks: project.tracks.filter((track) => track.id !== id) });
    setNotice(t.trackRemoved);
  }

  if (!project) return <div className="studio-loading" aria-live="polite">{t.opening}</div>;

  const master = project.projectType === "master";
  const hasTracks = master ? project.tracks.length === 1 : project.tracks.length > 0;
  const hasDirection = project.prompt.trim().length > 0;
  const ready = hasTracks && hasDirection;
  const busy = jobPending || job?.status === "queued" || job?.status === "processing";
  const fullTracksLeft = usage ? Math.max(0, usage.fullTracks.limit - usage.fullTracks.used) : null;
  const allowanceText: ReactNode = !usage ? t.allowanceUnknown
    : usage.fullTracks.limit === 0 ? <>{t.allowanceNone}<Link className="text-link" href="/pricing">{t.seePlans}</Link></>
    : fullTracksLeft === 0 ? t.allowanceUsed(usage.fullTracks.limit, planName(usage, locale), resetDate(usage, locale))
    : t.allowanceLeft(fullTracksLeft ?? 0, planName(usage, locale), resetDate(usage, locale));
  const completed = job?.status === "completed";
  const ai = job?.processor === "roex_tonn";
  const categories = categoryIds.map((id) => ({ id, name: t.categories[id][0], detail: t.categories[id][1] }));
  const categoryOptions = master ? categories.filter((item) => item.id === "master") : categories.filter((item) => item.id !== "master");
  const missing = !hasTracks ? (master ? t.missingSong : t.missingTrack) : !hasDirection ? t.missingDirection : "";
  const trackStatus = project.tracks.length ? t.tracks(project.tracks.length) : undefined;

  function addPhrase(phrase: string) {
    if (!project) return;
    const current = project.prompt.trim();
    if (current.toLowerCase().includes(phrase.toLowerCase())) return;
    updateProject({ prompt: current ? `${current}, ${phrase}` : phrase.charAt(0).toUpperCase() + phrase.slice(1) });
  }

  return <div className="mixer">
    <div className="mixer-head">
      <div className="title-field">
        <label htmlFor="session-title">{t.sessionName}</label>
        <input ref={titleRef} id="session-title" value={project.title} maxLength={120} onChange={(event) => updateProject({ title: event.target.value })} />
      </div>
      <div className="mixer-head-actions">
        <div className="segmented" role="group" aria-label={t.sessionType}>
          <button aria-pressed={!master} onClick={() => chooseProjectType("mix")}>{t.mix}</button>
          <button aria-pressed={master} onClick={() => chooseProjectType("master")}>{t.master}</button>
        </div>
        <button className="btn btn-secondary" onClick={startNewSession}>{t.newSession}</button>
      </div>
    </div>
    <p className="mixer-intro">{master ? t.introMaster : t.introMix}{t.autosave}</p>
    {notice && <div className="notice-bar" role="status"><span>{notice}</span><button aria-label={t.dismiss} onClick={() => setNotice("")}>×</button></div>}

    <Step number={1} title={master ? t.step1Master : t.step1Mix} state={hasTracks ? "done" : "current"} status={trackStatus}>
      {project.tracks.length > 0 && <ul className="track-list">{project.tracks.map((track) => {
        const name = categories.find((item) => item.id === track.category)?.name || t.trackFallback;
        return <li key={track.id} className="track"><span className={`chip chip-${track.category}`}>{name}</span><span className="track-name" title={track.name}>{track.name}</span><span className="track-size">{formatBytes(track.sizeBytes, locale)}</span><button className="btn-text" aria-label={t.removeLabel(track.name)} onClick={() => removeTrack(track.id)}>{t.remove}</button></li>;
      })}</ul>}
      {!(master && project.tracks.length >= 1) && <div className="add-track">
        <button className="btn btn-primary" disabled={uploading} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{uploading ? t.uploading : project.tracks.length ? t.addAnother : t.addTrack}</button>
        {menuOpen && <div className="menu" role="menu">{categoryOptions.map((item) => <button key={item.id} role="menuitem" onClick={() => chooseCategory(item.id)}><b>{item.name}</b><span>{item.detail}</span></button>)}</div>}
        <p className="hint">{master ? t.hintMaster : t.hintMix}</p>
      </div>}
      <input ref={inputRef} className="visually-hidden" type="file" accept="audio/*,.wav,.mp3,.flac,.aiff,.aif,.m4a,.ogg" onChange={addTrack} aria-label={t.chooseFile(category)} />
    </Step>

    <Step number={2} title={t.step2} state={hasDirection ? "done" : hasTracks ? "current" : "todo"}>
      <label className="visually-hidden" htmlFor="mix-direction">{master ? t.directionMaster : t.directionMix}</label>
      <textarea id="mix-direction" maxLength={4000} value={project.prompt} onChange={(event) => updateProject({ prompt: event.target.value })} placeholder={master ? t.placeholderMaster : t.placeholderMix} />
      <div className="phrase-row"><span className="hint">{t.add}</span>{t.quickPhrases[master ? "master" : "mix"].map((phrase) => <button key={phrase} className="phrase" onClick={() => addPhrase(phrase)}>+ {phrase}</button>)}</div>
      <p className="hint">{t.directionHint}<Link className="text-link" href="/studio/guide">{t.guideLink}</Link> <span className="counter">{wordCount}/4000</span></p>
    </Step>

    <Step number={3} title={t.step3} state={completed ? "done" : ready ? "current" : "todo"}>
      {job && <div className={`version version-${job.status}`} aria-live="polite">
        <div className="version-head"><b>{versionHeading(job, project.projectType, t)}</b><span className="tag">{ai ? job.render === "full" ? t.tagAiFull : t.tagAi : t.tagLocal}</span></div>
        {job.refinement && <p className="version-meta">{t.yourNote(job.refinement)}</p>}
        {job.settings ? <SettingsKnobs settings={job.settings} caption={(job.status === "queued" || job.status === "processing") ? <WaitingLine mode={master ? "master" : "mix"} autotune={Boolean(job.settings.autotune)} /> : undefined} /> : job.summary && <p className="version-meta">{t.settings(job.summary)}</p>}
        {(job.status === "queued" || job.status === "processing") && <div className="progress" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100} aria-label={t.progress}><i style={{ width: `${Math.max(4, job.progress)}%` }} /></div>}
        {completed && <>
          <p className="hint">{job.render === "full" ? t.fullReadyHint : ai ? t.aiPreviewHint : t.localPreviewHint}</p>
          {!outputUrl && <div className="button-row"><button className="btn btn-secondary" disabled={outputPending} onClick={() => void playOutput()}>{outputPending ? t.loading : job.render === "full" ? t.loadFull : t.loadPreview}</button></div>}
          {outputUrl && <Transport src={outputUrl} autoPlay label={t.playerLabel(job.render === "full", project.title)} />}
          {!master && <RefineForm disabled={jobPending} onRefine={refineVersion} />}
        </>}
        {job.status === "failed" && <><p className="error-text">{failureMessage(job.error_code || "", t)}</p><button className="btn btn-secondary" disabled={jobPending} onClick={() => void startProcessing(true)}>{t.retry}</button></>}
      </div>}
      {(!job || completed || job.status === "failed") && <div className="create-row">
        <button className={`btn ${job ? "btn-secondary" : "btn-primary btn-large"}`} disabled={!ready || busy || uploading} onClick={() => void startProcessing()}>{jobPending ? t.startingShort : job ? t.startOver : master ? t.createMaster : t.createPreview}</button>
        <p className="hint">{missing || (job ? t.startOverHint : t.createHint)}</p>
      </div>}
    </Step>

    <Step number={4} title={t.step4} state={completed && job?.render === "full" ? "done" : completed ? "current" : "todo"}>
      {completed && job ? <div className="button-row">
        {ai && job.render === "preview" && <button className="btn btn-primary" disabled={jobPending || fullTracksLeft === 0} onClick={() => void requestFullTrack()}>{t.getFull}</button>}
        {job.render === "full"
          ? <>
            <button className="btn btn-secondary" onClick={() => void downloadOutput("mp3")}>{t.downloadMp3}</button>
            {usage?.formats.includes("wav") && job.output_format === "wav" && <button className="btn btn-secondary" onClick={() => void downloadOutput("wav")}>{t.downloadWav}</button>}
            {usage && !usage.formats.includes("wav") && <p className="hint">{t.wavWithArtist}<Link className="text-link" href="/pricing">{t.seePlans}</Link></p>}
          </>
          : <button className="btn btn-secondary" onClick={() => void downloadOutput()}>{t.downloadPreview(job.output_format?.toUpperCase() || "WAV")}</button>}
        {ai && job.render === "preview" && <p className="hint">{allowanceText}</p>}
      </div> : <p className="hint">{t.availableLater}</p>}
    </Step>

    <p className="danger-zone"><button className="btn-text btn-danger" onClick={deleteCurrentSession}>{t.deleteSession}</button></p>
  </div>;
}
