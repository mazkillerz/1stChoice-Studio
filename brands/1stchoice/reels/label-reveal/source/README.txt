New label reveal reel (طبعناها وحدة وحدة...) - source pack. Reel = 16.6 s, 30 fps, 1080x1920.

label_reveal.html   the original reel: DOM + SVG, every frame is window.seek(t). Its pictures and fonts are in the template's img/ and fonts/
                    (PNG and the logo SVG became lossless WebP, JPEG stayed JPEG). tests/reel-label-reveal.mjs compares scene.js with it.
render.py           the original frame renderer (Playwright) and video assembler
mix.py              the owner's sound mix script (every SFX placed by its peak, music bed, ducking, master)
cue_sheet.csv       when each sound plays (start_s = file start, peak_s = its loudest moment), level and what it is for

What is different in the template's snd/ folder (so the browser mix matches mix.py):
- every SFX is mono 48 kHz FLAC with mix.py's filters already applied: 90 Hz high-pass (low-pass 160 Hz for low_thump.flac) and the
  short room (the 0.6 s noise reverb at -20 dB) baked in; reel.json "level" is the dBFS the engine needs so each cue ends up as
  loud as mix.py made it (the peak levels of the cue sheet, converted to the engine's loudest-50-ms-RMS measure)
- music_bed.flac = Nightfall (future bass) from 11.18 s for 16.6 s (the drop lands on the reveal at 8.04 s), mono, with the gain
  shaping of mix.py baked in (-35 dB RMS before the drop, -29 dB after, smoothstep 7.4 to 8.04 s). Ducking and the fade-out are the engine's.
- master: lufs -26.49 (music version), lufsNoMusic -27.14 (SFX-only), ceiling -9.5 dBFS, measured on out/music_mix.wav and out/sfx_only.wav

Licences: SFX from the Kenyset free SFX pack and Mixkit (free licences). Music: Nightfall (future bass), Pixabay licence.
