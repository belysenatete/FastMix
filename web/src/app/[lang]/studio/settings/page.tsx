import { getClerkSession } from "@/lib/clerk-auth";
import AccountHub from "@/components/account-hub";
export default async function SettingsPage() { const session = await getClerkSession(); return <AccountHub email={session?.email || ""} />; }
