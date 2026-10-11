import { useEffect } from 'preact/hooks';
import { chapterById } from '../content';
import type { ChapterId } from '../engine/types';
import { Btn, Ornament } from './kit';
import { audio } from '../engine/audio';

export function ChapterCard({ chapterId, onContinue }: { chapterId: ChapterId; onContinue: () => void }) {
  const ch = chapterById(chapterId);
  useEffect(() => {
    audio.sfx('chapter', 0.7);
  }, [chapterId]);
  return (
    <div class="chapter-card" role="dialog" aria-label={`Chapter ${ch.n}: ${ch.title}`} data-testid="chapter-card" data-chapter={chapterId}>
      <div class="num">Chapter {ch.n}</div>
      <h1>{ch.title}</h1>
      <div class="sub">{ch.subtitle}</div>
      <Ornament />
      <div class="epi">{ch.epigraph}</div>
      <div class="intro">
        {ch.intro.map((p) => (
          <p>{p}</p>
        ))}
      </div>
      <div style={{ marginTop: 18 }}>
        <Btn kind="primary" onClick={onContinue} data-testid="chapter-continue">
          Continue
        </Btn>
      </div>
    </div>
  );
}
