# NOTES — audio (Agent G)

Owner: Agent G. Module: `src/audio/` — everything is synthesised with WebAudio at runtime; there are no audio files.

Status: IN PROGRESS — updated as pieces land.

## Files

```
src/audio/index.ts     audio: AudioSystem (init on first gesture, scene auto-selection, bus subscriptions, volumes)
src/audio/synth.ts     WebAudio toolkit: note(), noise(), bell(), tine(), Karplus-Strong pluck(), percussion, buffers
src/audio/sfx.ts       named sound recipes + spatialisation + loop builders
src/audio/music.ts     procedural composer + sequencer (scenes, seasonal variants, villager motifs, stings)
src/audio/ambience.ts  layered ambience beds (birds, crickets, rain, wind, snow, stream, fire, crowd)
src/audio/preview.ts   dev page logic for public/audio-preview.html
public/audio-preview.html   buttons for every sound, scene and ambience + level meter
e2e/audio-check.cjs    Playwright check: page runs, AudioContext running after a click, non-zero RMS
```

## Run / test

```
npm run check                       # tsc
npm run dev                         # then open http://localhost:5190/pebblebrook/audio-preview.html
node e2e/audio-check.cjs            # headless Chromium: errors, context state, RMS per scene/sfx/ambience
```

(Sections below are filled in as the work lands.)
