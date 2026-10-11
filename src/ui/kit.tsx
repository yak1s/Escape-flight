import type { ComponentChildren, JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import { audio } from '../engine/audio';

// ------------------------------------------------------------------ icons (inline SVG)
const P = {
  radio: 'M6 9h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zm1-3l9-3M8 14.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M16 13h2M16 16h2',
  journal: 'M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 0v18M9 7h6M9 10h6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7l7 7',
  eye: 'M2 12s4-7 10-7s10 7 10 7s-4 7-10 7S2 12 2 12zm10-3a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  map: 'M3 6l6-3l6 3l6-3v15l-6 3l-6-3l-6 3zM9 3v15M15 6v15',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  hint: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  clue: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 16h6',
  settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3a1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  check: 'M5 12l5 5l9-11',
  play: 'M7 5l12 7l-12 7z',
  undo: 'M9 14l-5-5l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  rotate: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  sound: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  mute: 'M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6',
  wifi: 'M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01',
  star: 'M12 3l2.7 5.6l6.1.9l-4.4 4.3l1 6.1L12 17l-5.4 2.9l1-6.1L3.2 9.5l6.1-.9z',
  replay: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
};
export type IconName = keyof typeof P;
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}

// ------------------------------------------------------------------ buttons
export function Btn(props: JSX.HTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'ghost' | 'danger'; small?: boolean; block?: boolean; sfx?: string | false; disabled?: boolean }) {
  const { kind, small, block, sfx = 'ui_tap', class: cls, onClick, ...rest } = props;
  return (
    <button
      type="button"
      class={['btn', kind, small && 'small', block && 'block', cls].filter(Boolean).join(' ')}
      onClick={(e) => {
        if (sfx) audio.sfx(sfx, 0.7);
        (onClick as ((e: Event) => void) | undefined)?.(e);
      }}
      {...rest}
    />
  );
}

export function IconBtn({ icon, label, onClick, badge, testid }: { icon: IconName; label: string; onClick: () => void; badge?: boolean; testid?: string }) {
  return (
    <button
      type="button"
      class="icon-btn"
      aria-label={label}
      title={label}
      data-testid={testid}
      onClick={() => {
        audio.sfx('ui_tap', 0.6);
        onClick();
      }}
    >
      <Icon name={icon} />
      {badge && <span class="badge" />}
    </button>
  );
}

// ------------------------------------------------------------------ sheet / overlay
export function Sheet({
  title,
  kicker,
  onClose,
  children,
  actions,
  testid,
}: {
  title: string;
  kicker?: string;
  onClose: () => void;
  children?: ComponentChildren;
  actions?: ComponentChildren;
  testid?: string;
}) {
  useEscape(onClose);
  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose()} data-testid={testid}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div class="sheet-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            {kicker && <div class="kicker">{kicker}</div>}
            <h2>{title}</h2>
          </div>
          <IconBtn icon="close" label="Close" onClick={onClose} testid="sheet-close" />
        </div>
        <div class="sheet-body">{children}</div>
        {actions && <div class="sheet-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function useEscape(fn: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fn();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fn]);
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; t: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div class="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={o.v === value} class={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>
          {o.t}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <input type="checkbox" class="toggle" aria-label={label} checked={checked} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} />;
}

export function Ornament() {
  return (
    <svg class="rule-orn" viewBox="0 0 160 14" aria-hidden="true">
      <path d="M0 7h62M98 7h62" stroke="currentColor" stroke-width="1" />
      <path d="M80 1l6 6l-6 6l-6-6z" fill="none" stroke="currentColor" stroke-width="1.2" />
      <circle cx="66" cy="7" r="1.6" fill="currentColor" />
      <circle cx="94" cy="7" r="1.6" fill="currentColor" />
    </svg>
  );
}
