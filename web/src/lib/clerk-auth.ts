import { auth, currentUser } from "@clerk/nextjs/server";
import { sqlClient } from "@/lib/database";

export async function getClerkSession() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;
  if (!user || !email) return null;

  return {
    id: userId,
    email,
    name: user.fullName || user.firstName || email.split("@")[0] || "Artist",
  };
}

export async function getApplicationOwner() {
  const session = await getClerkSession();
  if (!session) return null;

  const sql = sqlClient();
  if (!sql) throw new Error("Database is not configured.");

  const [claimedLocalUser] = await sql`
    UPDATE users SET clerk_user_id = ${session.id}, display_name = ${session.name}, auth_provider = 'clerk', updated_at = now()
    WHERE email = ${session.email} AND auth_provider = 'local' AND clerk_user_id IS NULL
    RETURNING id
  `;
  const [user] = claimedLocalUser ? [claimedLocalUser] : await sql`
    INSERT INTO users (email, display_name, auth_provider, clerk_user_id)
    VALUES (${session.email}, ${session.name}, 'clerk', ${session.id})
    ON CONFLICT (clerk_user_id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      updated_at = now()
    RETURNING id
  `;

  if (!user) throw new Error("This email is already connected to another account.");
  return { sql, id: user.id as string, session };
}
