export type TrackCategory = "beat" | "lead_vocal" | "doubles" | "backing_vocals" | "adlibs" | "instrument" | "master";
export type TrackRecord = { id: string; name: string; category: TrackCategory; mimeType: string; sizeBytes: number; lastModified: number };
export type ProjectRecord = { id: string; title: string; prompt: string; projectType: "mix" | "master"; status: string; createdAt: string; updatedAt: string; tracks: TrackRecord[] };

const STORAGE_KEY = "fastmix.projects.v1";
const ACTIVE_KEY = "fastmix.active-project.v1";
const saveTimers = new Map<string, number>();

export function readLocalProjects(): ProjectRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as ProjectRecord[] : [];
  } catch { return []; }
}

export function writeLocalProjects(projects: ProjectRecord[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); } catch { /* The API remains the durable store when browser storage is unavailable. */ }
}

export function getActiveProjectId() {
  try { return window.localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

export function setActiveProjectId(id: string) {
  try { window.localStorage.setItem(ACTIVE_KEY, id); } catch { /* no-op */ }
}

export async function listProjects(): Promise<ProjectRecord[]> {
  try {
    const response = await fetch("/api/projects", { cache: "no-store" });
    if (response.ok) {
      const body = await response.json() as { projects: Array<Record<string, unknown>> };
      const local = readLocalProjects();
      const projects = body.projects.map((row) => {
        const id = String(row.id);
        const existing = local.find((project) => project.id === id);
        return {
          id,
          title: String(row.title),
          prompt: String(row.prompt || ""),
          projectType: row.projectType === "master" ? "master" : "mix",
          status: String(row.status || "draft"),
          createdAt: String(row.createdAt),
          updatedAt: String(row.updatedAt),
          tracks: existing?.tracks || [],
        } satisfies ProjectRecord;
      });
      writeLocalProjects(projects);
      return projects;
    }
  } catch { /* Local preview mode can work without a running database. */ }
  return readLocalProjects();
}

export async function createProject(title = "Untitled session", projectType: "mix" | "master" = "mix") {
  const now = new Date().toISOString();
  const local: ProjectRecord = { id: crypto.randomUUID(), title, prompt: "", projectType, status: "draft", createdAt: now, updatedAt: now, tracks: [] };
  let project = local;
  try {
    const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: local.id, title, projectType }) });
    if (response.ok) {
      const body = await response.json() as { project: Record<string, unknown> };
      project = { ...local, id: String(body.project.id), createdAt: String(body.project.createdAt), updatedAt: String(body.project.updatedAt) };
    }
  } catch { /* Local preview mode can work without a running database. */ }
  const projects = readLocalProjects();
  writeLocalProjects([project, ...projects]);
  setActiveProjectId(project.id);
  return project;
}

export function persistProject(project: ProjectRecord) {
  const updated = { ...project, updatedAt: new Date().toISOString() };
  const projects = readLocalProjects();
  const index = projects.findIndex((item) => item.id === updated.id);
  if (index < 0) projects.unshift(updated); else projects[index] = updated;
  writeLocalProjects(projects);
  const previousTimer = saveTimers.get(updated.id);
  if (previousTimer) window.clearTimeout(previousTimer);
  const timer = window.setTimeout(() => {
    void fetch(`/api/projects/${encodeURIComponent(updated.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: updated.title, prompt: updated.prompt, projectType: updated.projectType }),
    }).catch(() => undefined);
    saveTimers.delete(updated.id);
  }, 450);
  saveTimers.set(updated.id, timer);
  return updated;
}

export async function removeProject(id: string) {
  writeLocalProjects(readLocalProjects().filter((project) => project.id !== id));
  try { await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" }); } catch { /* Local preview mode can work without a running database. */ }
}
