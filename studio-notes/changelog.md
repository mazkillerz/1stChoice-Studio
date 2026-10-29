# Studio changelog

The What's New page in Studio (`whats-new.html`) reads this file. Keep the format exact:

- `## <version> · <date>` starts a version (newest first).
- Optional, right under the version heading (before its first card): `milestone: <title>` turns the version into a milestone banner (big version number, the title, then any plain lines below it as a short intro). Use it only for big releases (1.0.0, 2.0.0).
- `### <title>` starts a card in that version.
- Directly under the title, an optional type line: `type: feature` (a new tool or ability), `type: fix` (something was wrong, hard or broken and now is not) or `type: design` (how it looks or is laid out). A card without it counts as a feature. The What's New page uses it for the filter chips (All, Features, Fixes, Design) and a small tag on each card.
- The lines after that are the card's short note (plain text, one paragraph).
- `![before](assets/whatsnew/<file>)` and `![after](assets/whatsnew/<file>)` add screenshots (either or both, paths from the site root).
- Any other line that starts with `[try:` is ignored.
- Anything above the first `##` (this intro) is not shown.

How the page shows it, with no extra work: the newest version is the big highlight card at the top. Older versions are grouped automatically by minor version in blocks of five (0.1 to 0.5, 0.6 to 0.10, 0.11 to 0.15 ...); a patch version such as 0.6.1 sits with 0.6. Each group is a closed section the reader can open.

## 1.22.0 · 29 Oct 2026

### Backgrounds for Carousel
type: feature
The Background finishes from Restock and Photo story are now in Carousel too: open Style and pick Plain, Fade, Glow, Dots, Lines or Grain under Background colour. It is a setting for all slides, so every slide of the post gets the same finish and the set looks like one piece. It shows on slides with a coloured ground (Words only, Big number, Photo + words, the End slide…) and is made from the colour you chose, so it works on White, Cream, Black or your own colour. Plain is the look you had before and stays the default: every carousel you already made opens exactly the same.
![before](assets/whatsnew/1.22.0-carousel-bg-before.jpg)
![after](assets/whatsnew/1.22.0-carousel-bg-after.jpg)

### Waiting photos: one tap to go on
type: fix
When photos are still waiting for Restock or Photo story, their row says "2 waiting". Tapping that row used to open the tool with a Continue banner, one more tap. Now the row goes straight on with the next photo, the same as the "photos still waiting" row on Home: one tap instead of two. And when it opens the story you were on, the "You have an unfinished story here" banner no longer sits on top of it.

## 1.21.0 · 29 Oct 2026

### Backgrounds for Restock and Photo story
type: feature
Restock and Photo story now have a Background choice in Style, under the background colour: Plain, Fade, Glow, Dots, Lines or Grain. Each one is a quiet finish made from the colour you picked, so it works on white, cream, a dark colour or any other, and the words stay easy to read. Plain is the look you had before, and it stays the default: every story you already made, and every new one, looks exactly the same until you pick something. Restock has it on every style except Full photo; Photo story on Caption, Poster and Arch. Restock from a photo is still two taps.
![before](assets/whatsnew/1.21.0-backgrounds-before.jpg)
![after](assets/whatsnew/1.21.0-backgrounds-after.jpg)

### Undo keeps your layer chosen
type: fix
When a layer was chosen and you tapped Undo or Redo, the layer bar stayed open but nothing was chosen any more, so its buttons did nothing until you tapped the layer again. Now the layer stays chosen and the bar keeps working. If Undo takes that layer away (say, text you just added), the bar closes.

## 1.20.0 · 29 Oct 2026

### Ready for a second brand
type: fix
Studio is built so another brand can use it with its own logo, fonts, colours and words. A check with a made-up brand found a few places that still picked 1st Choice's: Offer and Restock chose their first headline and button by looking for 1st Choice's Arabic words (another brand could not choose its own), and the little pictures on the Style buttons had 1st Choice's cream and gold built in. They now come from the brand kit. Nothing changes for 1st Choice: same words, same colours, same designs. A new test runs Studio with the made-up brand and fails if any 1st Choice name, colour or font shows up.

## 1.19.0 · 29 Oct 2026

### Text styles
type: feature
Made a headline look you like? Keep it. Tap a text, open **More** and tap **Save this style**: it goes into a short **Text styles** list on this phone (named Style 1, Style 2…; tap its **⋯** to rename it, Arabic names too). Next time, tap a text and tap the style: colour, font, line options, shadow, background pill and opacity all go on at once, size and place stay. The list is there in every story and every tool, up to 8 styles; until you save one, only the Save button shows. The style's **⋯** menu also has **Use on all text** and **Remove**. Undo brings the old look back.
![before](assets/whatsnew/1.19.0-textstyles-before.jpg)
![after](assets/whatsnew/1.19.0-textstyles-after.jpg)

### Paste on all text
type: feature
After **Copy style**, a new **Paste on all text** button under Paste style puts that look on every line of words in the story in one tap, instead of one text at a time: 2 taps instead of 3 more for every text (buttons and tags keep theirs). One tap of undo brings all of them back.

## 1.18.0 · 29 Oct 2026

### Save the pictures of several designs at once
type: feature
In **Saved**, tap **Select**, tick the designs you want and tap **Save pictures** in the bar at the bottom. Studio makes every picture at full quality, exactly as if you opened each design and tapped Save (2160×3840 for stories, 2160×2700 for posts, every slide of a carousel), and shows **Saving 2 of 5…** with **Cancel**. On a phone they all open in one share sheet; on a computer they come as one ZIP. Each file is named after its design (**Shelf-day.png**, **Four-slides-01.png**…). Templates are skipped, since they have no picture of their own. Up to 20 designs at a time.
![before](assets/whatsnew/1.18.0-savepics-before.jpg)
![after](assets/whatsnew/1.18.0-savepics-after.jpg)

## 1.17.0 · 29 Oct 2026

### Board: stacks that tidy themselves (preview)
type: feature
New in Board, as a preview you switch on: **flex layout**, an idea from Penpot. A frame or a group can stack what's inside it in a **column** or a **row**, with a gap, padding and alignment. Make a menu or a price list, then type a longer name: the lines below move down by themselves instead of overlapping. Pick a few things and tap **Stack** to put them in a stack that grows with its words (give it a box colour and round corners for a label or a pill). Drag something inside a stack to change the order. Rows can run right to left for Arabic. Stacks are saved with the board, undo like everything else and export at full quality. Boards made before look exactly the same. To try it: open Board, tap the Design panel with nothing selected, and turn on **Previews → Flex layout** (or open `lab/board.html?flex=1`). It stays on, on that device only.
![before](assets/whatsnew/1.17.0-flex-before.jpg)
![after](assets/whatsnew/1.17.0-flex-after.jpg)

## 1.16.0 · 29 Oct 2026

### Favourite templates, and the ones you used last
type: feature
Tap the star next to a template's name and it moves to a **Favourites** section at the top of **Templates**. Under it, **Recently used** shows the last templates you opened in one small row, so the template you use every day is one tap from the Templates tab, with no scrolling or picking a category. A category (Restock, Posts…) lists its favourites first too. Create's template picker has the same stars and a Recently used row (favourites come first the next time it opens). Both are kept on this phone; nothing shows until you star or open something, and tapping the star again takes it out.
![before](assets/whatsnew/1.16.0-favourites-before.jpg)
![after](assets/whatsnew/1.16.0-favourites-after.jpg)

### The New label no longer covers the headline
type: fix
On post previews in Templates, the **New** label sat on top of the headline. It now sits on the line under the title, next to what the template is (for example "Post · ready in one tap"), and the previews are whole again.
![before](assets/whatsnew/1.16.0-badge-before.jpg)
![after](assets/whatsnew/1.16.0-badge-after.jpg)

### Create templates say what they are
type: design
Every Create template in Templates said "Post · Create" or "Story · Create". Now each line says what you get: "Post · ready in one tap", "Story · three facts", "Square · a game", "Story · with your photo"… The line can wrap once instead of being cut off.

## 1.15.0 · 29 Oct 2026

### Save on a computer without losing half the screen
type: design
On a computer the Save card used to stick to the bottom of the screen and cover about half of the steps while you edited Style or Words. Now it waits at the end of the steps, and a slim bar at the bottom carries the same Save button until you get there. One click still saves (it brings the card up so you see the tick), and more than twice as much of the steps stays in view.
![before](assets/whatsnew/1.15.0-savecard-before.jpg)
![after](assets/whatsnew/1.15.0-savecard-after.jpg)

### One blue button in the Save sheet
type: design
On a phone the Save sheet showed three blue buttons (Done, Save and the bar's Save). Done is now a quiet grey button in every sheet, in the same place and size, so the blue one is always the thing that saves.
![before](assets/whatsnew/1.15.0-savesheet-before.jpg)
![after](assets/whatsnew/1.15.0-savesheet-after.jpg)

### Buttons instead of underlined links
type: design
Reset photo, More options, Only save to the team and the other small actions were underlined like web links. They are now blue text buttons that light up when you press them, like See all and More tools. Same words, same place.
![before](assets/whatsnew/1.15.0-buttons-before.jpg)
![after](assets/whatsnew/1.15.0-buttons-after.jpg)

### Offer from a photo
type: feature
Offer now has a camera in All tools, like Carousel and Highlight covers: tap it, pick the product photo, and it lands in the offer ready to save. 3 taps instead of 4 (All tools, camera, Save). Pin Offer and the camera is on your Home too.
![before](assets/whatsnew/1.15.0-offer-before.jpg)
![after](assets/whatsnew/1.15.0-offer-after.jpg)

### Shorter notes
type: design
The Photo sheet's note is one short sentence now, and "Keep the photos" in the Save sheet's More options has its explanation on the line under it instead of squeezed beside it.
![before](assets/whatsnew/1.15.0-labels-before.jpg)
![after](assets/whatsnew/1.15.0-labels-after.jpg)

## 1.14.0 · 29 Oct 2026

### Flip
type: feature
Need the arrow to point the other way? Tap a sticker, shape or picture, open **Move** and tap **Flip**: it turns into its mirror image, left to right, without going upside down (Rotate used to turn a curved arrow on its head). Tap **Flip** again to put it back. It's kept in the saved design, Undo takes it back, and the full-size save comes out flipped too. Words never flip: the button doesn't show for text, buttons, the logo or the cans (a mirrored can would show its label backwards).
![before](assets/whatsnew/1.14.0-flip-before.jpg)
![after](assets/whatsnew/1.14.0-flip-after.jpg)

### Emoji highlight covers
type: feature
Highlight covers have a new cover type: **Emoji**. Open **Style**, tap **Emoji** and pick one of 24 (a pin, a chat bubble, a star, a heart, coffee, ice, a gift, a price tag, a truck, a cart, a clock, a calendar, sparkles, a bolt, the sun, the moon, a yummy face, a thumbs up, a crown, a camera, a note, fire, a box and a question mark). It sits big in the middle of the circle on your cover's background, with the same Circle / Ring / Nothing behind it as the rest of the set. Each new cover starts with a different one. Emoji are drawn, not typed, so they're sharp in the save and look the same on every phone. In **Colour** you can turn one into a single brand colour; it moves, sizes and flips like any layer.
![before](assets/whatsnew/1.14.0-emoji-before.jpg)
![after](assets/whatsnew/1.14.0-emoji-after.jpg)

## 1.13.0 · 29 Oct 2026

### "2 waiting" on your tools
type: design
Picked several shop photos for Restock or Photo story and left before the last one? The tool's row in **Your tools** and in **All tools** now carries a small "2 waiting" tag, so you can see at a glance which tool still has photos lined up. It is a quiet tint, not another button; it goes as soon as the photos are done or cleared with ✕.
![before](assets/whatsnew/1.13.0-waiting-before.jpg)
![after](assets/whatsnew/1.13.0-waiting-after.jpg)

### A story you leave at once is kept
type: fix
Studio keeps every unfinished story in **Continue editing**, but it waited a moment (0.8 s) before writing it. Leaving the page, or tapping **Skip** to the next photo, inside that moment could lose the story or its last change. Now leaving, hiding the app or skipping writes it straight away.

### The right word on a computer
type: fix
When a computer runs short of memory while saving, Studio steps the picture down a little and tells you. It used to say "This phone was low on memory" on a computer too; it now says "device" there (a phone still says "phone").

## 1.12.0 · 28 Oct 2026

### Stickers
type: feature
Point at the can, circle the price, add a little sparkle. In any tool, open **Layers** and tap **Sticker**: a sheet of 14 stickers (arrows, sparkles, a starburst, a star, a heart, a seal, a scribble circle and underline, a wavy line, a speech bubble, shine lines and a tick). Tap one and it lands on your story as a normal layer: drag it, pinch to size it, turn it, give it any brand colour or your own, make it see-through, duplicate it or undo. Stickers are drawn, not pictures, so they stay sharp in the full-size save, and they come back when you open a saved design. Adding one is 3 taps (Layers, Sticker, the sticker). They have no words in them, so they fit any brand.
![before](assets/whatsnew/1.12.0-stickers-before.jpg)
![after](assets/whatsnew/1.12.0-stickers-after.jpg)

### No more empty card on a computer
type: fix
On a computer the tool page always showed an empty **Add an element** card in the left column, even before you tapped Element. It now shows only while you're picking an element, like Add an asset and the new sticker sheet.

## 1.11.0 · 28 Oct 2026

### Posts in one tap
type: feature
Need a feed post today? Open **Templates → Posts** (or search "post") and tap **Ice cold post**, **Did you know post** or **Your choice post**. Each opens as a finished 1080×1350 post with the brand's approved words and the HD cans, so **Save → Save image** gives you the picture (2160×2700, like every post). Every word and can can still be changed. Before, these three were only stories, and a post meant starting from a blank page in Create: now it's 3 taps from Templates to a saved post (the post, Save, Save image).
![before](assets/whatsnew/1.11.0-posts-before.jpg)
![after](assets/whatsnew/1.11.0-posts-after.jpg)

### Find templates by their Arabic words
type: fix
Searching for a word on a template, like يسرسح or اختيارك, found nothing: search only knew the template names in English. Now Create templates are found by their Arabic words too (with or without harakat), and tapping one opens Create with that template already built and ready to save. If Create is already open on a design, it opens the template picker on that template instead, so nothing you made is replaced.
![before](assets/whatsnew/1.11.0-search-before.jpg)
![after](assets/whatsnew/1.11.0-search-after.jpg)

## 1.10.0 · 28 Oct 2026

### Carousel and covers from photos, right from All tools
type: design
Tools that start from photos now have the same camera button in All tools that they have on your home. Carousel and Highlight covers start from your photos in 3 taps (All tools, camera, Save) instead of 4: before, you opened the tool, tapped Add your photos and picked them there. Tools on your home keep their camera there, so their rows in All tools stay the same.
![before](assets/whatsnew/1.10.0-alltools-before.jpg)
![after](assets/whatsnew/1.10.0-alltools-after.jpg)

### A shorter note for several photos
type: design
With several shop photos in a row, the note over your story ran to three lines next to Skip. It's two now: "Photo 1 of 3 is in" and "Tap Save for the next one", so it covers less of the design.
![before](assets/whatsnew/1.10.0-note-before.jpg)
![after](assets/whatsnew/1.10.0-note-after.jpg)

### Arabic numbers in search
type: fix
Searching with Arabic numbers (٢٨ أكتوبر) found nothing, because search dropped them with the harakat. Now ٢٨ and 28 find the same designs, and Create's template search matches Arabic exactly like the search on the home page.

### Save all on a computer says ZIP
type: fix
On a computer the Save card for a carousel said "All 4 slides go to your Photos", but there they come as one ZIP in your downloads. It now says so: "All 4 slides download at full quality in one ZIP, numbered in order." Phones still say Photos.

## 1.9.0 · 28 Oct 2026

### Save every slide in one go
type: feature
A carousel or a set of highlight covers now says how much it saves: **Save all 6 slides** (with the team switch on, the line under Save says "All 6 slides go to your Photos"). One tap makes every slide at full quality and the counter shows **Saving 3 of 6**; changed your mind? Tap **Cancel** and nothing is saved, not even to the team. On a phone all of them open in one share sheet; on a computer they come as one ZIP (browsers used to stop after the first few downloads). Every file is named after your design and numbered in order: **My-carousel-01.png**, **-02.png**… **Save this slide only** is still one tap, in the same place.
![before](assets/whatsnew/1.9.0-saveall-before.jpg)
![after](assets/whatsnew/1.9.0-saveall-after.jpg)

## 1.8.0 · 28 Oct 2026

### Your photos keep waiting
type: feature
Picked three shop photos for **Restock** and the phone reloaded after the share sheet, or you went back to Home in between? The photos still waiting used to be gone, and you had to pick them again. Now they stay on your phone. Home shows **2 photos still waiting**: tap it and the next one comes in, ready to save in one tap. Opening Restock again offers them too, with **Continue** (back to the story you were on if you hadn't saved it yet) or **Clear**. A reload right after saving brings the same offer; a reload before saving brings you back to that photo. They're cleared by themselves once the last one is in, or with ✕. **Photo story** works the same.
![before](assets/whatsnew/1.8.0-home-before.jpg)
![after](assets/whatsnew/1.8.0-home-after.jpg)

### Skip a photo straight from the note
type: design
With several photos, the "Photo 1 of 3 is in" note now has a small **Skip**: one tap brings in the next photo without saving this one (it stays in Continue editing). Before, skipping meant editing something first so the Save sheet would open, then **Skip to the next photo**: 3 taps or more, now 1. Saving each photo is still one tap, and Skip is a quiet word, not another big button.
![before](assets/whatsnew/1.8.0-note-before.jpg)
![after](assets/whatsnew/1.8.0-note-after.jpg)

## 1.7.0 · 28 Oct 2026

### Copy style, paste style
type: feature
Made one line look just right and want the others to match? Tap it, open **More**, tap **Copy style**. Then tap another line and **More → Paste style**: it takes the same colour, font, alignment, line height, shadow, background pill and opacity, and keeps its own size and place. It works on buttons and shapes too (shapes also take the outline and corners), and the copied style stays on your phone, so you can paste it in your next story or another tool. Matching a line's colour, font and alignment by hand took 6 taps (Colour, a swatch, Font, the font list, a font, Align); now it's 2 (More, Paste style). Undo brings the old look back. **Paste style** only shows once you've copied something.
![before](assets/whatsnew/1.7.0-style-before.jpg)
![after](assets/whatsnew/1.7.0-style-after.jpg)

### Templates you can see in search
type: design
Searching "post" listed the Create templates with the same grey icon, so you had to open each one to see it. Now every template in search shows its real picture, in its own shape: posts 4:5, highlight covers round, stories tall, all lined up on one edge.
![before](assets/whatsnew/1.7.0-search-before.jpg)
![after](assets/whatsnew/1.7.0-search-after.jpg)

## 1.6.0 · 28 Oct 2026

### Several shops in a row
type: feature
Visited three shops? Tap **+**, then **Restock**, and pick all three photos at once. The first photo goes in, ready to save in one tap. After saving, tap **Next photo (2 of 3)**: the next photo comes in with the same words and look, and one more tap saves it. Each one is its own story and goes to the team on its own. Three restock stories took 11 taps (back to Home, +, Restock and Save for each one after the first), now they take 7. Picking one photo works just like before. **Photo story** does the same, and so does sharing several photos to Studio from your gallery.
![before](assets/whatsnew/1.6.0-plus-before.jpg)
![after](assets/whatsnew/1.6.0-queue-after.jpg)

### Names that fit on Saved
type: design
Saved cards cut names with a date short: "Restock – 24 …". The line under the name already says when it was made, so an automatic name now shows just **Restock**, and the full name is still in the design's menu and in search. A name you typed is never changed. Designs older than a week now say **18 Oct** instead of the phone's 10/18/2026.
![before](assets/whatsnew/1.6.0-cards-before.jpg)
![after](assets/whatsnew/1.6.0-cards-after.jpg)

## 1.5.0 · 26 Oct 2026

### Put your tools in order with one drag
type: feature
All tools showed your pinned tools twice: once in "Order on your home" and again in their group. Now each tool is there once. Your pinned tools sit at the top under **On your home**, in the order Home shows them. Press the dots at the end of a row and drag it up or down, and Home follows. Moving the third tool to the top took two arrow taps, now it takes one drag. The other tools stay below in their groups. The last tool no longer hides behind the phone's gesture bar.
![before](assets/whatsnew/1.5.0-alltools-before.jpg)
![after](assets/whatsnew/1.5.0-alltools-after.jpg)

### A shorter + menu
type: design
The + menu now has only what you start most: **Restock**, **Photo story** and **Collage**, then **New design**. Templates has its own tab at the bottom, so it left the menu. Carousel and Highlight covers are one tap away under **More tools**, which opens All tools. Restock from a photo is still 2 taps, and **Last time** still marks the tool you used last.
![before](assets/whatsnew/1.5.0-plus-before.jpg)
![after](assets/whatsnew/1.5.0-plus-after.jpg)

### A calmer Saved page
type: design
Saved had two rows of chips. Now it has one: **All**, then your collections, with **Sort** at the end. Every design gets the same neat picture, so posts fill their card like stories, with no grey gap. The **Template** badge moved to the bottom corner and no longer sits under **⋯**. Long names, in Arabic, English or both, stay on one tidy line. The "New design" card is gone because the + button does the same job.
![before](assets/whatsnew/1.5.0-saved-before.jpg)
![after](assets/whatsnew/1.5.0-saved-after.jpg)

### Sort in Studio's own style
type: fix
**Sort** opens a small sheet now, not the phone's own list: **Recent**, **Oldest** or **Name A to Z**, with a tick on your choice. The blue ring that stayed on the button after you picked is gone.
![after](assets/whatsnew/1.5.0-sort-after.jpg)

## 1.4.0 · 25 Oct 2026

### Your can on a highlight cover
type: feature
Highlight covers have a fourth cover type: **Product**. Open **Style**, tap **Product** next to Icon, Word and Photo, then pick the can you want: Classic, Passion fruit, both, with or without a shadow. It is the real HD can picture, sitting inside the circle Instagram shows. The Shape (circle, ring, nothing) still works behind it.
![before](assets/whatsnew/1.4.0-product-before.jpg)
![after](assets/whatsnew/1.4.0-product-after.jpg)

### Search the templates in Create
type: feature
Create's template list has a search box at the top now. Type a name ("ice") or a word from the design in Arabic ("ثلج") and only the templates that match stay; **✕** brings them all back. Opening a template from the hub search while you already have a design in Create now opens the list right on that template.
![before](assets/whatsnew/1.4.0-search-before.jpg)
![after](assets/whatsnew/1.4.0-search-after.jpg)

### Tidier tick boxes
type: design
Tick boxes in the sheets now line up exactly with the heading above them (they sat 4 px to the right). Studio's automatic design checks now cover Carousel, Highlight covers and Create too.

## 1.3.0 · 25 Oct 2026

### See a saved design big
type: feature
Looking for last week's restock story? Press and hold a saved design (or tap **⋯**), then tap its **picture**: it opens big, full screen. **Swipe** left or right to flip through the designs next to it (on a computer: the arrows or ← →). **Open** edits the one you see; **More** shows its menu. Nothing moved: the menu has the same buttons as before.
![after](assets/whatsnew/1.3.0-peek-after.jpg)

### Your shared photo waits for you
type: fix
Shared a photo from the gallery to Studio and closed the "pick what to make" sheet by mistake? Before: the photo was gone and you had to share it again. Now Home shows **Your photo is in** at the top: tap **Pick** to choose the tool, or **✕** to forget it.
![after](assets/whatsnew/1.3.0-shared-after.jpg)

## 1.2.0 · 25 Oct 2026

### A new logo for Studio
type: design
Studio has its own logo now: the little dragon. It is the app icon on your home screen (after you install Studio again, or when your phone refreshes it), the tab icon in the browser, and it sits next to your brand's logo at the top of Home. Your brand's logo and your designs did not change.
![before](assets/whatsnew/1.2.0-icon-before.jpg)
![after](assets/whatsnew/1.2.0-icon-after.jpg)

### Put your tools in your order
type: feature
Home shows your pinned tools in the order you pinned them now, not a fixed order. Want Photo story first? Open **All tools**: once two or more tools are pinned, **Order on your home** sits at the top, and the arrow moves a tool one place up. The camera buttons follow.
![after](assets/whatsnew/1.2.0-order-after.jpg)

## 1.1.0 · 25 Oct 2026

### Carousel and covers from your photos
type: feature
**+** now starts a **Carousel** or **Highlight covers** from your photos too. Pick up to 10 photos for a carousel (or 12 for covers) and it opens with **one slide or cover per photo**, as many as you picked, ready to save. Before: open the tool, delete or add slides, then add the photos slide by slide. Now: **+**, Carousel, pick the photos, **Save**. Sharing photos from the gallery (Android) offers both as well. Their rows in All tools get the camera button.
![before](assets/whatsnew/1.1.0-photos-before.jpg)
![after](assets/whatsnew/1.1.0-photos-after.jpg)

### Collage: drop a photo on its border
type: fix
With a border on, dragging a photo onto another one only swapped them when you let go on the picture itself; on its border nothing happened. Now the border counts as part of the photo, so a drop anywhere on the frame swaps them.

## 1.0.0 · 25 Oct 2026
milestone: Studio 1.0
Studio is complete: a welcome for new phones, a real **Templates** library, a faster Restock, new looks for Photo story and Collage, and finer editing for every tool. Thank you to the team for every idea and every fix request that got us here.

### A welcome for new phones
type: feature
The first time Studio opens on a new phone, three short swipes show the main tools, how to pin and search, and how Save works. Tap **Skip** any time; it never shows again on that phone. Want to see it again, or show a new teammate? Tap the new **gear** at the top of Home, then **Welcome tour**. The gear is Studio's **Settings**: your account, how your tools look, the welcome, What's new and Experimental, in one short list.
![after](assets/whatsnew/1.0.0-welcome-after.jpg)

### Templates, all in one place
type: feature
A new **Templates** tab sits in the bottom bar between Home and Saved (it is also in **+** and in search). It holds every ready-made start with a real preview, sorted into **Restock**, **Stories**, **Posts**, **Highlights** and your **Team**'s own templates. Tap one and it opens ready to go: a Restock template opens Restock with its style and words already set, so all that is left is your photo (or nothing at all, for the Cans ones). 18 of the 57 are new, including Restock post, Both flavours, This or that, Good morning and two new highlight covers.
![before](assets/whatsnew/1.0.0-templates-before.jpg)
![after](assets/whatsnew/1.0.0-templates-after.jpg)

### Restock: two taps, no photo needed
type: feature
Restock has a new **Cans** style that uses the HD can pictures instead of a photo: pick which flavours are back and tap **Save**. Restock remembers your last style and flavours, so the next restock is **two taps from Home: Restock, then Save** (before: the camera button, pick a photo, Save). Two new layouts for your own photos, **Split** and **Big words**, and new options: **Photo shape** (rounded, circle, arch or square), **Headline size** and **Button colour**.
![before](assets/whatsnew/1.0.0-restock-before.jpg)
![after](assets/whatsnew/1.0.0-restock-after.jpg)

### Photo story: four new looks
type: feature
**Whole photo** shows a wide or square photo whole, on a soft blur of itself. **Caption** puts your words on a clean band under the photo, **Poster** sets a big headline over a tall photo card, and **Arch** frames the photo in an arch on cream. Every style now has **Headline size**, **Words colour** and **Show the logo**, and the photo styles have a **Shade** slider for how dark the fade behind the words is.
![before](assets/whatsnew/1.0.0-story-before.jpg)
![after](assets/whatsnew/1.0.0-story-after.jpg)

### Collage: more grids, borders and easy swaps
type: feature
More grid layouts for every number of photos, 2 to 9. A **Border** around each photo with its own colour, gaps up to 80 px, and **Edge space** when Outer margin is on. Changing the order is easy now: in the Photo sheet tap **Swap two**, then the two photos, or tap **Shuffle** for a new mix (Undo goes back).
![before](assets/whatsnew/1.0.0-collage-before.jpg)
![after](assets/whatsnew/1.0.0-collage-after.jpg)

### Finer editing in every tool
type: feature
Every photo now has a **Photo look** (Bright, Warm, Cool, Vivid, B&W or Soft) and a **Light** slider, right in the Photo sheet, and they are saved with your design. Tap a word or the logo and the bar has a new **Move** tab: arrows nudge it a little at a time (hold to keep going), **Centre** and **Middle** line it up, and Rotate lives there too. All six tabs now fit on small phones; **More** used to hide under the ✓.
![before](assets/whatsnew/1.0.0-edit-before.jpg)
![after](assets/whatsnew/1.0.0-edit-after.jpg)

### A tidier + menu
type: design
"Start from a photo" now starts exactly where the icons under it start, with the same padding all round the menu, and **Restock**, **Photo story** and **Collage** each have their own icon instead of three cameras. **Templates** is in the menu too, just above New design.
![before](assets/whatsnew/1.0.0-plus-before.jpg)
![after](assets/whatsnew/1.0.0-plus-after.jpg)

### Flavour buttons work again
type: fix
In Restock, tapping **Classic** or **Passion fruit** under Words → Flavours back in stock did nothing: a hidden error stopped it. Now each tap ticks or unticks the flavour, the pills on the story follow, and in the new Cans style the cans follow too.

### Polish everywhere
type: fix
Every screen was checked in light and dark mode and with Arabic names. Notes are one short line now (for example after Start fresh: "Your other story is kept on Home"), low down and out of your design's way, instead of a tall bubble over it. What's New shows **bold** words properly. The group headings in All tools and the Back arrow on the Saved page now line up with the rows under them, small links and sliders are easier to hit, and a note never covers **Add your photo**. And Studio now checks itself for the things you asked us to fix before (alignment, contrast, notes in the way, too many taps, Arabic direction, small phones), so they are caught before you see them.
![before](assets/whatsnew/1.0.0-polish-before.jpg)
![after](assets/whatsnew/1.0.0-polish-after.jpg)

## 0.9.0 · 25 Oct 2026

### Share photos straight into Studio
type: feature
On Android, once Studio is installed on your home screen, it now shows up when you tap **Share** in your gallery or camera app. Pick one photo or several, tap Share, then Studio: it opens with your photos in and asks what to make: **Restock**, **Photo story** or **Collage** (Collage uses all of them, the others the first one). Tap one and the story opens with your photo already in, ready to Save. No more opening Studio first and hunting for the photo again. Not installed yet? Studio's home page offers an **Install** button, or search for "Install". iPhones don't let websites appear in the Share list, so on an iPhone keep using the camera button or +.
![after](assets/whatsnew/0.9.0-share-after.jpg)

### + remembers what you made last
type: design
The + menu now puts a small **Last time** tag on the photo tool you used last on this phone, so a repeat restock is easy to spot. The order of the menu never changes, so your thumb still finds Restock in the same place.
![before](assets/whatsnew/0.9.0-last-before.jpg)
![after](assets/whatsnew/0.9.0-last-after.jpg)

## 0.8.0 · 25 Oct 2026

### Select several designs at once
type: feature
Tidying the Saved page used to mean one design at a time. Now tap **Select** at the top right, tick as many designs as you like (or **Select all**), and use the bar at the bottom: **Collection** puts them all in a collection (pick one or type a new name; their other collections stay), **Delete** removes them all after one question that says how many, and while you look at a collection **Take out** removes them from it. Tap ✕ or Back to stop. You can also press and hold a design and pick **Select more** to start with that one ticked.
![before](assets/whatsnew/0.8.0-select-before.jpg)
![after](assets/whatsnew/0.8.0-select-after.jpg)

### More designs in view on a computer
type: design
On a wide screen the Saved page now shows 7 designs a row instead of 6, so you see more at a glance. Phones are unchanged.

## 0.7.1 · 25 Oct 2026

### A calmer, cleaner look
type: design
Studio has a new font for its buttons and labels, IBM Plex Sans Arabic, made for Arabic and English side by side. Titles are lighter, there are fewer bold weights, and every page uses the same spacing, so the header, chips and cards line up the same way everywhere. Design cards sit in a soft frame with the name and time together underneath. In dark mode the page, the cards and the pop-ups are different shades of dark instead of one flat black. Your designs still use the brand fonts: only Studio itself changed.
![before](assets/whatsnew/0.7.1-look-before.jpg)
![after](assets/whatsnew/0.7.1-look-after.jpg)

### Collections you can read, with a ⋯ menu
type: fix
Picking a collection on the Saved page turned its chip blank in light mode and dark on dark in dark mode, and cut its shadow off in a hard line. The chosen collection is now clearly filled and readable in both, shadow and all. Rename collection and Delete collection moved from two underlined links into a small ⋯ menu on the chosen chip, so they only show when you need them. Delete still asks first.
![before](assets/whatsnew/0.7.1-collection-before.jpg)
![after](assets/whatsnew/0.7.1-collection-after.jpg)

### Arabic names, the right way round
type: fix
A name that mixes Arabic and English now reads from the right everywhere. On a design card the name can take two lines and its time lines up under it on the same side, and the top of a design's menu follows the same direction. In search, a result with an Arabic name is right to left all the way across: picture, words and arrow. In the search box the magnifying glass stays at the start and the clear ✕ at the end, so they never sit on top of each other.
![before](assets/whatsnew/0.7.1-arabic-before.jpg)
![after](assets/whatsnew/0.7.1-arabic-after.jpg)

### “Your photo is in” gets out of the way
type: fix
After you start from a photo, the note over your design stayed there and had a second Save button on it. Now it is a small note that fades after about 3 seconds; swipe it down or tap the photo to hide it sooner. Save in the bottom bar is the one Save, and it pulses softly while the note shows. Restock is still two taps: the camera button on the home page, then Save, which saves the full-quality picture and adds it to the team straight away. Change something first and Save opens the Save sheet as usual.
![before](assets/whatsnew/0.7.1-photo-before.jpg)
![after](assets/whatsnew/0.7.1-photo-after.jpg)

### A Snap button that says what it does
type: fix
The round icon at the top of the editor was Snap to guides, but nothing said so. It now shows a magnet and the word Snap, and it is tinted when it is on. When Snap is on, whatever you drag jumps onto the guide lines (the centre, the edges and the other layers).
![before](assets/whatsnew/0.7.1-snap-before.jpg)
![after](assets/whatsnew/0.7.1-snap-after.jpg)

### Matching icons in the bottom bar
type: design
The home icon looked taller than the Saved icon. Both now come from one icon set, with the same size and the same rounded lines, and the tab you are on is filled in. The bar keeps its shape.
![before](assets/whatsnew/0.7.1-bar-before.jpg)
![after](assets/whatsnew/0.7.1-bar-after.jpg)

### Friendlier when there is not much yet
type: design
An empty Saved page now says what to do and has a Make a design button. When there are only a few designs, a New design card fills the gap (it opens the + menu) and a tip shows how to copy, rename or file a design, so the page never looks bare.
![before](assets/whatsnew/0.7.1-empty-before.jpg)
![after](assets/whatsnew/0.7.1-empty-after.jpg)

## 0.7.0 · 25 Oct 2026

### Save to the team, all set up
type: feature
Tap Save and a small sheet opens, ready to go: the name is filled in, the collection is the one you used last time, and Save to the team is on. One more tap on Save & add to team puts the full-quality picture in your Photos and the design in Saved for the whole team. Change the name or the collection first if you like. That is two taps, collection included; before it was three, or five with a collection. Looks good · Save after starting from a photo is still one tap, and now adds it to the team too. A design you opened from Saved is only updated in the team when you switch it on, so nobody overwrites one by accident.
![before](assets/whatsnew/0.7.0-save-before.jpg)
![after](assets/whatsnew/0.7.0-save-after.jpg)

### Saved designs, easy to find
type: feature
The home page now has a Saved designs row with the team's latest designs and See all. See all, or Saved in the bottom bar, opens the new Saved page: a clean grid of pictures with quick filters for Stories, Posts, Highlights, Create and Templates, and your collections. Tap a design to open it. Press and hold one (or tap the ⋯ on its picture) to Duplicate, Rename, change Collections or Delete. Delete still asks first.
![before](assets/whatsnew/0.7.0-saved-before.jpg)
![after](assets/whatsnew/0.7.0-saved-after.jpg)

### A + button for something new
type: feature
The big Start from a photo buttons at the top of the home page made way for a round + button in the bottom corner, right where your thumb is. Tap it for Restock, Photo story or Collage from a photo, or New design for a blank design or a template. Restock from a photo is still one tap: Restock, Photo story and Collage have a camera button at the end of their row on the home page.
![before](assets/whatsnew/0.7.0-plus-before.jpg)
![after](assets/whatsnew/0.7.0-plus-after.jpg)

### The fresh look, for everyone
type: design
The fresh look is now Studio's look on every phone, and its switch is gone. It also got more polish: a soft wash of colour at the top of the home page, buttons with a little light on top, sheets that slide all the way up and land softly, chips that pop when you pick them, the preview that settles in when a tool opens, and a small greeting above the home title.
![before](assets/whatsnew/0.7.0-look-before.jpg)
![after](assets/whatsnew/0.7.0-look-after.jpg)

### Pop-ups keep the page still
type: fix
Scrolling inside All tools, a saved design's menu or any other pop-up used to scroll the page behind it too. Now the page behind stays where it was until you close the pop-up.

### The bottom bar, lined up
type: fix
The highlight in the bottom bar now takes the exact size of the tab you are on, so the icon and its label sit right in its middle. The bar has two tabs now, Home and Saved, with the + button beside it.
![before](assets/whatsnew/0.7.0-bar-before.jpg)
![after](assets/whatsnew/0.7.0-bar-after.jpg)

### A clearer What's New
type: design
This page opens with the newest version as one big card. Older versions sit in groups you open with a tap (0.1 to 0.5, then 0.6 to 0.10), and the chips at the top show only new features, fixes or design changes.
![before](assets/whatsnew/0.7.0-whatsnew-before.jpg)
![after](assets/whatsnew/0.7.0-whatsnew-after.jpg)

## 0.6.0 · 24 Oct 2026

### Search everything, right at the top
type: feature
The search box moved from the bottom of Saved to the top of the home page, so it is the first thing you see. It now finds everything in Studio: tools, templates, saved designs and collections, unfinished stories, and settings like Install Studio or Sign in. Arabic names work with or without harakat. Before you type, it shows your last searches and shortcuts such as Restock from a photo. On a phone it opens full screen and the Back button closes it.
![before](assets/whatsnew/0.6.0-search-before.jpg)
![after](assets/whatsnew/0.6.0-search-after.jpg)

### Your tools, pinned
type: feature
The home page now shows only the tools you pin. Tap All tools to see every tool, and tap the star to pin or unpin one. Pins are saved on this phone, not with the team login, so everyone can set up their own home. A new phone starts with Restock. A phone that already used Studio keeps Restock, Photo story and Collage, so their Start from a photo buttons are still one tap. Restock stays one tap from the top of the home page.
![before](assets/whatsnew/0.6.0-pins-before.jpg)
![after](assets/whatsnew/0.6.0-pins-after.jpg)

### Try the fresh look (preview)
type: design
A livelier Studio, for you to try before it becomes the default. Taps press in and spring back, pages fade into each other, and cards lift off the page on soft shadows. One bold blue marks the main button on every screen. When you save, a big tick pops over your story, and phones that support it give a short buzz. It started as a preview you switched on yourself; since 0.7.0 it is the look for everyone.
![before](assets/whatsnew/0.6.0-fresh-before.jpg)
![after](assets/whatsnew/0.6.0-fresh-after.jpg)

### A clearer “Saved!” tick
type: fix
The tick in the green circle after you save was grey and hard to see. It is white now.
![before](assets/whatsnew/0.6.0-tick-before.jpg)
![after](assets/whatsnew/0.6.0-tick-after.jpg)

## 0.5.0 · 24 Oct 2026

### Save in one tap
type: feature
On a phone, Save in the bottom bar now makes the full-quality picture straight away, like it already did on a computer. Before, it opened a sheet and you tapped Save a second time. That is one tap instead of two for every story. The sheet then shows your picture and the Also save to the team switch: turn it on and tap Add to the team, and it goes to Saved without making a second picture.
![before](assets/whatsnew/0.5.0-save-before.jpg)
![after](assets/whatsnew/0.5.0-save-after.jpg)

### Tools in groups, most used first
type: design
The home page lists tools under three small headings: Stories, Posts and covers, and Make anything. Restock, the job the team does most, moved from seventh to first, followed by Photo story and Collage. Create moved to the end because it is the free-design tool. The tools view now has two choices (list and grid) instead of three; if you had picked the small grid, you now see the grid. The line under the title is shorter too.
![before](assets/whatsnew/0.5.0-hub-before.jpg)
![after](assets/whatsnew/0.5.0-hub-after.jpg)

## 0.4.0 · 24 Oct 2026

### Combine shapes in Board
type: feature
Two new Board tools borrowed from Penpot, the open-source design app. Pick two or more shapes and tap Combine in the bar above them: Union joins them, Subtract cuts the top shape out, Intersect keeps only the overlap, Exclude removes it. The shapes stay editable (double-tap to move one), the bottom shape gives the colour, and Release gives them back.
![after](assets/whatsnew/0.4.0-combine-after.jpg)

### Components in Board
type: feature
Make a badge, price tag or logo lock-up once, then Add a copy wherever you need it. Change the main one and every copy updates. Words you type into a copy stay that copy's own, so one badge can say different things on each slide. Detach a copy to change it freely. Find it in the Design panel, the right-click menu and More › Components.
![after](assets/whatsnew/0.4.0-components-after.jpg)

## 0.3.0 · 24 Oct 2026

### Save in one tap after Quick start
type: feature
After you start a Restock, Photo story or Collage from a photo on the home page, a bar under the story says "Your photo is in." Tap Looks good · Save and the picture saves straight away, or Change words to edit first. That is one tap instead of two (Save, then Save again). The bar goes away as soon as you start editing.
![before](assets/whatsnew/0.3.0-quicksave-before.jpg)
![after](assets/whatsnew/0.3.0-quicksave-after.jpg)

### Bigger Text place pad
type: fix
The 9-spot pad that sets where the words sit on a Photo story is bigger on phones, so each spot is a full finger wide.
![before](assets/whatsnew/0.3.0-place-before.jpg)
![after](assets/whatsnew/0.3.0-place-after.jpg)

## 0.2.0 · 24 Oct 2026

### Highlight covers
type: feature
A new tool for the round covers on your Instagram highlights. Make a whole set at once: each cover is an icon (24 to pick from), a word or a photo, and they all share one look so they match. Tap + to add a cover; Save gives you one picture per cover. The dashed circle shows what Instagram will crop to.
![after](assets/whatsnew/0.2.0-highlight-after.jpg)

### Bigger Done buttons
type: fix
The Done button on the Photo, Words, Style and Layers sheets is bigger and easier to hit with a thumb, and so is the colour code box.
![before](assets/whatsnew/0.2.0-taps-before.jpg)
![after](assets/whatsnew/0.2.0-taps-after.jpg)

## 0.1.0 · 24 Oct 2026

### Quick start from a photo
type: feature
Tap Restock, Photo story or Collage at the top of the home page, take or pick a photo, and the tool opens with your photo already in. One step fewer for every restock story.
![before](assets/whatsnew/0.1.0-quick-before.jpg)
![after](assets/whatsnew/0.1.0-quick-after.jpg)

### What's New
type: feature
This page. Every Studio update gets a card here, and a dot on the home page tells you when there is something new.
![after](assets/whatsnew/0.1.0-whatsnew-after.jpg)

### Easier to tap
type: fix
The small buttons on the home page and in Create (view switch, Experimental, back, page +, Done) are now finger-sized.
![before](assets/whatsnew/0.1.0-taps-before.jpg)
![after](assets/whatsnew/0.1.0-taps-after.jpg)
