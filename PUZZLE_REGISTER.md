# Puzzle Register

Every mandatory puzzle, its location, prerequisites, clue sources, solution, validation rule and
hint ladder. IDs are stable (`P01`…`P27`) and are used by the save format, the content files in
`src/content/`, the validators in `src/puzzles/logic/` and the tests in `tests/`.

Notation: **Req** = what must be true before the puzzle is reachable. **Gives** = state changes on
solve. Times are ship's time (CET) unless marked GMT.

Hints: each puzzle has 3 progressive hints (nudge → direction → near-solution) plus a full
explanation (the "solution" tier, behind a confirmation). Hint text lives with the puzzle
definition in `src/content/puzzles.ts` and is mirrored in this register.

---

## Chapter 1 — The Door Behind You

### P01 · Deck Plan Mosaic — promenade (spatial arrangement)
* **Req:** start of game. **Clues:** the tiles themselves (lines continue across edges; labels
  split across tiles; the compass tile says BOW ↑).
* **Interaction:** drag/tap 9 enamel tiles into a 3×3 frame. Tap a placed tile to return it.
* **Solution:** the unique arrangement reproducing the A-deck plan. On a full wrong frame the game
  says how many tiles are misplaced.
* **Gives:** Deck plan document (includes the rule *odd cabins to port, even to starboard* and
  the B-deck inset), objective "Find the way down to B deck".

### P02 · Frozen Luggage — cabin corridor (sliding blocks)
* **Req:** none (corridor is open). 6×6 sliding puzzle; the steward's trolley must slide out to
  the linen alcove (right edge, row 3) to clear the CREW ONLY door.
* **Layout** (row-major, `T` = trolley, minimal solution 14 moves, verified by BFS in tests):
  ```
  9 9 6 6 C 5
  . . 2 . C 5
  T T 2 . . 7
  B B 1 1 . 7
  4 3 3 A A 7
  4 . 8 8 . .
  ```
* **Gives:** access to B deck stair → wireless room. Trunk tags introduce passengers, including a
  plain black case labelled only "E. SORREL".

### P03 · Wireless Valves — wireless room (visual matching)
* **Clues:** Gran's wireless note: one of the two MH4s "has let the air in" (its silver getter has
  gone milky white); the SP4 "wears a hat" (top cap) and goes under the wire with the clip.
* **Solution:** MX40 → OSC (7-pin), SP4 → DET (5-pin with top-cap lead), good MH4 → AF (5-pin),
  PX4 → OUTPUT (4-pin). The milky MH4 is the decoy (rejected when the set is tested).

### P04 · Power Junction — wireless room (rotation network)
* 5×5 board of rotatable wire tiles; battery at row 3 left; receiver (LT) top-right, transmitter
  (HT) bottom-right; four indicator lamps. Rule: every tile connected to the battery, no loose
  ends. Unique solution (verified by exhaustive search in tests). Solved masks (N=1,E=2,S=4,W=8):
  ```
  6 14 10  8 4
  1  3 12  4 5
  2 14 11 11 9
  6 11 10 10 12
  3 10 10  8 1
  ```
* Followed by tuning the dial to **1330 kc/s** (frozen logbook: "Prof. Solberg asks we stand by on
  1330 kc/s") → first contact with Wren (00:51). End of Chapter 1.

## Chapter 2 — Ashdown Speaking

### P05 · The Piano Lid — lounge (frost wiping + observation)
* Wipe the frost off the painted piano lid, then say which of Wren's four statements is false.
* **Solution:** the ship beneath the albatross has **two** masts, not three.

### P06 · The Next Minute — radio (timeline + time zones)
* **Clue:** Gran's envelope 2 = Inquiry Appendix A (chronology, **GMT**; header note: ship's
  clocks kept CET = GMT+1). Wren's clock: 01:04. She wants a prediction for the next 5 minutes.
* **Solution:** "00:07 GMT — starboard forward engine stops" (= 01:07 ship). Trap: "01:07 GMT —
  gas cell 11 leaking" (that is 02:07 ship time).

### P07 · Fifty Years — wireless room (cross-time hiding place)
* Wren offers five hiding places; only one survives intact into 1989. Inspect them in the wreck.
* **Solution:** the **wall clock** (desk crushed, shelf collapsed, floor under ice, chart frame
  rotted). Wrong choices are recoverable. **Gives:** smoking-room key, sixpence, Wren's note.

## Chapter 3 — Forty Souls

### P08 · Silhouettes — radio + lounge evidence (deduction)
* Five passengers at the dark lounge windows (1–5). Wren sees: 1 fur hat · tea; 2 face in
  shadow · brandy; 3 headscarf · coffee; 4 face in shadow · notebook on the sill; 5 beret · cocoa.
* **Clues:** Finch's cloakroom note (hats: Lund fur, Vasseur beret, Fenwick borrowed headscarf,
  Krag bowler, Solberg none); bar chit "brandy — Cabin 4 — after midnight"; Appendix B (Krag =
  Cabin 4).
* **Solution:** window **4** (Professor Solberg).

### P09 · Cabin Six — corridor (6/9 deduction)
* Finch's master keys are in Cabin 6. The plates on two loose doors have spun.
* **Clue:** deck plan rule *odd to port, even to starboard*. Port side reads 1 3 5 7 **6** 11;
  starboard reads 2 4 **9** 8 10 12.
* **Solution:** the starboard door labelled **9** is really Cabin 6. (The port "6" is Cabin 9,
  which has a strange modern lock.)

### P10 · The Captain's Cipher — captain's cabin (crib-based cipher disc)
* Captain Brekke's private log line is enciphered with his personal disc (scrambled inner
  alphabet). Every plain entry in his log begins "ALBATROSS" — the crib.
* **Solution:** align the disc so the first word reads ALBATROSS (offset 11); plaintext:
  "ALBATROSS COMPASS FALSE WE ARE OVER LAND DAHL WILL NOT TURN".

## Chapter 4 — Misdirection

### P11 · The Stacked Deck — lounge, Vasseur's trunk (pattern)
* Vasseur's notebook: each card is three more than the last (A=1 … K=13, wrap), suits cycle
  Clubs-Hearts-Spades-Diamonds ("CHaSeD").
* Fan: 4♣ ? 10♠ K♦ ? 6♥ 9♠ ? 2♣ 5♥ ? J♦ → **7♥, 3♣, Q♦, 8♠** opens the four-card lock.
* Stage 2 (radio): Vasseur shows Wren the K♣ — the next card is **3♥**.

### P12 · The Mirror Box — Vasseur's apparatus (beam routing)
* 5×5 box (`M` rotatable mirror, `X` velvet block, `S` lantern slide, `.` empty):
  `MXM.M / XMMM. / .M.XM / MMSMX / M.MM.`. Beam enters from the left of row 2; it must pass the
  slide and leave through the top above column 3 (the lens).
* Verified by exhaustive search over all 2^15 mirror settings: exactly **two** beam paths work, e.g.
  (2,1)\ (3,1)/ (3,0)/ (4,0)\ (4,2)/ (1,2)/ (1,3)/. Either is accepted.
* **Gives:** the projected "Rat Run" map of maintenance ways (used in both times).

### P13 · The Rat Run — radio (time-step route planning)
* Plan Wren's minute-by-minute route L(ounge hatch) → C(ontrol car) avoiding patrols.
* Rota: Rye (steward) M→P→G→P…; Dale (rigger) K3→K2→K1→K2…; Wren starts at L at minute 0.
* Graph: L–P, P–G, G–K1, K1–K2, K2–K3, K3–C, P–M, M–K2.
* Unique shortest plan (8 min): **wait, P, M, K2, M, K2, K3, C**. Any safe plan ≤ 12 minutes is
  accepted.

## Chapter 5 — Cabin Nine

### P14 · Sorrel's Hand — handwriting comparison
* Luggage tag "E. Sorrel · Cabin 9 · Tromsø" has three features: looped S, straight-stemmed 9,
  steeply slashed ø. Only Professor Solberg's letter shows all three. **Solution:** Solberg.

### P15 · Standing Wave — Cabin 9 receiver (analogue tuning)
* Knobs FREQ, AMP, PHASE. Frozen 1989 dial shows FREQ 7. Equal amplitudes (5) make true nodes;
  PHASE **210°** puts the nodes on the professor's brass pins.

### P16 · The Lullaby Bird — lounge automaton (music sequencer)
* Restore 8 missing pins on a 16-step cylinder. Melody: `E A C B A E G A | C D E D C A B A`.
* Sources: Gran's letter (notes 1–5), the base plate (notes 7–12), Wren humming (notes 13–16).
* **Gives:** a tiny brass key engraved with a wren; the lullaby reveal.

### P17 · The Brass Wren — your brooch (puzzle box)
* Sequence: slide the crest ("tip your hat before you knock"), press the eye, wind the tail twice
  with the tiny key, lift the bird's **left** wing (on the viewer's right).
* **Gives:** the professor's note, 51 years old, signed by Wren — the grandmother reveal.

## Chapter 6 — The Keel

### P18 · The Catwalk — keel (rule-based path)
* Rigging log: ▲ (replaced) always safe; ■ (temporary brace) never; ● (original) unsafe only
  between frames 95 and 140. Safe route e.g. 80C-80P-95P-110P-110C-125C-125S-140S-155S-170S-170C.

### P19 · Ballast Trim — keel (balance)
* Bags (kg) at frames 35/80/125/170/205, port/starboard: 500/450, 600/650, 700/550, 400/350,
  300/450. Arms from centre of lift (frame 118). Ice excess: pitch +47,900 kg·m (nose-down),
  roll +1,800 kg·m (starboard, lateral arm 6 m). Release 1,600–1,900 kg, residual pitch within
  ±600, roll within ±500. **Unique solution:** 125P, 125S, 205S.

### P20 · The Valve Cords — keel (ladder tracing with cross-time info)
* Seven cords (cells 4–10) → handles A–G through 12 levels of crossbars; levels II, VI and X are
  under ice in 1989, described by Wren. **Solution:** cell 7 → handle **E** (ignoring Wren's
  crossbars gives the wrong handle D).

## Chapter 7 — Dead Reckoning

### P21 · The Star Wheel — planisphere (instrument)
* Set 26 January against 03:00, find the bright star dead ahead (Procyon, Twins above-right),
  read its azimuth with the arm: **233°**. Compass shows 270 → deviation **+37°**.

### P22 · Two Lights — map (identification + cross bearings)
* Light A: three flashes every 15 s, compass 097 → Ravnvik Light, true 060. Light B: one red
  flash every 5 s, compass 342 → Ravntind air beacon, true 305. Lines cross at the ship (P).

### P23 · The Course — map (protractor + conversion)
* True course P → Kvitfjord landing ice = 044°. Compass course = 044 + 37 = **081**.

## Chapter 8 — The Card

### P24 · The Hatch Gears — keel forward (gear train)
* Drive r2 at (0,0), latch r2 at (13,−3). Pegs A(5,0), B(9,0), C(5,−5), E(9,−3); gears r1, r2,
  r3, r3. **Solution:** A=r3, E=r2 → latch turns anticlockwise (opens). B is a decoy.

### P25 · The Last Minute — control car (search + rotation)
* Find the frozen clock (3:12), altimeter (1,580 m), port-aft telegraph (FULL ASTERN), chart, and
  the course card "180". Rotate the card: it is "081", in Wren's hand.

### P26 · Appendix C — documents (timeline matching)
* Match each GMT anomaly to your own Radio Log entry (+1 h). Anomalies: 23:51 no-call-sign station
  ↔ 00:51 first contact; 00:04 engine foretold ↔ 01:04; 00:24 captain's log ↔ 01:24; 00:52
  disturbance ↔ 01:52; 01:31 ballast ↔ 02:31; 01:48 cell 7 ↔ 02:48. Remaining (02:05 card, 02:08
  astern, 02:12 impact) are still in your future.

## Chapter 9 — Eighty-One

### P27 · Eighty-One — finale (three stages)
1. **The card:** digits 081 and written so it cannot be read as another course (in words, or
   underlined). Plain "081"/"081°" replays the record (recoverable).
2. **The descent:** choose vent rate and the kilometre to begin descending so the profile clears
   the Skarv saddle (1,240 m at km 3.5) and touches down on the fjord ice (km 8.5–11.0).
3. **The landing:** wind from the north-west; turn the bow to port with starboard-aft ahead and
   port engines astern (starboard-forward engine is dead since 01:07); turning moment ≥ 3, net
   thrust within ±0.5.

---

## Optional discoveries
* Personal effects of the people aboard (journal: *The Forty*), Pip's drawings, the smoking-room
  survivors' initials, Pell's de-icing memo, Wren's crossword.
