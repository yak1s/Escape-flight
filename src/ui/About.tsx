import { useApp } from './context';
import { IconBtn } from './kit';

export function About() {
  const app = useApp();
  return (
    <div class="screen page" data-testid="about">
      <div class="page-head">
        <IconBtn icon="back" label="Back" onClick={() => app.go('title')} />
        <h2>How to play</h2>
      </div>
      <div class="scroll" style={{ flex: 1 }}>
        <div class="center-col prose" style={{ paddingBottom: 40 }}>
          <div class="section">
            <h3>The basics</h3>
            <p>Tap things in each scene to look closer, pick things up and solve puzzles. Tap <b>Look around</b> to make every interactive spot shimmer.</p>
            <p>
              <b>Radio</b> (top bar) is how you talk to Wren. When it glows, she has something to say. Some puzzles are solved over the radio — the Radio panel lists
              them.
            </p>
            <p>
              <b>Journal</b> keeps your current objectives, every document you have found, the people you have met, and a log of every radio conversation (tap one to
              replay it).
            </p>
            <p>
              Each puzzle has a <b>Clues</b> drawer with the documents you need and a <b>Hint</b> button with three gentle hints, then the full solution. Using hints never
              locks you out of anything.
            </p>
            <p>The game saves automatically after everything you do. You can leave at any moment and continue exactly where you were.</p>
          </div>
          <div class="section">
            <h3>Sound</h3>
            <p>Music and sound help the atmosphere but are never required: everything you hear is also written down.</p>
          </div>
          <div class="section">
            <h3>Credits</h3>
            <p>
              Story, puzzles, art, music and code were created for this game. All illustrations are original vector drawings; all music and sound effects were
              synthesised by the project's own script. Fonts: Cormorant Garamond, Inter, Caveat, Special Elite, Kalam, Gochi Hand and La Belle Aurore (SIL Open Font
              License / Apache 2.0), bundled locally.
            </p>
            <p class="muted">
              The great aurora of 25–26 January 1938 and the geomagnetic storm of 13–14 March 1989 were real. The airship Albatross, her company, crew and passengers, and
              the Ravnfjell, Ravnbreen and Kvitfjord are fictional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
