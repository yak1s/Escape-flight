# ALBATROSS — A Frozen Signal · Game Design

> A solo, offline, touch-first escape adventure for Android (PWA). Target length: 3–4 hours.
> This document describes the game **as implemented**. Puzzle-level detail (answers, hints,
> dependencies) lives in `PUZZLE_REGISTER.md`.

## 1. Premise (what the player knows at the start)

**Ravnbreen Glacier, Norway — 13 March 1989, 23:41.** Your grandmother died last autumn. Her
solicitor delivered a tin box and a letter in her handwriting: *go up the Ravnbreen on the night
of the thirteenth, take the box, go to the wireless room — someone will need you.* The glacier
has been retreating, and last summer it exposed part of the airship **NC-3 Albatross**, lost with
34 souls on 26 January 1938.

You reach the wreck as a blizzard hits and an aurora blazes overhead. You squeeze through an ice
cave into the passenger deck — and the cave collapses behind you. You are sealed inside.

## 2. The secret story (spoilers)

* The night of **25–26 January 1938** (a real, historic great aurora) and the night of
  **13–14 March 1989** (the real great geomagnetic storm) resonate. Professor **Ingrid Solberg**
  smuggled an experimental "Resonance Receiver" aboard under a false passenger name,
  **"E. Sorrel" (Cabin 9)**. During the storm it links the Albatross's wireless room in 1938 with
  the wreck's wireless room in 1989.
* When you repair the wreck's radio you reach **Winifred "Wren" Ashdown**, the 21-year-old junior
  wireless operator, on the ship's last night. Her clock and yours run together, 00:51 → 03:12.
* What Wren does in 1938 changes the wreck around you *instantly* (objects she hides appear for
  you; doors she unbolts open).
* **Twist 1 (Ch 2):** Wren is in 1938; you are in 1989.
* **Twist 2 (Ch 5):** Wren is your grandmother. Clues: identical handwriting (same font on the
  letter and Wren's notes), the lullaby, "Sparks", the surname Strand, and finally the brass wren
  brooch you've carried since minute one — Wren hides a note in hers, and you find it, 51 years
  old, inside yours.
* **Twist 3 (Ch 8, the major twist):** The 1938 Board of Inquiry blamed the crash on sabotage by
  the never-identified "E. Sorrel". Its sealed **Appendix C** lists the "unexplained actions":
  a station with no call sign, a foretold engine failure, the captain's log taken, a staged
  disturbance, ballast released at frames 125 & 205, gas cell 7 vented, a course card reading
  **180** at the helm, the port-aft engine at FULL ASTERN. Every single one is something *you*
  told Wren to do. You are the "Voice in the Pipes" of the survivors' legend. There was no
  saboteur. There was a near-perfect rescue — undone because the course you will give, **081**,
  was written on a loose card and read upside down by the helmsman as **180** (exactly the turn
  the officers expected), sending the ship south into the Ravnkammen ridge.
* **Finale:** Your grandmother's last envelope admits she never dared change the night, for fear
  of erasing her own family. She leaves the choice to you. **Rewrite the night** (true ending: you
  compute the course, have it written in words, plan the descent and the landing; the Albatross
  lands on the frozen Kvitfjord, all 39 real souls survive, the wreck dissolves around you at
  03:12 and you stand on an empty glacier at dawn) or **Let the record stand** (bittersweet
  ending; can be revisited).
* "E. Sorrel" never existed, so the true count aboard was 39, not 40.

## 3. Structure

| # | Chapter | Present-day goal | Wren's goal | Puzzles |
|---|---------|------------------|-------------|---------|
| 1 | The Door Behind You | Reach the wireless room and revive the radio | — | P01–P04 |
| 2 | Ashdown Speaking | Convince Wren you are real | Test the strange voice | P05–P07 |
| 3 | Forty Souls | Find the professor; decode the captain's log | Get proof the ship is lost | P08–P10 |
| 4 | Misdirection | Open the illusionist's trunk; find the Rat Run | Reach the control car unseen | P11–P13 |
| 5 | Cabin Nine | Unmask "E. Sorrel"; save the failing link | Hide the professor's note | P14–P17 |
| 6 | The Keel | Cross the frozen keel | Stop the icing ship falling | P18–P20 |
| 7 | Dead Reckoning | Fix the ship's true position | Find a safe course | P21–P23 |
| 8 | The Card | Reach the control car; read Appendix C | — | P24–P26 |
| 9 | Eighty-One | The final decision and manoeuvre | Land the ship | P27 (3 stages) |

27 mandatory puzzle encounters (P27 has three stages) plus optional discoveries.

### Pacing

Each chapter opens with a title card and a short narrative, alternates exploration of the frozen
wreck with radio conversations, and ends on a reveal. Estimated times: Ch1 30 min, Ch2 25, Ch3 30,
Ch4 30, Ch5 35, Ch6 30, Ch7 30, Ch8 25, Ch9 20 ≈ 4 h 15 min for a first-time careful player,
≈ 3 h with frequent hints.

## 4. Characters

**Present (1989)** — *You*: the unnamed grandchild (gender-neutral). Grandmother signs her
letter "Gran" and calls you "Sparks".

**1938 (the Albatross, 18 Jan 1938 crew list + passengers)**
* **Wren (Winifred Ashdown)**, 21, junior wireless operator, Hull-born daughter of clockmaker
  J. Ashdown. Funny, brave, sceptical. Your guide.
* **Ola Strand**, 24, rigger — the man she will marry (your grandfather).
* **Prof. Ingrid Solberg**, 46, aurora physicist (Cabin 7); secretly also "E. Sorrel" (Cabin 9).
* **Augustus Pell**, Director of Northern Crown Airship Co.; cut the de-icing heaters to save
  money. **Pip (Philippa) Pell**, 9, his daughter, who draws everything.
* **Madame Odile Vasseur**, illusionist; teaches misdirection.
* **Capt. Halvard Brekke** (injured at 00:20), **First Officer Rolf Dahl** (sceptic in command),
  **Navigator Ivar Moen**, **Chief Engineer Nils Haugen**, **Chief Steward Percival Finch**.
* **Mrs Greta Lund**, **Mr Teodor Krag**, **Miss Ada Fenwick** (journalist) and others listed in
  Appendix B.

Original survivors (the record): Ashdown, Strand, Finch, Pip Pell, Vasseur, Lund.

## 5. Time conventions (important for puzzles)

* Ship's clocks keep **Central European Time** (= Norwegian local time). The British Inquiry
  report uses **GMT** (one hour behind). The player's 1989 watch also shows CET, so it matches
  Wren's clock.
* Key moments (ship time): first contact 00:51 · engine prediction 01:04 (engine stops 01:07) ·
  sixpence 01:12 · captain's log 01:24 · Vasseur's diversion 01:52 · ballast 02:31 · cell 7 02:48 ·
  star fix 03:00 · course card 03:05 · port-aft astern 03:08 · 03:12 impact (record) or landing.

## 6. Geography (fictional, self-consistent)

Ship's position at the 03:00 fix is **P**. Ravnvik (village + lighthouse, Fl(3) W 15s) lies at the
head of the frozen **Kvitfjord** to the north-east; the landing ice is at true bearing 044° from
P, 18 km. The **Skarv saddle** (1,240 m) lies on that route 6 km out. **Ravntind** peak (1,720 m)
with an air beacon (Fl R 5s) is north-west. The **Ravnkammen** ridge and the Ravnbreen glacier
(1,580 m), where the record says the ship struck, lie south-east (true 143° from P). Magnetic
compass deviation that night: **+37°** (compass reads 37° more than true). Compass course to the
landing ice: 044 + 37 = **081**. Upside down, "081" reads "180".

## 7. Core mechanics & interaction model

* **Scenes**: illustrated SVG locations in the frozen wreck with tappable hotspots (always
  touch-sized; a "Look around" button pulses every hotspot; optional permanent outlines in
  Settings).
* **Closeups**: inspect objects; take items; use items contextually (no "combine anything with
  anything" guessing).
* **Radio**: Wren's conversations are scripted dialogues with occasional choices. A glowing radio
  icon means Wren has something to say. Every conversation is kept in the Radio Log and can be
  replayed.
* **Cross-time actions**: some answers are "told to Wren"; her actions change the present
  (shimmer effect + sound).
* **Journal**: Objectives (always says what to do next), Evidence (all documents), People, Radio
  Log, Items, Deck plan.
* **Puzzles**: full-screen interactive panels with a Clues drawer (the documents relevant to that
  puzzle), progressive hints (3–4 tiers) and a final full explanation.
* **Saves**: automatic, local (IndexedDB), with rolling backup and export/import.

## 8. Art & audio direction

* **Palette — "Frost & Brass"**: present-day scenes in deep indigo, glacier teal and ice white,
  lit by aurora greens and violets; brass (#c9a45c) and mahogany details under frost. 1938
  material (photos, Wren's world) in warm amber/sepia. Reveals shift the palette warm.
* **Typography**: Cormorant Garamond (display), Inter (UI), Special Elite (official documents),
  Caveat (Wren *and* Gran — deliberately the same hand), Kalam / La Belle Aurore / Gochi Hand for
  other writers.
* **Audio**: all procedurally synthesised and bundled (see `public/audio/CREDITS.txt`):
  the Clockmaker's Lullaby (music box) as the recurring theme, wind/ice ambience, radio static,
  mechanical SFX. Audio is never required: every audio clue has a visual/text equivalent.

## 9. Accessibility & comfort

Text size option, reduced motion (respects the OS setting), hotspot outlines, no flashing above
1 Hz (the lighthouse light blinks slowly), no jump scares, no timers that can fail the game, all
dialogue is text and replayable, music/SFX volume and mute, haptics toggle.

## 10. Endings

* **Eighty-One (true ending)** — reached by solving the finale.
* **The Record** — choose to let history stand. Afterwards you may return to the decision.

Both endings mark the save "completed"; the title screen then offers *Return to the final
decision* and *New Game*.
