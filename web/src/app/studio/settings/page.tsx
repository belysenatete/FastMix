import { getDemoSession } from "@/lib/demo-auth";
import AccountHub from "@/components/account-hub";
export default async function SettingsPage() { const session = await getDemoSession(); return <AccountHub email={session?.email || ""} />; }
