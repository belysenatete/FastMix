"use client";

import { useEffect, useRef, useState } from "react";

const SEGMENTS = 14;

export function formatClock(seconds: number, tenths = true) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${tenths ? rest.toFixed(1).padStart(4, "0") : String(Math.floor(rest)).padStart(2, "0")}`;
}

/** LED-style level meter. Lights segments from a 0-1 level; the top segments act as hot and clip lights. */
export function LevelMeter({ level }: { level: number }) {
  const lit = Math.round(Math.min(1, Math.max(0, level)) * SEGMENTS);
  return <span className="meter" aria-hidden="true">{Array.from({ length: SEGMENTS }, (_, index) => {
    const zone = index >= SEGMENTS - 1 ? "clip" : index >= SEGMENTS - 4 ? "hot" : "ok";
    return <i key={index} className={index < lit ? `on ${zone}` : undefined} />;
  })}</span>;
}

/**
 * Reads the real output level of an <audio> element through the Web Audio API.
 * Cross-origin audio must be served with CORS and loaded with crossOrigin="anonymous".
 */
export function useAudioLevel(audio: HTMLAudioElement | null, active: boolean) {
  const [level, setLevel] = useState(0);
  const graph = useRef<{ context: AudioContext; analyser: AnalyserNode; element: HTMLAudioElement } | null>(null);

  useEffect(() => {
    if (!audio || !active) return;
    if (!graph.current || graph.current.element !== audio) {
      try {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        context.createMediaElementSource(audio).connect(analyser);
        analyser.connect(context.destination);
        graph.current = { context, analyser, element: audio };
      } catch { return; }
    }
    const { context, analyser } = graph.current;
    void context.resume();
    const samples = new Float32Array(analyser.fftSize);
    let frame = 0;
    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
      // Map -48..0 dBFS onto the meter so quiet passages still move it.
      const db = 20 * Math.log10(Math.max(peak, 1e-5));
      setLevel(Math.max(0, (db + 48) / 48));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); setLevel(0); };
  }, [audio, active]);

  return level;
}

/** Studio-style player: play/pause, clock readout, seek bar and a live level meter. */
export default function Transport({ src, label, autoPlay = false }: { src: string; label: string; autoPlay?: boolean }) {
  // The ref drives playback; the state copy lets the level meter subscribe once the element exists.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const level = useAudioLevel(audio, playing);

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    const element = audioRef.current;
    if (!element || !duration) return;
    const box = event.currentTarget.getBoundingClientRect();
    element.currentTime = ((event.clientX - box.left) / box.width) * duration;
  }

  return <div className="transport" role="group" aria-label={label}>
    <button className="transport-play" aria-label={playing ? `Pause ${label}` : `Play ${label}`} onClick={() => { const element = audioRef.current; if (!element) return; if (playing) element.pause(); else void element.play(); }}>{playing ? "❚❚" : "▶"}</button>
    <span className="transport-clock">{formatClock(time)}</span>
    <div className="transport-seek" onClick={seek} role="slider" aria-label={`Position in ${label}`} aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(time)} tabIndex={0}
      onKeyDown={(event) => { const element = audioRef.current; if (!element) return; if (event.key === "ArrowRight") element.currentTime = Math.min(duration, element.currentTime + 5); if (event.key === "ArrowLeft") element.currentTime = Math.max(0, element.currentTime - 5); }}>
      <i style={{ width: `${duration ? (time / duration) * 100 : 0}%` }} />
    </div>
    <span className="transport-length">{formatClock(duration, false)}</span>
    <LevelMeter level={level} />
    <audio ref={(element) => { audioRef.current = element; setAudio(element); }} src={src} crossOrigin="anonymous" preload="metadata" autoPlay={autoPlay}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setTime(0); }}
      onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)} />
  </div>;
}
