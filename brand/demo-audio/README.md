# Homepage demo audio

Files in `web/public/demo`, shown by the Listen section of the homepage.

## Mastering (`master-before.mp3`, `master-after.mp3`)

- Source: a 35-second demo song the owner made with an AI music generator on a paid plan (commercial use allowed). It's labelled on the site as made with AI.
- Before: the first 29 seconds of that file, unchanged (mono, -19.9 LUFS, peaks at 0 dBFS; it was not mastered).
- After: the same 29 seconds through FastMix's own mastering, the RoEx Tonn mastering preview (`master_demo.py`, prompt "loud and punchy", RoEx task ae3e2c6d-0c0e-4f8f-a722-7caa3da5d9de), including FastMix's -1 dBTP limiter. Result: -10.0 LUFS, -1.2 dBTP.
- Both: the After's 26 ms of RoEx padding trimmed so they line up, cut to 29 s, the same 10 ms fade-in and 1.5 s fade-out, 192 kbps stereo MP3. Not loudness-matched: the loudness gain is part of what mastering does.

## Mixing (`mix-before.mp3`, `mix-after.mp3`)

Original synthesized tracks mixed by FastMix's local engine, loudness-matched. To be replaced by a real beat and vocal.

## Waveforms

`peaks.py` writes the bar heights in `web/src/components/demo-waveforms.ts`.
