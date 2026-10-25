export type VersionSettings = {
  genre: string;
  loudness: "LOW" | "MEDIUM" | "HIGH";
  vocal_gain_db: number;
  reverb: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  autotune: { strength: number; key?: string | null } | null;
};

const GENRES: Record<string, string> = { HIPHOP_GRIME: "Hip-hop", LO_FI: "Lo-fi", K_POP: "K-pop", COUNTRY_ACOUSTIC: "Country", ROCK_INDIE: "Rock/indie", REGGAE_DUB: "Reggae/dub", OTHER: "Auto style" };
const genreName = (genre: string) => GENRES[genre] || genre.charAt(0) + genre.slice(1).toLowerCase().replace(/_/g, " ");

/** A knob drawn at a position between 0 and 1 (a 270° sweep), with its real value as the caption. */
function Knob({ label, position, value }: { label: string; position: number; value: string }) {
  const angle = -135 + Math.min(1, Math.max(0, position)) * 270;
  return <div className="knob" role="img" aria-label={`${label}: ${value}`}>
    <span className="knob-cap" style={{ transform: `rotate(${angle}deg)` }} />
    <b>{label}</b><span>{value}</span>
  </div>;
}

export default function SettingsKnobs({ settings }: { settings: VersionSettings }) {
  const reverbLevels = ["NONE", "LOW", "MEDIUM", "HIGH"];
  const loudnessLevels = ["LOW", "MEDIUM", "HIGH"];
  const tune = settings.autotune;
  const tuneName = !tune ? "Off" : tune.strength >= 1 ? "Hard" : tune.strength >= 0.8 ? "Normal" : "Subtle";
  return <div className="knobs">
    <Knob label="Vocal" position={(settings.vocal_gain_db + 6) / 12} value={`${settings.vocal_gain_db > 0 ? "+" : ""}${settings.vocal_gain_db} dB`} />
    <Knob label="Reverb" position={reverbLevels.indexOf(settings.reverb) / 3} value={settings.reverb === "NONE" ? "Dry" : settings.reverb.charAt(0) + settings.reverb.slice(1).toLowerCase()} />
    <Knob label="Tune" position={tune ? tune.strength : 0} value={tune?.key ? `${tuneName} · ${tune.key}` : tuneName} />
    <Knob label="Loud" position={(loudnessLevels.indexOf(settings.loudness) + 1) / 3} value={settings.loudness.charAt(0) + settings.loudness.slice(1).toLowerCase()} />
    <p className="knobs-genre">{genreName(settings.genre)}</p>
  </div>;
}
