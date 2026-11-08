# w2-phrases (plan 2.4, preview flag team)
## What's New card draft
Title: Phrasebook (preview)
Note: Suggest a line, and the owner approves, edits or rejects it. Approved lines join the word pickers in every tool and in Create, even offline.
## sw.js shell: new files
assets/phrasebook.js, assets/phrasebook.css
## run.mjs MAP rows
assets/phrasebook.js, assets/phrasebook.css, tests/phrasebook.mjs -> phrasebook ; tools/create-lib.js -> create ; brand.js phraseCats -> brandkit
## README lines
- Phrasebook (Settings, with the Team preview on): approved lines by category, suggest a line, owner approves / edits / rejects; approved lines join the word pickers and Create's Add > Elements; Studio.phrasesApproved() lists every approved line (built-in + team).
## Mapping (documented in brands/1stchoice/brand.js `phraseCats`)
headline -> headlines + cut; small -> small; button -> buttons; poll -> poll; other -> other; caption -> none (captions + rules check only). Restock/new-place lists keep their own keys (not joined).
## Notes
- Engine: `phMerge/phCache/phRefresh/phrasesApproved` block in studio.js before useBrand; cache `studio:phrases:<brand>`; background refresh only with the team flag on or an existing cache (no new request otherwise). Event `studio:phrases` fires after a refresh.
- `Studio.phrasesApproved()` -> strings; `Studio.phrasesApproved(true)` -> {line,category,builtIn}.
- Create: each approved row is an Element (button -> pill, headline -> display text, small, other).
- No new Arabic. Category labels English.
