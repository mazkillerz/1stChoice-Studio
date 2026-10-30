Winter cat reel (حتى في البرد...) – audio pack. Reel = 10.0 s, 30 fps, 1080x1920.

sfx/                       every sound used, 48 kHz WAV, untouched (levels are set by the cue sheet)
sfx/music_bed_lyria.wav    music bed already trimmed (starts at 20.38 s of the Lyria track so the beat drop lands at 1.0 s, the hood slap)
cue_sheet.csv              when each sound plays (time_s = file start), how loud, and which ones duck the music
mix/                       finished mixes + the script that made them

Mix rules (mix/mix_script.py):
- Each SFX is gain-matched so its loudest 50 ms hits level_dbfs_peak50ms (hero -11..-15, mid -17..-19, light -21..-23, bed -30). ss_s = start offset inside the file, dur_s/fade_s = trim + fade out.
- Music bed at -21 LUFS, cut to silence 4.10-4.93 s (deadpan gag), ducked -5 dB for ~0.3 s around every duck_music=yes hit, faded out over the last 1.4 s.
- Master: MUSIC version -14 LUFS integrated, SFX-only -16 LUFS, ceiling -1.5 dBFS.

Licences: SFX from Mixkit (Mixkit Sound Effects Free License: free for commercial use, no attribution).
Music generated with Google Lyria (lyria-3-pro-preview) on the owner's own API key.
