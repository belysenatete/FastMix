# Homepage demo audio

Files in `web/public/demo`, shown by the Listen section of the homepage.

## Mastering (`master-before.mp3`, `master-after.mp3`)

- Source: a 35-second demo song the owner made with an AI music generator on a paid plan (commercial use allowed).
- Before: the first 29 seconds of that file, unchanged (mono, -19.9 LUFS, peaks at 0 dBFS; it was not mastered).
- After: the same 29 seconds through FastMix's own mastering, the RoEx Tonn mastering preview (`master_demo.py`, prompt "loud and punchy", RoEx task ae3e2c6d-0c0e-4f8f-a722-7caa3da5d9de), including FastMix's -1 dBTP limiter. Result: -10.0 LUFS, -1.2 dBTP.
- Both: the After's 26 ms of RoEx padding trimmed so they line up, cut to 29 s, the same 10 ms fade-in and 1.5 s fade-out, 192 kbps stereo MP3. Not loudness-matched: the loudness gain is part of what mastering does.

## Mixing (`mix-before.mp3`, `mix-after.mp3`)

- Source: `D:/mixing.wav`, a 36-second demo song the owner made with an AI music generator on a paid plan (commercial use allowed; the song itself ends at 30 s).
- Separation: Demucs 4.0.1 `htdemucs_ft`, `--two-stems=vocals`, run locally in Docker (`python:3.11-slim` + CPU torch 2.1.2 + `demucs==4.0.1`).
- Before: the first 30 s of the separated vocal, turned up 2.97 dB so it peaks at -1 dBTP (about -17.5 LUFS). No other processing.
- After: that vocal and the separated instrumental through FastMix's own AI mix, the RoEx Tonn recombine preview (`mix_demo.py`, prompt "clean modern vocal, upfront and clear over the beat" → genre OTHER, loudness MEDIUM, vocal +2 dB, no reverb, no autotune; task rc_40ff57e0-317e-4dec-a7c7-19c998596126). About -11.7 LUFS, -1.2 dBTP.
- Both: the After's 26 ms of RoEx padding trimmed so they line up, 30 s, 10 ms fade-in and 1.5 s fade-out, 192 kbps stereo MP3. Not loudness-matched: the Before is as loud as it can go without limiting.
- To redo the separation: `docker build -f demucs.Dockerfile -t fastmix-demucs .`, then `docker run --rm -v "D:/:/in:ro" -v "<out>:/out" fastmix-demucs -n htdemucs_ft --two-stems=vocals -o /out/sep /in/mixing.wav`.

## Waveforms

`peaks.py` writes the bar heights in `web/src/components/demo-waveforms.ts`.
