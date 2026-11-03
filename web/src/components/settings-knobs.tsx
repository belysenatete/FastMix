"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/locale-provider";
import type { Locale } from "@/lib/locale";

export type VersionSettings = {
  genre: string;
  loudness: "LOW" | "MEDIUM" | "HIGH";
  vocal_gain_db: number;
  reverb: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  autotune: { strength: number; key?: string | null } | null;
};

const GENRES: Record<string, string> = { HIPHOP_GRIME: "Hip-hop", LO_FI: "Lo-fi", K_POP: "K-pop", COUNTRY_ACOUSTIC: "Country", ROCK_INDIE: "Rock/indie", REGGAE_DUB: "Reggae/dub", OTHER: "Auto style" };
const GENRES_FR: Record<string, string> = { ...GENRES, ROCK_INDIE: "Rock/indé", OTHER: "Style auto", LATIN: "Latino", CINEMATIC: "Cinématique", ACOUSTIC: "Acoustique", ELECTRONIC: "Électronique" };
const genreName = (genre: string, locale: Locale) => (locale === "fr" ? GENRES_FR : GENRES)[genre] || genre.charAt(0) + genre.slice(1).toLowerCase().replace(/_/g, " ");

const copy = {
  en: {
    vocal: "Vocal", reverb: "Reverb", tune: "Tune", loud: "Loud",
    reverbLevels: { NONE: "Dry", LOW: "Low", MEDIUM: "Medium", HIGH: "High" },
    loudness: { LOW: "Low", MEDIUM: "Medium", HIGH: "High" },
    tuneNames: { off: "Off", hard: "Hard", normal: "Normal", subtle: "Subtle" },
  },
  fr: {
    vocal: "Voix", reverb: "Réverbe", tune: "Autotune", loud: "Volume",
    reverbLevels: { NONE: "Sèche", LOW: "Légère", MEDIUM: "Moyenne", HIGH: "Forte" },
    loudness: { LOW: "Faible", MEDIUM: "Moyen", HIGH: "Fort" },
    tuneNames: { off: "Aucun", hard: "Fort", normal: "Normal", subtle: "Léger" },
  },
};

const SOLFEGE: Record<string, string> = { C: "Do", D: "Ré", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };
/** The worker names keys in English ("A# minor"); French uses solfège ("La# mineur"). */
function keyName(key: string, locale: Locale) {
  if (locale !== "fr") return key;
  const match = /^([A-G])([#b]?) (major|minor)$/.exec(key);
  return match ? `${SOLFEGE[match[1]]}${match[2]} ${match[3] === "minor" ? "mineur" : "majeur"}` : key;
}

/** A knob drawn at a position between 0 and 1 (a 270° sweep), with its real value as the caption. */
function Knob({ label, position, value }: { label: string; position: number; value: string }) {
  const angle = -135 + Math.min(1, Math.max(0, position)) * 270;
  const separator = useLocale() === "fr" ? " : " : ": ";
  return <div className="knob" role="img" aria-label={`${label}${separator}${value}`}>
    <span className="knob-cap" style={{ transform: `rotate(${angle}deg)` }} />
    <b>{label}</b><span>{value}</span>
  </div>;
}

/** `caption` replaces the style name, e.g. with status lines while the version renders. */
export default function SettingsKnobs({ settings, caption }: { settings: VersionSettings; caption?: ReactNode }) {
  const locale = useLocale();
  const t = copy[locale];
  const reverbLevels = ["NONE", "LOW", "MEDIUM", "HIGH"];
  const loudnessLevels = ["LOW", "MEDIUM", "HIGH"];
  const tune = settings.autotune;
  const tuneName = t.tuneNames[!tune ? "off" : tune.strength >= 1 ? "hard" : tune.strength >= 0.8 ? "normal" : "subtle"];
  return <div className="knobs">
    <Knob label={t.vocal} position={(settings.vocal_gain_db + 6) / 12} value={`${settings.vocal_gain_db > 0 ? "+" : ""}${settings.vocal_gain_db} dB`} />
    <Knob label={t.reverb} position={reverbLevels.indexOf(settings.reverb) / 3} value={t.reverbLevels[settings.reverb] ?? settings.reverb} />
    <Knob label={t.tune} position={tune ? tune.strength : 0} value={tune?.key ? `${tuneName} · ${keyName(tune.key, locale)}` : tuneName} />
    <Knob label={t.loud} position={(loudnessLevels.indexOf(settings.loudness) + 1) / 3} value={t.loudness[settings.loudness] ?? settings.loudness} />
    <p className="knobs-genre">{caption ?? genreName(settings.genre, locale)}</p>
  </div>;
}
