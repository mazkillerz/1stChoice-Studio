# w3-simplify (Simplify pass over the mega round)
Card draft (type: fix): "Shorter menus. The design menu on Saved keeps the team actions behind one Team row, Settings groups You and the app, and an imported Claude Design board now reads inline SVG art." 
New shipped files: none. run.mjs rows: none.
Skill notes for the lead (SKILL.md is yours): `Studio.lazy(name,{css,global})` / `Studio.loadScript(src)` are the one way to load `assets/<name>.js` (+ `.css`, link id `lz-<name>`) once; `whoLib()` = StudioWho loaded; design menu: team rows behind `data-act="team"` (list `#dsTeam`, Back = `teamback`; campaigns.designRow appends to `#dsTeam`); create-import: inline `<svg>` -> `<img>` blob in `prepare()` (remove "not read yet" from the Create additions note).
Lessons: calendar flake was an app race (author read from StudioWho before who.js had loaded; fixed by falling back to the stored name) plus a test that waited for any card, not the new one.
Wording: none new.
