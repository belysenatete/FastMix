"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

const navigation = [
  { href: "/studio/mixer", icon: "＋", label: "New session" },
  { href: "/studio/library", icon: "▦", label: "My library" },
  { href: "/studio/affiliate", icon: "↗", label: "Affiliate" },
  { href: "/studio/guide", icon: "✳", label: "Sound guide" },
];

export default function StudioShell({ children, name, email }: { children: ReactNode; name: string; email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const sectionName = pathname.includes("library") ? "MY LIBRARY" : pathname.includes("guide") ? "SOUND GUIDE" : pathname.includes("affiliate") ? "AFFILIATE" : pathname.includes("billing") ? "PLAN & BILLING" : pathname.includes("settings") ? "SETTINGS" : pathname.includes("support") ? "SUPPORT" : "YOUR STUDIO";
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "FM";

  async function signOut() {
    await fetch("/api/auth/demo", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  async function enableNotifications() {
    if (!("Notification" in window)) { setNotice("This browser does not support desktop notifications."); return; }
    const permission = await Notification.requestPermission();
    setNotice(permission === "granted" ? "Notifications are on for this browser." : "Notification permission was not granted.");
  }

  return <div className="studio-app">
    <aside className="studio-sidebar">
      <Link className="brand studio-brand" href="/studio/mixer"><span className="brand-mark"><i/><i/><i/><i/><i/></span><span>fastmix<span className="brand-dot">.</span></span></Link>
      <div className="sidebar-eyebrow">WORKSPACE</div>
      <nav className="studio-navigation" aria-label="Studio navigation">{navigation.map((item) => <Link key={item.href} href={item.href} className={`studio-nav-item${pathname === item.href || (item.href !== "/studio/mixer" && pathname.startsWith(item.href)) ? " studio-nav-active" : ""}`}><span>{item.icon}</span>{item.label}{item.href === "/studio/mixer" && <b>⌘ K</b>}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="preview-badge"><i /> LOCAL PREVIEW</div><button className="side-help" onClick={() => router.push("/studio/support")}><span>?</span> Need a hand?</button><div className="sidebar-user"><div className="user-avatar">{initials}</div><div><b>{name}</b><small>Artist workspace</small></div><button aria-label="Open account menu" onClick={() => setMenuOpen(!menuOpen)}>···</button></div></div>
    </aside>
    <div className="studio-main">
      <header className="studio-topbar"><div className="studio-crumb"><span>FASTMIX</span><i>/</i><b>{sectionName}</b></div><div className="studio-top-actions"><button className="notification-button" onClick={enableNotifications}><span>♧</span> Notifications</button><div className="account-wrap"><button className="account-button" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span className="user-avatar">{initials}</span><span className="account-name">{name}</span><span className="chevron">⌄</span></button>{menuOpen && <div className="account-menu"><div className="account-menu-user"><b>{name}</b><small>{email}</small></div><Link href="/studio/billing" onClick={() => setMenuOpen(false)}>Plan &amp; Billing</Link><Link href="/studio/settings" onClick={() => setMenuOpen(false)}>Settings</Link><Link href="/studio/support" onClick={() => setMenuOpen(false)}>Support</Link><Link href="/studio/guide" onClick={() => setMenuOpen(false)}>Language · English</Link><button onClick={signOut}>Sign out</button></div>}</div></div></header>
      {notice && <div className="studio-toast" role="status"><span>{notice}</span><button aria-label="Dismiss notification message" onClick={() => setNotice("")}>×</button></div>}
      <div className="studio-content">{children}</div>
    </div>
  </div>;
}
