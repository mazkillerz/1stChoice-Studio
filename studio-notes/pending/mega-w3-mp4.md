# w3-mp4: moving stories (plan 3.4), behind the `motion` flag

**What's New card draft:** "Moving stories (preview)". Turn a Create story into a 5 to 8 second video: each thing pops, slides, fades, wipes or peeks in, in an order Auto picks for you. Optional soft sound. Switch it on in Settings > Previews.

**New shipped files for the sw.js shell:** `tools/create-motion.js`, `tools/create-motion.css` (lazy, only with the flag). Already shipped and reused: `assets/reel-export.js`, `assets/reel-audio.js`, `assets/vendor/mp4-muxer.js`.

**run.mjs MAP rows:** `tools/create-motion\.(js|css)|assets/reel-export|assets/reel-audio` -> `create-motion`; also add `create-motion` to the `tools/create` row.

**README lines:** Create > design menu > "Moving story…" (Previews > Moving stories): entrance per layer (Pop, Slide up/down/left/right, Fade, Crayon wipe, Peek in), Auto, Play preview, length 5 to 8 s, optional sound, Save video (1080x1920, 30 fps, H.264 MP4). Without H.264 video in the browser it says so and offers the still PNG.

**Engine changes:** `FLAGS` +1 line (`motion`); `tools/create-core.js` exports `BD.sharpen`; `tools/create.js` marked block (menu entry, loader, `CRUI.openMotion`); `brands/1stchoice/brand.js` `motion.sounds` (3 approved reel sounds: soft pop, whoosh, swish).

**Data:** layer attr `enter:{type,delay,dur,dir}`, page attr `motion:{len,sound}`; saved with the design JSON automatically.

**Lessons:** a Konva Shape's clip for a reveal wipe is done by wrapping `attrs.sceneFunc` (Group: `clipFunc`) and deleting it again; Linux Chromium decodes H.264 in a `<video>` here and exports Opus-in-MP4 (no AAC); sparse hit sounds cannot reach mean -28 dB under a -9 dB peak ceiling without a soft limiter, so levelTo() searches the gain through the limiter.

**Arabic wording needing approval:** none (sound names and UI are English).
