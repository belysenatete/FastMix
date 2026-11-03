"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/locale-provider";
import { Wordmark } from "@/components/site-chrome";
import { ReactNode, useEffect, useRef, useState } from "react";

const copy = {
  en: {
    tabs: [
      { href: "/studio/mixer", label: "Mix" },
      { href: "/studio/library", label: "Library" },
      { href: "/studio/guide", label: "Guide" },
    ],
    wordmark: "FastMix studio",
    nav: "Studio",
    accountMenu: (name: string) => `Account menu for ${name}`,
    settings: "Settings",
    billing: "Plan & billing",
    support: "Help & support",
    affiliate: "Affiliate program",
    notifications: "Turn on notifications",
    signOut: "Sign out",
    unsupported: "This browser does not support desktop notifications.",
    granted: "Notifications are on for this browser.",
    denied: "Notification permission was not granted.",
    dismiss: "Dismiss",
  },
  fr: {
    tabs: [
      { href: "/studio/mixer", label: "Mix" },
      { href: "/studio/library", label: "Bibliothèque" },
      { href: "/studio/guide", label: "Guide" },
    ],
    wordmark: "Studio FastMix",
    nav: "Studio",
    accountMenu: (name: string) => `Menu du compte de ${name}`,
    settings: "Paramètres",
    billing: "Abonnement et facturation",
    support: "Aide et support",
    affiliate: "Programme d'affiliation",
    notifications: "Activer les notifications",
    signOut: "Se déconnecter",
    unsupported: "Ce navigateur ne prend pas en charge les notifications de bureau.",
    granted: "Les notifications sont activées pour ce navigateur.",
    denied: "L'autorisation d'envoyer des notifications n'a pas été accordée.",
    dismiss: "Fermer",
  },
};

export default function StudioShell({ children, name, email }: { children: ReactNode; name: string; email: string }) {
  const pathname = usePathname();
  const clerk = useClerk();
  const t = copy[useLocale()];
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
    if (!("Notification" in window)) { setNotice(t.unsupported); return; }
    const permission = await Notification.requestPermission();
    setNotice(permission === "granted" ? t.granted : t.denied);
  }

  return <div className="studio">
    <header className="studio-bar">
      <div className="container studio-bar-inner">
        <Wordmark href="/studio/mixer" label={t.wordmark} />
        <nav className="studio-tabs" aria-label={t.nav}>
          {t.tabs.map((tab) => <Link key={tab.href} href={tab.href} aria-current={pathname.startsWith(tab.href) ? "page" : undefined}>{tab.label}</Link>)}
        </nav>
        <div className="account" ref={menuRef}>
          <button className="account-button" aria-label={t.accountMenu(displayName)} aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="avatar" aria-hidden="true">{initials}</span><span className="account-name">{displayName}</span><span aria-hidden="true">▾</span>
          </button>
          {menuOpen && <div className="account-menu" role="menu">
            <p className="account-who"><b>{displayName}</b><span>{email}</span></p>
            <Link role="menuitem" href="/studio/settings" onClick={() => setMenuOpen(false)}>{t.settings}</Link>
            <Link role="menuitem" href="/studio/billing" onClick={() => setMenuOpen(false)}>{t.billing}</Link>
            <Link role="menuitem" href="/studio/support" onClick={() => setMenuOpen(false)}>{t.support}</Link>
            <Link role="menuitem" href="/studio/affiliate" onClick={() => setMenuOpen(false)}>{t.affiliate}</Link>
            <button role="menuitem" onClick={() => void enableNotifications()}>{t.notifications}</button>
            <button role="menuitem" onClick={() => void clerk.signOut({ redirectUrl: "/login" })}>{t.signOut}</button>
          </div>}
        </div>
      </div>
    </header>
    {notice && <div className="container"><div className="notice-bar" role="status"><span>{notice}</span><button aria-label={t.dismiss} onClick={() => setNotice("")}>×</button></div></div>}
    <main className="container studio-content">{children}</main>
  </div>;
}
