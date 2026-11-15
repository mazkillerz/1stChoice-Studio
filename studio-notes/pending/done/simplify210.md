# 2.10.0 Simplify (lead)
Sheet heights at 390 before (scrollHeight of .sheet-body): Collage Style 1478, Carousel Style 1387, Highlight Style 1357, Restock Style 1031, Offer Words 959, Photo story Style 903.
Cuts:
1. Background finishes: one sideways row (Plain, then Gradients / Patterns / Textures each after a small label) — field 311 → 80 px in Restock, Photo story, Collage, Carousel (and every tool with `Studio.groundField`). Chosen finish scrolled into view when the sheet opens.
2. Signed-out Home: the Saved card's Sign in is a text button, so Home has one blue Sign in (top right).
3. Settings: Who's using Studio gets its own icon (it shared Sign in's).
4. run.mjs: the 1.43.0 audit note (lines outside tool()/home() only ran hub suites) was already fixed: closed.
5. Skill test map: 5 suites were missing (feedlayouts, got-talent, planned, same-name, fixes54).
Card draft:
### Background finishes in one row
type: improve
The 14 backgrounds now sit in one sideways row under Background (Plain first, then Gradients, Patterns and Textures), so the Style sheet is about 230px shorter in Restock, Photo story, Collage and Carousel. The one you picked is in view when the sheet opens.
