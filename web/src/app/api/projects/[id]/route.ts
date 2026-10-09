import { NextResponse } from "next/server";
import { getDemoSession } from "@/lib/demo-auth";
import { sqlClient } from "@/lib/database";
import { proxyWorker } from "@/lib/worker-proxy";

async function getOwner() {
  const session = await getDemoSession();
  const sql = sqlClient();
  if (!session || !sql) return null;
  const [user] = await sql`INSERT INTO users (email, display_name, auth_provider) VALUES (${session.email}, ${session.name}, 'local') ON CONFLICT (email) DO UPDATE SET updated_at = now() RETURNING id`;
  return { sql, id: user.id as string };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwner();
  if (!owner) return NextResponse.json({ error: "Sign in and configure DATABASE_URL to update projects." }, { status: 503 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { title?: unknown; prompt?: unknown; projectType?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : null;
  const prompt = typeof body?.prompt === "string" ? body.prompt.slice(0, 4000) : null;
  const projectType = body?.projectType === "mix" || body?.projectType === "master" ? body.projectType : null;
  const [project] = await owner.sql`
    UPDATE projects SET
      title = COALESCE(${title}, title), prompt = COALESCE(${prompt}, prompt), project_type = COALESCE(${projectType}, project_type), updated_at = now()
    WHERE id = ${id} AND user_id = ${owner.id}
    RETURNING *
  `;
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json({ project });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwner();
  if (!owner) return NextResponse.json({ error: "Sign in and configure DATABASE_URL to delete projects." }, { status: 503 });
  const { id } = await params;
  const [project] = await owner.sql`
    SELECT p.id,
      (SELECT count(*)::int FROM tracks t WHERE t.project_id = p.id) AS track_count,
      (SELECT count(*)::int FROM outputs o JOIN processing_jobs j ON j.id = o.job_id WHERE j.project_id = p.id) AS output_count,
      (SELECT count(*)::int FROM processing_jobs j WHERE j.project_id = p.id AND j.status IN ('queued', 'processing')) AS active_count
    FROM projects p WHERE p.id = ${id} AND p.user_id = ${owner.id}
  `;
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (project.activeCount > 0) return NextResponse.json({ error: "Wait for the session job to finish before deleting this project." }, { status: 409 });
  if (project.trackCount > 0 || project.outputCount > 0) {
    return proxyWorker(request, `/api/projects/${encodeURIComponent(id)}`, "DELETE");
  }
  await owner.sql`DELETE FROM projects WHERE id = ${id} AND user_id = ${owner.id}`;
  return NextResponse.json({ ok: true });
}
