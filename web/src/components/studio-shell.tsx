"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";

const tabs = [
  { href: "/studio/mixer", label: "Mix" },
  { href: "/studio/library", label: "Library" },
  { href: "/studio/guide", label: "Guide" },
];

export default function StudioShell({ children, name, email }: { children: ReactNode; name: string; email: string }) {
  const pathname = usePathname();
  const clerk = useClerk();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [displayName, setDisplayName] = useState(name);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncProfile = () => setDisplayName(localStorage.getItem("fastmix.profile.name") || name);
    syncProfile();
    window.addEventListener("fastmix-profile", syncProfile);
    return () => window.removeEventListener("fastmix-profile", syncProfile);
  }, [name]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    const closeOutside = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("mousedown", closeOutside);
    return () => { window.removeEventListener("keydown", closeOnEscape); window.removeEventListener("mousedown", closeOutside); };
  }, [menuOpen]);

  const initials = displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "FM";

  async function enableNotifications() {
    setMenuOpen(false);
    if (!("Notification" in window)) { setNotice("This browser does not support desktop notifications."); return; }
    const permission = await Notification.requestPermission();
    setNotice(permission === "granted" ? "Notifications are on for this browser." : "Notification permission was not granted.");
  }

  return <div className="studio">
    <header className="studio-bar">
      <div className="container studio-bar-inner">
        <Link className="wordmark" href="/studio/mixer" aria-label="FastMix studio">Fast<b>mix</b></Link>
        <nav className="studio-tabs" aria-label="Studio">
          {tabs.map((tab) => <Link key={tab.href} href={tab.href} aria-current={pathname.startsWith(tab.href) ? "page" : undefined}>{tab.label}</Link>)}
        </nav>
        <div className="account" ref={menuRef}>
          <button className="account-button" aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="avatar" aria-hidden="true">{initials}</span><span className="account-name">{displayName}</span><span aria-hidden="true">▾</span>
          </button>
          {menuOpen && <div className="account-menu" role="menu">
            <p className="account-who"><b>{displayName}</b><span>{email}</span></p>
            <Link role="menuitem" href="/studio/settings" onClick={() => setMenuOpen(false)}>Settings</Link>
            <Link role="menuitem" href="/studio/billing" onClick={() => setMenuOpen(false)}>Plan &amp; billing</Link>
            <Link role="menuitem" href="/studio/support" onClick={() => setMenuOpen(false)}>Help &amp; support</Link>
            <Link role="menuitem" href="/studio/affiliate" onClick={() => setMenuOpen(false)}>Affiliate program</Link>
            <button role="menuitem" onClick={() => void enableNotifications()}>Turn on notifications</button>
            <button role="menuitem" onClick={() => void clerk.signOut({ redirectUrl: "/login" })}>Sign out</button>
          </div>}
        </div>
      </div>
    </header>
    {notice && <div className="container"><div className="notice-bar" role="status"><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}>×</button></div></div>}
    <main className="container studio-content">{children}</main>
  </div>;
}
