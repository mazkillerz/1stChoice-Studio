# whatsnew1 (What's New, one level)

## Card draft (changelog format)
### What's new, one tap deep
type: improve
The What's new page lost its nested sections: the newest version is fully open, and every older version is one row that opens in a single tap and shows everything at once (every change with its note and its before/after pictures). A "Jump to" bar at the top goes straight to the latest versions, and "All versions" opens a sheet with every version grouped as 2.x, 1.x, 0.x. The New / Improved / Fixed filters and links like whats-new.html#v-2.3.0 still work.
![before](assets/whatsnew/2.21.1-whatsnew-before.jpg)
![after](assets/whatsnew/2.21.1-whatsnew-after.jpg)

## sw.js shell: no new files (assets/whatsnew.js and .css changed, bump cache).
## changelog.md intro: replace the paragraph about "closed blocks of five minor versions ... tap a block, then a version" with: older versions are one row each; one tap opens all changes (note + screenshots); the jump bar and All versions sheet go to any version. Cards are no longer expanders.
## README: What's new = open latest, one-tap rows, Jump to bar + All versions sheet, filters.
## Lesson: a lazily built body inside a 0fr grid needs a forced reflow (void el.offsetHeight) before adding .open or the reveal does not animate.
## Wording to approve: "Jump to", "All versions", "Milestone" tag (English UI only).
