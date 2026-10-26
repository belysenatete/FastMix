"use client";

import { useEffect, useState } from "react";

// Ordered roughly from the start of a render to the end, so later lines show up as the wait goes on.
const lines = {
  mix: [
    "Warming up the console…",
    "Listening to your vocal…",
    "Setting the vocal level…",
    "Clearing space in the beat for your voice…",
    "Tuning the notes…",
    "Riding the faders…",
    "Adding the reverb…",
    "Balancing the low end…",
    "Good mixes take a minute. Great ones take two.",
    "Bringing it up to streaming loudness…",
    "Checking the peaks so nothing clips…",
    "Polishing the final touches…",
    "Tip: once it's ready, write a note like “more reverb” to change it.",
  ],
  master: [
    "Warming up the console…",
    "Listening to your song…",
    "Measuring the loudness…",
    "Shaping the tone…",
    "Tightening the low end…",
    "Adding width…",
    "Good masters take a minute. Great ones take two.",
    "Bringing it up to streaming loudness…",
    "Checking the peaks so nothing clips…",
    "Polishing the final touches…",
    "Tip: once it's ready, write a note like “a bit louder” to change it.",
  ],
};

const INTERVAL_MS = 4000;

/** Rotating status lines shown while a version renders, so the wait doesn't feel stuck. */
export default function WaitingLine({ mode, autotune = true }: { mode: "mix" | "master"; autotune?: boolean }) {
  const [index, setIndex] = useState(0);
  const list = autotune ? lines[mode] : lines[mode].filter((line) => !line.startsWith("Tuning"));

  useEffect(() => {
    // Stay on the last lines instead of starting over, so a long wait still reads as progress.
    const timer = window.setInterval(() => setIndex((current) => current + 1 < list.length ? current + 1 : list.length - 3), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [list.length]);

  // Decorative: the heading and progress bar already announce the status to screen readers.
  return <span key={index} className="waiting-line" aria-hidden="true">{list[index]}</span>;
}
