# suite-split (backlog #60, Simplify 2.10.0/2.15.0): no app code changed

Tests only. Seconds measured alone, JOBS=1, 4-core sandbox shared with other builders (so +-20 % noise).

| Suite | Whole before | PART files (seconds each) | Longest part |
| --- | --- | --- | --- |
| full | 175 | full-phone-a 51, full-phone-b 56, full-desktop 66 | 66 |
| saved-versions | 193 | saved-versions-light 72, -dark 54, -desktop 71 | 72 |
| video-timeline | 170 | video-timeline-light 112, -dark 121, -misc 10 | 121 |
| video | 157 | video-light 63, -dark 65, -misc 7 | 65 |
| backgrounds | 224 | backgrounds-a 34, -b 15, -c 97, -d 65 | 97 |
| create-resize | 158 | create-resize-a 71 (templates 1-3), -b 76 (templates 4-6, dark phone, desktop) | 76 |
| calendar | 43 | not split | 43 |

Whole files run again after the split: full 173, saved-versions 182, video-timeline 145, video 133, backgrounds 207, create-resize 146 (all green).

How: each whole file reads `PART` (comma list) like home7; a PART file sets `process.env.PART` and imports the whole file. The parts printed
exactly the same PASS/FAIL names as the whole file (sorted diff, parenthesised numbers aside) except `no page errors` (saved-versions x2,
backgrounds x3, create-resize x1 extra): that end-of-file check runs in every part.

## tests/run.mjs
- `TWINS` now also holds the six whole files, so `--all` runs parts only (`--dry --all` lists every check once).
- New `SPLIT` map + `expand()` inside `add()`: `--changed` / `--quick` / MAP / TOOL_SUITES / HUB_SUITES rows that name `full`, `saved-versions`,
  `video-timeline`, `video`, `backgrounds`, `create-resize` pick their parts instead. Naming the whole suite on the command line still runs the whole file.
- `SLOW` has the new part names (the old whole-file entries are gone).

## For the skill's test map (replace the names)
- full -> full-phone-a, full-phone-b, full-desktop
- saved-versions -> saved-versions-light, -dark, -desktop
- video-timeline -> video-timeline-light, -dark, -misc
- video -> video-light, -dark, -misc
- backgrounds -> backgrounds-a, -b, -c, -d
- create-resize -> create-resize-a, -b

Longest pole of the sweep is now video-polish (~130 s), video-timeline-dark (~120), collage-grids-compat (~120): next candidates to split.
