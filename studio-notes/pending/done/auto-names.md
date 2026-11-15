# 2.13.0 team: automatic names never ask
### Several stories in a row, no "already in Saved" question
type: fix
When you save a second or third story to the team on the same day and keep the automatic name (like “Restock – 15 Nov”), Studio no longer stops to ask whether to update the first one. Each new story quietly gets the next number: “Restock – 15 Nov · 2”, “· 3”. A name you typed yourself still asks, so nothing is overwritten by mistake.
Taps: shops in a row to the team, from the 2nd story on: 4 → 3 (no question).
Suite: same-name (3 new checks). Engine: sameNameCheck(...,auto) in studio.js; tools pass `!design && name===defaultName()`, Create passes "no name typed".
