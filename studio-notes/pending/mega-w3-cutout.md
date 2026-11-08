# Wave 3 · w3-cutout: Remove background on the phone (plan 3.5), behind the `cutout` preview flag

Branch `claude/w3-cutout` (from `claude/mega-integration`). Flag line added to `FLAGS`: `{id:'cutout',label:'Remove background',sub:'Cut out a can or a person from a photo, on this device'}`. Flag off = Studio looks and behaves as before (no button, no request).

## Model choice (measured here)
| Model | Licence | Size | Verdict |
| --- | --- | --- | --- |
| **U²-Net small (u2netp)** + ONNX Runtime Web 1.14 (WASM, SIMD, 1 thread) | Apache-2.0 + MIT, redistributable | model 4.6 MB + runtime 10.0 MB + 0.17 MB JS = **14.7 MB** | **chosen** |
| RMBG-1.4 / RMBG-2.0 | non-commercial | 44 MB+ | rejected (licence, and too big) |
| MediaPipe selfie segmenter | Apache-2.0 | 0.25 MB model + ~10 MB runtime | people only: cannot cut out a can, so not enough on its own |
| MODNet | Apache-2.0 | ~7 MB quantised | portraits only; not downloadable here (huggingface.co is blocked in the sandbox), not measured |
| IS-Net general, BiRefNet-lite | Apache-2.0 / MIT | 170 MB / 200 MB+ | far over the size budget |
Speed and quality of u2netp, on the repo's HD can PNGs (classic, passion, pair) composited at 1080×1080 onto six sample photos (beans, shelf, window, vase, foam, stickers) with the known alpha as ground truth: **mean IoU 0.992, worst 0.972** (18 images; every other one 0.99+). In the browser (headless Chromium here, WASM single thread, worker): 1080 px photo end to end **about 2.1 to 2.5 s the first time** (includes loading the 14.7 MB from the local server and building the session), model run alone about 0.4 s natively on one CPU thread. A mid-range Android phone is about 2 to 4 times slower than this box: expect roughly 1 to 3 s per photo after the first, well under the 8 s line, so **it is not desktop-only**. NOT measured on a real phone; please try it on the owner's Android with the flag on and tell me the seconds.
People: no person photo with a known mask in the repo. On the hand/arm samples the hands and arms are caught with clean edges; loose sleeves fade out softly and a cropped close-up of a fruit keeps ghost remains of the writing behind it. Fine for a first version, not studio-grade hair/fabric edges. A person-specific model (MODNet) could be added later if the owner wants better portraits.
Size is over the "about 10 MB" target (the WASM runtime alone is 10 MB; any ONNX/MediaPipe runtime is about that). It is lazy: nothing is requested until the tap, the UI says "First time only: this downloads about 15 MB" and then it is cached.

## What shipped
- `assets/cutout.js` (module, lazy-loaded on the first tap; `StudioCutout.supported()/run()/firstNote()`), `assets/cutout-worker.js` (Web Worker: ONNX Runtime + model, 320 px inference, mask smooth-up-scaled to the full photo size with a short curve = about 1 to 2 px feather, composited with the full-resolution photo; the main thread keeps drawing).
- Vendored under `assets/vendor/cutout/`: `ort.wasm.min.js`, `ort-wasm-simd.wasm`, `u2netp.onnx`, `onnxruntime-LICENSE` (MIT), `u2net-LICENSE` (Apache-2.0). ONNX Runtime has no non-SIMD fallback vendored: an old browser without WASM SIMD, Worker, OffscreenCanvas shows "This browser cannot do it yet." instead.
- Tools (`assets/studio.js`, marked `cutout (mega)`): "Remove background" button + one-line progress note in the Photo sheet under the photo boxes (only with the flag on). The chosen photo is replaced by the cut-out (transparent PNG, thumb too) so the design's ground shows; Undo/Redo are the normal ones. `photoBlob` writes a cut-out as PNG (not JPEG) so drafts and team saves keep the see-through ground.
- Create (`tools/create.js`, marked block at the end of the IIFE): a "Cut out" button on a selected photo layer (flag on). Adds a new image layer right above the photo, same place/size/turn/crop; the original photo is hidden, not deleted; one Undo step brings it back.
- Save quality unchanged (2160×3840 lossless PNG; the cut-out is full photo resolution).
- `tests/cutout.mjs` (+ fixtures `tests/fixtures/cutout-can.jpg`, `cutout-can-alpha.png`): 50 checks across phone light, phone dark, desktop.

## What's New card (draft)
```
### Remove background (preview)
Cut a can or a person out of a photo, right on your phone: nothing is uploaded and it costs nothing. Switch it on in Settings, Previews, then tap Remove background in the Photo sheet, or Cut out on a photo in Create. The first time it downloads about 15 MB.
```

## sw.js shell
Add: `assets/cutout.js`, `assets/cutout-worker.js`. The 14.7 MB under `assets/vendor/cutout/` should NOT go into the install-time shell (it would make every install download it). Suggest in `sw.js`: serve `assets/vendor/cutout/` cache-first (like the reel sounds line) so it is kept once fetched. Bump the cache version.

## run.mjs MAP rows
- `assets/cutout.js`, `assets/cutout-worker.js`, `assets/vendor/cutout/*`, `tools/create.js` (cutout block) -> `cutout`; `assets/studio.js` already maps to the tool suites, add `cutout` there too (about 4 to 8 minutes under load: `SLOW['cutout']=480`).
- Skill test map: "Remove background (cutout)" -> `cutout`, plus `create`, `create-render`, `smoke`, `full`.

## README lines
- Photo sheet / Create: "Remove background (preview): cuts a can or a person out of a photo on your phone, no upload; turn it on in Settings → Previews. First time it downloads about 15 MB."

## Lessons
- `tools/create.js` is one big IIFE: code appended after the final `})();` runs outside it and `toast`, `BD` helpers like `cx` are not in scope (first version failed with "toast is not defined").
- Create's `BD.act.duplicate()` returns nothing; to clone a layer use `BD.rebuild(BD.toObj(n),true)` and add it to the parent.
- After Undo, Create rebuilds its nodes: a Konva `_id` captured before an undo no longer exists, check by labels/counts.
- huggingface.co and data.jsdelivr.net are blocked in the sandbox; github.com release files, registry.npmjs.org and storage.googleapis.com work.

## Arabic wording for the owner
None (the button and notes are English engine words, like Flip/Crop).
