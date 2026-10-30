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
  (`R.text[id].fit`, 1 = full size), so it never runs off the frame. Below `warnBelow` the editor shows "too long for its spot". (`minFit` is kept for older templates and not used.)
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

You need the finished reel (every frame a pure function of the time `t`, the `window.seek(t)` rule of the old reel renderer),
its sounds and its cue sheet. Work in a folder `brands/<brand>/reels/<id>/` (the id is lowercase with dashes, e.g. `winter-cat`).

1. **Folder.** Make `reel.json`, `scene.js`, `img/`, `snd/`, `fonts/` and `source/` as in the layout above. Copy the original
   files (the HTML reel, the render script, the cue sheet, the owner's mix script) into `source/` for reference. Nothing in
   `source/` is ever loaded.
2. **Pictures: PNG to lossless WebP** (JPEG stays JPEG). Keep the pixels exactly; only the file gets smaller:
   `ffmpeg -i x.png -c:v libwebp -lossless 1 -compression_level 6 x.webp`
3. **Sounds: WAV to FLAC at 48 kHz** (lossless; the mix is made in the browser at 48 kHz). Trim with `-ss` (start) and `-t` (length)
   when a file needs it, for example the music bed that must start at the reel's 0 s:
   `ffmpeg -i x.wav -c:a flac -compression_level 8 x.flac`   (the winter-cat sources were already 48 kHz; for another rate add `-ar 48000`)
   `ffmpeg -ss 20.38 -t 10 -i music.wav -c:a flac -compression_level 8 music_bed.flac`
   Only trim the file when the reel's cue sheet did (its `ss_s` / `dur_s` / `fade_s` columns go into reel.json instead, not into the file).
4. **Fonts:** copy the woff/woff2 the words use into `fonts/`. Name the families uniquely (`Reel Lalezar`) so they never clash with
   the editor's own fonts.
5. **Port the drawing to canvas** in `scene.js` (`StudioReel.scene({id, setup, draw})`, described above). A DOM or SVG reel's
   `seek(t)` becomes `draw(ctx, t, R)`: each element's CSS transform becomes `ctx.save(); ctx.translate/rotate/scale; ctx.drawImage(...); ctx.restore()`,
   its easing curves stay the same functions of `t`, an SVG filter that wobbles lines becomes `R.wobble`, a blur or shadow becomes
   `ctx.filter` or a `R.layer` that is blurred and drawn back. No timers, no `Date.now()`, no unseeded random numbers.
   Take the words from `R.text[id]` (`value`, `dir`, `fit`, `font`) and never hard-code them, so people can change them.
6. **Write `reel.json` from the cue sheet.** `time_s` becomes `hits[].at`, `level_dbfs_peak50ms` becomes `level`, `duck_music: yes`
   becomes `"duck": true`, `ss_s`/`dur_s`/`fade_s` become `ss`/`dur`/`fade`. Hard cuts go in `cuts`, the beats in `scenes`, the
   editable words in `texts` (one slot per line, with a `show` time where the words are fully visible), the music bed in `music`
   (its cut-outs, fade and ducking from the owner's mix script) and the master loudness in `master`. Set `poster` to the time of
   the best single frame (it is the picture in Saved and in the Templates card). Set **`"heavy": true`** for a three.js (WebGL) reel,
   so the editor warns that exporting takes longer.
7. **Add it to the brand kit:** in `brands/<brand>/brand.js`, `reels:[{id:'winter-cat'},{id:'<id>'}]`. The first one opens when the
   Video editor starts fresh. The title, line and length in Templates come from `reel.json` (`title`, `sub`, `duration`).
8. **Templates picture:** `node tests/reelthumbs.mjs <id>` draws the reel at its `poster` time with the engine itself and writes
   `assets/thumbs/<brand>/tpl/reel-<id>.jpg` (320×569, under 45 KB). Look at it before you commit it.
9. **Checks** (server on :8080, `npx http-server -p 8080 -c-1 .`):
   - Picture: copy `tests/reel-scene.mjs` to compare the canvas port with the original reel (`source/<reel>.html`, run with `seek(t)`)
     at about 17 times across the reel: strict (filters and wobble off in both) mean difference under 4 of 255, loose (wobble on in
     both) under 8; the same frame twice, and out of order, must be identical; long words must still fit (`R.text[id].fit`).
   - Sound: copy `tests/reel-audio.mjs` to mix the reel in the browser and compare it with the owner's finished mixes (the music
     version and the SFX-only version, as WAV in `tests/fixtures/reels/`): loudness and peak, envelope correlation of at least 0.97,
     sample correlation of at least 0.9, silence where the music is cut, ducking, mute and gain.
   - Home: `node tests/reels-hub.mjs` (the Templates card, favourites, search) and `node tests/video.mjs` (the editor).
   Both comparisons use the **owner's** originals, so ask for the finished mix before you start the port.
10. **Wording:** the reel's default words are the owner's own; if you add new Arabic, list it for the owner to approve first.

## Projects (Video editor 2: your own clips, text and sound)

Since phase 2 a saved video is a **project**: a main track of clips played one after the other, text layers on top, and
audio tracks under it. A reel template is one kind of clip, so a project can be "my clip + the cat reel's end card".
Recipe (`tool: 'video'`, settings only; Supabase never gets video, photo or sound files):

```json
{ "v": 2, "kind": "video", "brand": "1stchoice", "size": [1080, 1920], "fps": 30,
  "clips": [
    { "id": "c1", "kind": "reel",  "reel": "winter-cat", "in": 0, "out": 10, "texts": {}, "mix": {}, "duck": true },
    { "id": "c2", "kind": "video", "media": "m1", "in": 1.2, "out": 4.0, "db": 0, "mute": false },
    { "id": "c3", "kind": "photo", "media": "m2", "dur": 3, "motion": "zoom" } ],
  "texts": [
    { "id": "t1", "value": "…", "start": 1.0, "end": 3.5, "x": 540, "y": 960, "size": 96, "font": "display",
      "color": "#161210", "box": null, "in": "pop", "out": "fade" } ],
  "audio": [
    { "id": "a1", "media": "m3", "start": 0, "in": 0, "out": 12.5, "db": -6, "mute": false, "fadeIn": 0.5, "fadeOut": 1.5 } ],
  "media": { "m1": { "name": "IMG_0042.MOV", "type": "video", "dur": 8.3, "w": 1080, "h": 1920 } } }
```

- **Clips** play in order; the video's length is the sum of the clips (`out - in`, or `dur` for a photo). A clip boundary is a
  hard cut. `in`/`out` are times inside the source (a reel clip's own seconds, a video file's seconds). Video and photo clips
  fill the 9:16 frame (cover, centred). `motion: "zoom"` slowly zooms a photo in (1.0 → 1.08 over the clip).
- **Text layers** sit on top of everything from `start` to `end` (project seconds). `x`,`y` = the centre in reel pixels,
  `size` = font size in reel pixels, `font` = `display` | `body` (the brand kit's fonts), `box` = a colour behind the words
  or `null`. Animations, 0.35 s each: in = `none` | `fade` | `pop` | `slide` | `type`, out = `none` | `fade` | `pop` | `slide`.
  One line or several (`\n`); Arabic or English, direction from the first strong letter.
- **Audio tracks** start at `start` (project seconds) and play the file from `in` to `out`; `db` volume, `mute`, linear
  `fadeIn`/`fadeOut` in seconds. A video clip's own sound plays with it (`db`, `mute`).
- **Mix**: reel clips keep their own mix (template rules: levels, ducking) for the part of the reel that is used; everything
  is summed and the whole video is levelled to the template's `master.lufs` (-14 LUFS, ceiling -1.5 dBFS; without any reel:
  -14 LUFS, -1.5 dBFS).
- **Media** files stay on the device that added them (IndexedDB key `studio:vmedia:<id>`). A project opened on another
  device shows a clear "missing on this device: add it again" placeholder for each missing file; nothing is lost.
- A `v: 1` recipe (phase 1) opens as a project with one reel clip.
