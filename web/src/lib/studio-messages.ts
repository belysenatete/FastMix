import type { Locale } from "@/lib/locale";

// French for the error messages the Next.js API routes send (src/app/api, src/lib/worker-proxy.ts).
// The API keeps answering in English; the studio translates the ones it shows. Keep in sync with those routes.
const french: Record<string, string> = {
  "Sign in to manage tracks.": "Connectez-vous pour gérer vos pistes.",
  "The private audio service is not configured.": "Le service audio privé n'est pas configuré.",
  "Request too large.": "Requête trop volumineuse.",
  "Private audio storage is unavailable. Start the local API and storage services, then retry.": "Le stockage audio privé est indisponible. Démarrez l'API locale et les services de stockage, puis réessayez.",
  "Sign in to delete your account.": "Connectez-vous pour supprimer votre compte.",
  "Your sessions and audio were deleted, but the sign-in account could not be removed. Please retry.": "Vos sessions et votre audio ont été supprimés, mais le compte de connexion n'a pas pu l'être. Veuillez réessayer.",
  "Project storage is not configured.": "Le stockage des projets n'est pas configuré.",
  "Sign in to use your projects.": "Connectez-vous pour utiliser vos projets.",
  "Sign in to save projects.": "Connectez-vous pour enregistrer vos projets.",
  "A project title is required.": "Un titre de projet est requis.",
  "Sign in to update projects.": "Connectez-vous pour modifier vos projets.",
  "Project not found.": "Projet introuvable.",
  "Sign in to delete projects.": "Connectez-vous pour supprimer vos projets.",
  "Wait for the session job to finish before deleting this project.": "Attendez la fin du traitement avant de supprimer ce projet.",
  // From the Python worker (worker/app: jobs.py, plans.py, uploads.py, account.py). Keep in sync with those messages.
  "FastMix couldn't find a change in that note. Try things like \"vocal louder\", \"more reverb\", \"less autotune\", \"harder autotune in A minor\", \"louder\", \"more dynamic\" or a style such as \"make it drill\".": "FastMix n'a trouvé aucun changement dans cette note. Essayez par exemple « voix plus forte », « plus de réverbe », « moins d'autotune », « plus de punch », « plus dynamique » ou un style comme « drill ».",
  "The preview processor is unavailable. Please retry shortly.": "Le traitement des aperçus est indisponible. Réessayez dans un instant.",
  "Add a mix direction before processing": "Décrivez le son voulu avant de lancer le traitement.",
  "A session job is already in progress": "Un traitement est déjà en cours pour cette session.",
  "Add at least one audio track before processing": "Ajoutez au moins une piste audio avant de lancer le traitement.",
  "A mastering preview needs exactly one finished track": "Un aperçu de mastering demande exactement un morceau fini.",
  "Describe what should change in the next version": "Décrivez ce qui doit changer dans la prochaine version.",
  "Processing job not found": "Traitement introuvable.",
  "Only a finished version can be refined": "Seule une version terminée peut être affinée.",
  "Only a completed AI preview can be rendered as a full track": "Seul un aperçu IA terminé peut être généré en titre complet.",
  "Only a failed job can be retried": "Seul un traitement échoué peut être relancé.",
  "WAV downloads come with the Artist plan. Download the MP3 instead.": "Le téléchargement en WAV est inclus dans le forfait Artist. Téléchargez plutôt le MP3.",
  "This track is only available as MP3": "Ce titre n'est disponible qu'en MP3.",
  "No completed output is available": "Aucun résultat terminé n'est disponible.",
  "The MP3 is still being prepared. Try again in a minute.": "Le MP3 est encore en préparation. Réessayez dans une minute.",
  "Full-length tracks come with a paid plan. Previews stay free.": "Les titres complets sont inclus dans les forfaits payants. Les aperçus restent gratuits.",
  "Project not found": "Projet introuvable.",
  "Wait for the session job to finish before deleting this project": "Attendez la fin du traitement avant de supprimer ce projet.",
  "Project audio could not be fully removed. Please retry.": "L'audio du projet n'a pas pu être entièrement supprimé. Veuillez réessayer.",
  "Unknown track category": "Type de piste inconnu.",
  "Supported files: WAV, MP3, FLAC, AIFF, M4A, and OGG": "Formats acceptés : WAV, MP3, FLAC, AIFF, M4A et OGG.",
  "A session can contain at most 500 MB of audio": "Une session peut contenir au maximum 500 Mo d'audio.",
  "Wait for processing to finish before changing tracks": "Attendez la fin du traitement avant de modifier les pistes.",
  "The audio file is empty": "Le fichier audio est vide.",
  "Audio files must be 100 MB or smaller": "Les fichiers audio doivent faire 100 Mo au maximum.",
  "This track was already added": "Cette piste a déjà été ajoutée.",
  "The upload did not reach storage. Please retry.": "Le fichier n'est pas arrivé jusqu'au stockage. Veuillez réessayer.",
  "The file content does not match a supported audio format": "Le contenu du fichier ne correspond à aucun format audio accepté.",
  "Track not found": "Piste introuvable.",
  "Stored audio could not be removed. Please retry.": "L'audio enregistré n'a pas pu être supprimé. Veuillez réessayer.",
  "A mix is still processing. Wait for it to finish, then delete your account.": "Un mix est encore en cours. Attendez qu'il se termine, puis supprimez votre compte.",
  "Some of your audio could not be removed. Your account is still open; please retry.": "Une partie de votre audio n'a pas pu être supprimée. Votre compte est toujours ouvert ; veuillez réessayer.",
};

// Worker messages with numbers in them.
const frenchPatterns: [RegExp, (...groups: string[]) => string][] = [
  [/^You've made (\d+) previews in the last 24 hours, the fair-use limit\. Try again a little later\.$/, (n) => `Vous avez créé ${n} aperçus en 24 heures, la limite d'usage raisonnable. Réessayez un peu plus tard.`],
  [/^You've used all (\d+) full-length tracks on your (.+) plan this month\. They reset on the 1st\.$/, (n, plan) => `Vous avez utilisé les ${n} titres complets de votre forfait ${plan === "Starter" ? "Découverte" : plan} ce mois-ci. Ils se renouvellent le 1er du mois.`],
  [/^A session can contain at most (\d+) tracks$/, (n) => `Une session peut contenir au maximum ${n} pistes.`],
];

/** A server message in the page language: known API messages are translated, anything else is shown as sent. */
export function serverMessage(message: string, locale: Locale) {
  if (locale !== "fr") return message;
  if (french[message]) return french[message];
  for (const [pattern, translate] of frenchPatterns) {
    const match = pattern.exec(message);
    if (match) return translate(...match.slice(1));
  }
  return message;
}
