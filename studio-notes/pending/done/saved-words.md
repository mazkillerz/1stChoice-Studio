# saved-words (Studio 2.16.0)

## What's New card draft
- Title: Search finds the words inside a design
- type: feature
- Search in Saved (and the search on the home page) now also looks at the words written on a design, so typing "متوفر" or "Passion" finds the restock stories that say it, not only designs named so. Designs get their words the next time they are saved; older designs still match by name, tool, collection and author.

## New shipped files for sw.js shell
None (assets/cloud.js, assets/studio.js changed; tests/saved-words.mjs is test-only).

## run.mjs
MAP row added: `assets/cloud.js | tests/fakecloud.js | assets/studio.js | assets/search.js` -> `saved-words`.

## README lines
- Saved search: matches name, tool, collection, author and the words on the design (stored as `recipe.words`, max 400 characters, added on the next team save; no schema change).

## Notes / lessons
- `recipeWords()` in cloud.js `saveDesign` is the one place: it collects strings under `text`/`value` keys of the recipe (tool values, text extras, Create/Konva text nodes, Video texts), skips toggled-off fields. All tools get it with no per-tool code.
- `designs()` selects `words:recipe->>words`; if that select errors it retries without it, then the old missing-column fallback. Old designs without words are NOT back-filled: selecting `recipe->values` per row was skipped (recipes can be large; they would be sent for every design on every Saved open).
- tests/fakecloud.js has its own copy of recipeWords (test double).
- Wording needing approval: none.
