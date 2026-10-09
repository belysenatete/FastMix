import { NextResponse } from "next/server";
import { getDemoSession } from "@/lib/demo-auth";
import { sqlClient } from "@/lib/database";

async function currentUser() {
  const session = await getDemoSession();
  if (!session) return null;
  const sql = sqlClient();
  if (!sql) return null;
  const [user] = await sql`
    INSERT INTO users (email, display_name, auth_provider)
    VALUES (${session.email}, ${session.name}, 'local')
    ON CONFLICT (email) DO UPDATE SET updated_at = now()
    RETURNING id
  `;
  return { sql, id: user.id as string };
}

export async function GET(request: Request) {
  const owner = await currentUser();
  if (!owner) return NextResponse.json({ error: "Sign in and configure DATABASE_URL to use database-backed projects." }, { status: 503 });
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").slice(0, 120);
  const sort = searchParams.get("sort") || "newest";
  const order = sort === "oldest" ? "asc" : sort === "name-asc" ? "name-asc" : sort === "name-desc" ? "name-desc" : "desc";
  const rows = order === "name-asc"
    ? await owner.sql`SELECT p.*, count(t.id)::int AS track_count FROM projects p LEFT JOIN tracks t ON t.project_id = p.id WHERE p.user_id = ${owner.id} AND p.title ILIKE ${`%${query}%`} GROUP BY p.id ORDER BY p.title ASC`
    : order === "name-desc"
      ? await owner.sql`SELECT p.*, count(t.id)::int AS track_count FROM projects p LEFT JOIN tracks t ON t.project_id = p.id WHERE p.user_id = ${owner.id} AND p.title ILIKE ${`%${query}%`} GROUP BY p.id ORDER BY p.title DESC`
      : await owner.sql`SELECT p.*, count(t.id)::int AS track_count FROM projects p LEFT JOIN tracks t ON t.project_id = p.id WHERE p.user_id = ${owner.id} AND p.title ILIKE ${`%${query}%`} GROUP BY p.id ORDER BY p.updated_at ${owner.sql.unsafe(order === "asc" ? "ASC" : "DESC")}`;
  return NextResponse.json({ projects: rows });
}

export async function POST(request: Request) {
  const owner = await currentUser();
  if (!owner) return NextResponse.json({ error: "Sign in and configure DATABASE_URL to save projects." }, { status: 503 });
  const body = await request.json().catch(() => null) as { id?: unknown; title?: unknown; prompt?: unknown; projectType?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const prompt = typeof body?.prompt === "string" ? body.prompt.slice(0, 4000) : "";
  const projectType = body?.projectType === "master" ? "master" : "mix";
  if (!title) return NextResponse.json({ error: "A project title is required." }, { status: 400 });
  const id = typeof body?.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null;
  const [project] = id
    ? await owner.sql`INSERT INTO projects (id, user_id, title, prompt, project_type) VALUES (${id}, ${owner.id}, ${title}, ${prompt}, ${projectType}) RETURNING *`
    : await owner.sql`INSERT INTO projects (user_id, title, prompt, project_type) VALUES (${owner.id}, ${title}, ${prompt}, ${projectType}) RETURNING *`;
  return NextResponse.json({ project }, { status: 201 });
}
