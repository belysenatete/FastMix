"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

// Ordered roughly from the start of a render to the end, so later lines show up as the wait goes on.
const lines = {
  en: {
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
  },
  fr: {
    mix: [
      "Préchauffage de la console…",
      "Écoute de votre voix…",
      "Réglage du niveau de la voix…",
      "On fait de la place à votre voix dans le beat…",
      "Correction de la justesse…",
      "Réglage des faders…",
      "Ajout de la réverbe…",
      "Équilibrage des basses…",
      "Un bon mix prend une minute. Un excellent, deux.",
      "Mise au volume des plateformes de streaming…",
      "Contrôle des crêtes pour éviter toute saturation…",
      "Dernières finitions…",
      "Astuce : une fois prêt, écrivez une note comme « plus de réverbe » pour le modifier.",
    ],
    master: [
      "Préchauffage de la console…",
      "Écoute de votre morceau…",
      "Mesure du volume…",
      "Travail du timbre…",
      "Resserrement des basses…",
      "Élargissement de l'image stéréo…",
      "Un bon master prend une minute. Un excellent, deux.",
      "Mise au volume des plateformes de streaming…",
      "Contrôle des crêtes pour éviter toute saturation…",
      "Dernières finitions…",
      "Astuce : une fois prêt, écrivez une note comme « un peu plus fort » pour le modifier.",
    ],
  },
};
// Left out when the version has no autotune.
const TUNING_LINE = { en: "Tuning the notes…", fr: "Correction de la justesse…" };

const INTERVAL_MS = 4000;

/** Rotating status lines shown while a version renders, so the wait doesn't feel stuck. */
export default function WaitingLine({ mode, autotune = true }: { mode: "mix" | "master"; autotune?: boolean }) {
  const locale = useLocale();
  const [index, setIndex] = useState(0);
  const list = autotune ? lines[locale][mode] : lines[locale][mode].filter((line) => line !== TUNING_LINE[locale]);

  useEffect(() => {
    // Stay on the last lines instead of starting over, so a long wait still reads as progress.
    const timer = window.setInterval(() => setIndex((current) => current + 1 < list.length ? current + 1 : list.length - 3), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [list.length]);

  // Decorative: the heading and progress bar already announce the status to screen readers.
  return <span key={index} className="waiting-line" aria-hidden="true">{list[index]}</span>;
}
