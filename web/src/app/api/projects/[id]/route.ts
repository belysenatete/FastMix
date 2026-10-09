import { NextResponse } from "next/server";
import { getDemoSession } from "@/lib/demo-auth";
import { sqlClient } from "@/lib/database";

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
  const body = await request.json().catch(() => null) as { title?: unknown; prompt?: unknown; status?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : null;
  const prompt = typeof body?.prompt === "string" ? body.prompt.slice(0, 4000) : null;
  const [project] = await owner.sql`
    UPDATE projects SET
      title = COALESCE(${title}, title), prompt = COALESCE(${prompt}, prompt), updated_at = now()
    WHERE id = ${id} AND user_id = ${owner.id}
    RETURNING *
  `;
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json({ project });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwner();
  if (!owner) return NextResponse.json({ error: "Sign in and configure DATABASE_URL to delete projects." }, { status: 503 });
  const { id } = await params;
  const [project] = await owner.sql`DELETE FROM projects WHERE id = ${id} AND user_id = ${owner.id} RETURNING id`;
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
