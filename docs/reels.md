# Reel templates (Video editor)

The Video editor (`tools/video.html`) opens **coded reels**: motion graphics drawn in code (canvas 2D, or three.js drawn into
the canvas), with editable words and a sound mix. Nothing is recorded live: every frame is drawn from the time `t`, so the
editor can scrub, preview and export frame by frame without stutter.

A reel template is one folder in a brand kit: `brands/<brand>/reels/<id>/`.

```
reel.json      what the editor needs: size, timing, scenes, text slots, music and sound cues
scene.js       the drawing code: StudioReel.scene({...})
img/           pictures the scene draws (lossless WebP / JPEG)
snd/           music bed and sound effects (lossless FLAC, 48 kHz)
fonts/         fonts the words use (woff/woff2)
source/        the original reel files it was made from (kept for reference, never loaded)
```

The engine (`assets/reel.js`, `assets/reel-audio.js`, `assets/reel-export.js`) is brand-agnostic: brand names, words,
colours and sounds live only in the template folder.

## reel.json (format 1)

| Field | Meaning |
| --- | --- |
| `format` | Always `1` for now. |
| `id`, `title`, `sub` | Folder name, name shown to people, one line under it. |
| `size` | `[1080, 1920]` (a 9:16 reel). |
| `fps`, `duration` | Frames per second and length in seconds. |
| `cuts` | Times of hard cuts: export never blends motion across them. |
| `poster` | Time of the frame used as the picture in Saved. |
| `heavy` | `true` for heavy (e.g. three.js) reels: the editor warns that exporting takes longer. |
| `background` | Colour behind everything. |
| `scene` | The drawing file (`scene.js`). |
| `fonts` | `[{family, src, weight?}]`: loaded with `FontFace` before the first frame. Use names unique to the reel (`Reel Lalezar`). |
| `images` | `{name: path}`: loaded before the first frame, handed to the scene as `R.img[name]`. |
| `scenes` | `[{id, label, start, end}]`: the beats, shown as segments on the timeline. |
| `texts` | Editable words, see below. |
| `music` | The music bed, see below (optional). |
| `sounds` | Sound effects, see below. |
| `master` | `{lufs, lufsNoMusic, ceiling}`: export loudness with music, with the music muted, and the peak ceiling (dBFS). |
| `credits` | Licences for the sounds and music. |

### Text slots

```json
{ "id": "headline", "label": "Headline", "value": "…default words…",
  "font": "178px \"Reel Lalezar\", \"Reel Cairo\", sans-serif", "size": 178,
  "maxWidth": 1000, "warnBelow": 0.85, "minFit": 0.45, "show": 9.0, "in": 7.63, "box": [x, y, w, h] }
```

- One line. Arabic or English: the direction comes from the first strong letter (`R.text[id].dir`).
- `maxWidth`: the room the line has. The engine measures the line in `font`; if it is wider, the scene draws it smaller
  (`R.text[id].fit`, 1 = full size, never below `minFit`). Below `warnBelow` the editor shows "too long for its spot".
- `show`: a time where the words are fully on screen (the editor jumps there while you type). `in`: when they start to appear.
- `box`: where the words sit (used for the selection outline in the preview).

### Music

```json
{ "id": "music", "label": "Music", "file": "snd/music_bed.flac", "lufs": -21,
  "cuts": [{ "from": 4.10, "to": 4.93, "ramp": 0.04 }], "fadeOut": 1.4,
  "duck": { "db": -5, "half": 0.28, "lead": 0.05 } }
```

- The file starts at the reel's 0 s (trim it beforehand). It is levelled to `lufs` (integrated loudness) before mixing.
- `cuts`: the music is silent between `from` and `to`, with `ramp`-second fades on both sides.
- `fadeOut`: linear fade to silence over the last seconds.
- `duck`: automatic ducking. Around every audible hit of a sound with `"duck": true`, the music dips by `db`, as a triangle
  centred `lead` s after the hit's loudest sample and `half` s wide on each side. Overlapping dips take the deepest.

### Sounds

```json
{ "id": "hood", "label": "Hood slap", "file": "snd/hood_slap.flac", "level": -13, "duck": true,
  "ss": 0, "dur": null, "fade": 0, "hits": [{ "at": 0.90 }, { "at": 1.20, "level": -15 }] }
```

- One row in the mixer per sound; `hits` are the times the file starts (seconds; a hit can override `level`).
- `level`: the loudest 50 ms (RMS, both channels averaged) of the clip is set to this many dBFS. This matches the
  owner's mix script, so a template mixes the same as the original reel.
- `ss` / `dur` / `fade`: start offset in the file, length, and a linear fade-out (seconds) at the end of the clip.
- `duck`: this sound ducks the music (big hits only).

People change, per sound: volume (dB on top of `level`) and mute. Per reel: ducking on/off. "Reset to original mix" goes
back to the values in `reel.json`.

## scene.js

```js
StudioReel.scene({
  id: 'winter-cat',
  setup(R) { /* optional: build paths etc. once; return nothing */ },
  draw(ctx, t, R) { /* draw the frame at time t */ }
});
```

- `ctx` is already scaled so 1 unit = 1 px of the 1080×1920 reel, and cleared to `background`.
- `draw` must depend only on `t` and `R` (no timers, no `Date.now()`, no random numbers that are not seeded).
- `R` gives: `R.W`, `R.H`; `R.img[name]`; `R.text[id] = {value, dir, fit, font}`; `R.px` (device pixels per unit);
  `R.layer(name)` → an offscreen 2D context the size of the target, same scale, cleared; `R.wobble(srcCtx, dstCtx, {seed, freq, amount})`
  draws `srcCtx`'s canvas onto `dstCtx` with a hand-drawn "boiling line" wobble (a smooth noise displacement; the same
  look as an SVG `feTurbulence` + `feDisplacementMap`), deterministic for a given seed.
- A three.js reel renders into its own WebGL canvas inside `draw` and then `ctx.drawImage`s it.

## Saved designs

A saved reel is a normal Saved design (`tool: 'video'`) whose recipe holds settings only, never video files:

```json
{ "v": 1, "kind": "reel", "brand": "1stchoice", "reel": "winter-cat",
  "texts": { "headline": "…" }, "mix": { "hood": { "db": -3, "mute": false }, "music": { "db": 0, "mute": false } }, "duck": true }
```

Missing keys mean "as in reel.json", so a template can gain sounds or slots later without breaking saved edits.

## Adding a new coded reel

1. Write the reel so every frame is a pure function of `t` (the `window.seek(t)` rule of the reel renderer).
2. Make the folder above; draw it in `scene.js` on canvas (port DOM/SVG motion to canvas transforms).
3. Write `reel.json` from the cue sheet (`time_s` → `hits[].at`, `level_dbfs_peak50ms` → `level`, `duck_music` → `duck`).
4. Add it to the brand kit's `reels` list (`brands/<brand>/brand.js`).
5. Check it against the original: `node tests/reel-scene.mjs <id>` compares frames, `node tests/reel-audio.mjs` compares the mix.
