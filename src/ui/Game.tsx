import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useApp, useGame } from './context';
import { Btn, Icon, IconBtn } from './kit';
import type { CloseupAction, GameEvent, Hotspot } from '../engine/types';
import { chapterById, docById, itemById, puzzleById, sceneById } from '../content';
import { hotspotBehaviour, radioPuzzles, whereNow } from '../engine/interact';
import { audio, haptic } from '../engine/audio';
import { SceneView } from './SceneView';
import { CloseupSheet, ItemSheet } from './Closeup';
import { DocViewer } from './DocViewer';
import { DialogueOverlay } from './Dialogue';
import { Journal } from './Journal';
import { RadioPanel } from './RadioPanel';
import { ItemsPanel, TravelPanel } from './Panels';
import { PuzzleFrame } from './PuzzleFrame';
import { ChapterCard } from './ChapterCard';
import { GameMenu } from './GameMenu';

export type Overlay =
  | { k: 'closeup'; hotspot: Hotspot }
  | { k: 'item'; id: string }
  | { k: 'doc'; id: string }
  | { k: 'puzzle'; id: string }
  | { k: 'journal'; tab?: string }
  | { k: 'radio' }
  | { k: 'travel' }
  | { k: 'items' }
  | { k: 'menu' }
  | { k: 'replay'; id: string };

export function Game({ onEnding }: { onEnding: () => void }) {
  const app = useApp();
  const { state, store } = useGame();
  const [stack, setStack] = useState<Overlay[]>([]);
  const [pulse, setPulse] = useState(0);
  const [shimmer, setShimmer] = useState(0);
  const endingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((o: Overlay) => setStack((s) => [...s, o]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const clear = useCallback(() => setStack([]), []);

  // React to game events: sounds, toasts, the time-shimmer.
  useEffect(
    () =>
      store.onEvents((events: GameEvent[]) => {
        for (const e of events) {
          if (e.kind === 'sfx') audio.sfx(e.value);
          else if (e.kind === 'toast') app.toast(e.value);
          else if (e.kind === 'shimmer') setShimmer((n) => n + 1);
          else if (e.kind === 'item') {
            audio.sfx('pickup');
            app.toast(`Added to Items: ${itemById(e.value).name}`);
          } else if (e.kind === 'doc') app.toast(`New evidence: ${docById(e.value).title}`); else if (e.kind === 'say') haptic(app.settings, [10, 40, 10]);
        }
      }),
    [store, app],
  );

  // Music follows the chapter; the wreck's wind is always underneath.
  useEffect(() => {
    const ch = chapterById(state.chapter);
    audio.music(ch.music.startsWith('music_') ? ch.music : null);
    audio.ambience('amb_wreck');
  }, [state.chapter]);

  const showCard = !state.chapterCards.includes(state.chapter) && !state.ending;
  const dialogueId = !showCard && stack.length === 0 && state.queue.length ? state.queue[0] : null;

  // When an ending has been reached and the last words are spoken, go to the ending screen.
  useEffect(() => {
    if (state.ending && !state.queue.length && !dialogueId && stack.length === 0) {
      endingTimer.current = setTimeout(onEnding, 600);
      return () => clearTimeout(endingTimer.current!);
    }
    return undefined;
  }, [state.ending, state.queue.length, dialogueId, stack.length, onEnding]);

  const openPuzzle = useCallback(
    (id: string) => {
      const def = puzzleById(id);
      if (def.onOpen) store.dispatch({ type: 'effects', effects: def.onOpen, once: `open:${id}` });
      audio.sfx('ui_open', 0.6);
      push({ k: 'puzzle', id });
    },
    [store, push],
  );

  const openDoc = useCallback(
    (id: string) => {
      store.dispatch({ type: 'effects', effects: [{ doc: id }] });
      store.dispatch({ type: 'readDoc', id });
      audio.sfx('page', 0.7);
      push({ k: 'doc', id });
    },
    [store, push],
  );

  const tapHotspot = useCallback(
    (h: Hotspot) => {
      store.dispatch({ type: 'seen', id: `${state.scene}:${h.id}` });
      if (h.firstEffects) store.dispatch({ type: 'effects', effects: h.firstEffects, once: `first:${state.scene}:${h.id}` });
      const b = hotspotBehaviour(store.state, h);
      if (b.type === 'puzzle') openPuzzle(b.id);
      else if (b.type === 'goto') {
        audio.sfx('door', 0.5);
        store.dispatch({ type: 'goto', scene: b.scene });
      } else if (b.type === 'doc') openDoc(b.id);
      else if (b.type === 'closeup') {
        audio.sfx('ui_open', 0.5);
        push({ k: 'closeup', hotspot: h });
      }
    },
    [store, state.scene, openPuzzle, openDoc, push],
  );

  const runAction = useCallback(
    (a: CloseupAction) => {
      if (a.sfx) audio.sfx(a.sfx);
      if (a.effects.length) store.dispatch({ type: 'effects', effects: a.effects });
      if (a.close !== false) pop();
      if (a.doc) openDoc(a.doc);
      if (a.puzzle) openPuzzle(a.puzzle);
      if (a.goto) {
        audio.sfx('door', 0.5);
        store.dispatch({ type: 'goto', scene: a.goto });
        clear();
      }
    },
    [store, pop, openDoc, openPuzzle, clear],
  );

  // Automation hooks (only with ?e2e in the URL): open overlays through the real UI paths.
  useEffect(() => {
    if (!/e2e/.test(location.search)) return;
    window.__albatross = window.__albatross || {};
    window.__albatross.openPuzzle = openPuzzle;
    window.__albatross.openDoc = openDoc;
    window.__albatross.closeAll = clear;
  }, [openPuzzle, openDoc, clear]);

  const scene = sceneById(state.scene);
  const ch = chapterById(state.chapter);
  const radioWaiting = state.queue.length > 0 || radioPuzzles(state).length > 0;
  const top = stack[stack.length - 1];
  const hasRadio = state.items.includes('walkie') || state.solved.P04;

  return (
    <div class="screen game" data-testid="game" data-scene={state.scene} data-chapter={state.chapter}>
      <div class="topbar">
        <IconBtn icon="menu" label="Menu" onClick={() => push({ k: 'menu' })} testid="open-menu" />
        <div class="where">
          <div class="ch">
            Chapter {ch.n} · {state.clock}
          </div>
          <div class="sc" data-testid="scene-title">
            {scene.title}
          </div>
        </div>
        <SaveIndicator />
        {hasRadio && <IconBtn icon="radio" label="Radio" badge={radioWaiting} onClick={() => push({ k: 'radio' })} testid="open-radio" />}
        <IconBtn icon="journal" label="Journal" onClick={() => push({ k: 'journal' })} testid="open-journal" />
      </div>
      <div class="stage">
        <SceneView sceneId={state.scene} state={state} onTap={tapHotspot} pulse={pulse} outlines={app.settings.outlines} />
        {shimmer > 0 && <div key={shimmer} class="shimmer-overlay" onAnimationEnd={() => setShimmer(0)} />}
      </div>
      <div class="bottombar">
        <Btn
          small
          onClick={() => {
            setPulse((n) => n + 1);
            audio.sfx('shimmer', 0.25);
          }}
          data-testid="look-around"
        >
          <Icon name="eye" size={18} /> Look around
        </Btn>
        <Btn small onClick={() => push({ k: 'travel' })} data-testid="open-travel">
          <Icon name="map" size={18} /> Go to
        </Btn>
        <Btn small onClick={() => push({ k: 'items' })} data-testid="open-items">
          <Icon name="bag" size={18} /> Items
        </Btn>
      </div>

      {stack.map((o, i) => {
        const active = i === stack.length - 1;
        const props = { key: `${o.k}-${i}` };
        if (o.k === 'closeup') return <CloseupSheet {...props} hotspot={o.hotspot} onClose={pop} onAction={runAction} active={active} />;
        if (o.k === 'item') return <ItemSheet {...props} id={o.id} onClose={pop} onAction={runAction} />;
        if (o.k === 'doc') return <DocViewer {...props} id={o.id} onClose={pop} />;
        if (o.k === 'puzzle') return <PuzzleFrame {...props} id={o.id} onClose={() => (store.state.solved[o.id] ? clear() : pop())} onDoc={openDoc} />;
        if (o.k === 'journal') return <Journal {...props} tab={o.tab} onClose={pop} onDoc={openDoc} onReplay={(id) => push({ k: 'replay', id })} />;
        if (o.k === 'radio')
          return (
            <RadioPanel
              {...props}
              onClose={pop}
              onPuzzle={(id) => {
                pop();
                openPuzzle(id);
              }}
              onLog={() => {
                pop();
                push({ k: 'journal', tab: 'radio' });
              }}
            />
          );
        if (o.k === 'travel')
          return (
            <TravelPanel
              {...props}
              onClose={pop}
              onGo={(id) => {
                if (id !== state.scene) {
                  audio.sfx('door', 0.4);
                  store.dispatch({ type: 'goto', scene: id });
                }
                clear();
              }}
              onRadio={() => {
                pop();
                push({ k: 'radio' });
              }}
              onItems={() => {
                pop();
                push({ k: 'items' });
              }}
            />
          );
        if (o.k === 'items') return <ItemsPanel {...props} onClose={pop} onItem={(id) => push({ k: 'item', id })} />;
        if (o.k === 'menu') return <GameMenu {...props} onClose={pop} onJournal={() => push({ k: 'journal' })} />;
        if (o.k === 'replay') return <DialogueOverlay {...props} id={o.id} replay onDone={pop} />;
        return null;
      })}

      {dialogueId && <DialogueOverlay key={dialogueId} id={dialogueId} onDone={() => undefined} />}
      {showCard && (
        <ChapterCard
          chapterId={state.chapter}
          onContinue={() => {
            store.dispatch({ type: 'chapterCard', id: state.chapter });
          }}
        />
      )}
      {top?.k === undefined && !dialogueId && !showCard && <WhereNowHint />}
    </div>
  );
}

function SaveIndicator() {
  const { store } = useGame();
  const s = store.saveStatus;
  if (s === 'error')
    return (
      <span class="save-ind err" role="alert" title={store.saveError || ''} data-testid="save-status" data-status="error">
        ⚠ Not saved
      </span>
    );
  return (
    <span class="save-ind" data-testid="save-status" data-status={s} aria-live="polite">
      {s === 'saving' ? 'Saving…' : s === 'saved' ? '✓ Saved' : ''}
    </span>
  );
}

/** Gentle nudge if the player has been idle in a scene with nothing obvious to do. */
function WhereNowHint() {
  const { state } = useGame();
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 240000);
    return () => clearTimeout(t);
  }, [state.updatedAt, state.scene]);
  const w = whereNow(state);
  if (!show || !w) return null;
  return (
    <div class="toasts" style={{ top: 'auto', bottom: 'calc(80px + var(--safe-bottom))' }}>
      <div class="toast" style={{ animation: 'none', pointerEvents: 'auto' }} onClick={() => setShow(false)}>
        Next: {w.text}
      </div>
    </div>
  );
}
