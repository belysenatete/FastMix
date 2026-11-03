import { NextResponse } from "next/server";
import { connection } from "next/server";
import { sqlClient } from "@/lib/database";
import { LIFETIME_LIMIT } from "@/lib/paddle";

/** How many lifetime deals are left, for the "X of 100 left" line on the pricing cards. */
export async function GET() {
  await connection();
  const sql = sqlClient();
  if (!sql) return NextResponse.json({ left: null });
  const [{ sold }] = await sql`SELECT count(*)::int AS sold FROM subscriptions WHERE plan_key = 'lifetime' AND provider = 'paddle'`;
  return NextResponse.json({ left: Math.max(0, LIFETIME_LIMIT - sold), limit: LIFETIME_LIMIT }, { headers: { "Cache-Control": "public, max-age=60" } });
}
