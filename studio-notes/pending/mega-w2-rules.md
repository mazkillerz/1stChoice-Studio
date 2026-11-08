# w2-rules: Brand rules check (2.3)
**What's New card:** "Brand check" — Save now quietly warns about off-brand words, text in Instagram's covered zones, tiny or hard-to-read text, mixed looks, non-HD cans and new unapproved Arabic lines. One tap Fix or Ignore; it never blocks a save. Turn it off in Settings → Brand check.

**New shipped files for sw.js shell:** `assets/rules.js`, `assets/rules.css` (lazy-loaded).
**run.mjs MAP rows:** `[/assets\/rules\.(js|css)|tests\/rules\.mjs|brands\/.*\/brand\.js/,['rules']]`, and add `rules` to the tool-page row (`assets/studio.js`, `tools/create.js`).
**README lines:** Save sheet shows a Brand check (per-device switch in Settings); rule data is the `rules:{}` block in brand.js.
**Hooks:** studio.js block `rules (mega)` (reg opts txt/tsize/tcolor/aid, `#rulesHost`, Settings row); create.js block `rules (mega 2.3)`. `Studio.debug.rulesDesign`.

**Arabic lists for owner review (brands/1stchoice/brand.js `rules`; from CLAUDE.md):**
- Banned to swap: خوي→ربيع, خويك→ربيعك (ربيعك is my form, please approve), غرشة→علبة, غرشتك→علبتك, غرش→علب, وايد→واجد.
- Banned without swap: مو بعد; cheers words كاسك، كاسكم، تشيرز، cheers.
- "Neutral" words never flagged as new wording (calendar/money): يناير…ديسمبر, السبت…الجمعة, من, إلى, يوم, ريال.
- Passion: باشن فروت / passion; never "25+".

**Behaviour notes:** approved lines = every Arabic line in brand phrases + flavour names + `rules.phrases.extra` + approved team phrasebook rows (signed in, asked once, 1.5 s cap). In Create, words on the page when it was opened or a template built are treated as not new. A banned word is the only finding for its layer. Only the current page is checked in tools; Create checks every page.
**Lessons:** BD.util is redefined in tools/create-core.js without moveByWorld; port 8083 was held by a stale Wave 1 server, I used 8183.
