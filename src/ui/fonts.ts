// Bundled web fonts (SIL Open Font License / Apache 2.0, via @fontsource). Only latin woff2 files
// are included; they are emitted as hashed assets and precached by the service worker.
import cg500 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2?url';
import cg600 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2?url';
import cg500i from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2?url';
import inter400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
import inter500 from '@fontsource/inter/files/inter-latin-500-normal.woff2?url';
import inter600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?url';
import caveat500 from '@fontsource/caveat/files/caveat-latin-500-normal.woff2?url';
import caveat600 from '@fontsource/caveat/files/caveat-latin-600-normal.woff2?url';
import elite from '@fontsource/special-elite/files/special-elite-latin-400-normal.woff2?url';
import kalam from '@fontsource/kalam/files/kalam-latin-400-normal.woff2?url';
import gochi from '@fontsource/gochi-hand/files/gochi-hand-latin-400-normal.woff2?url';
import aurore from '@fontsource/la-belle-aurore/files/la-belle-aurore-latin-400-normal.woff2?url';

const FACES: [string, string, number, string][] = [
  ['Cormorant Garamond', cg500, 500, 'normal'],
  ['Cormorant Garamond', cg600, 600, 'normal'],
  ['Cormorant Garamond', cg500i, 500, 'italic'],
  ['Inter', inter400, 400, 'normal'],
  ['Inter', inter500, 500, 'normal'],
  ['Inter', inter600, 600, 'normal'],
  ['Caveat', caveat500, 500, 'normal'],
  ['Caveat', caveat600, 600, 'normal'],
  ['Special Elite', elite, 400, 'normal'],
  ['Kalam', kalam, 400, 'normal'],
  ['Gochi Hand', gochi, 400, 'normal'],
  ['La Belle Aurore', aurore, 400, 'normal'],
];

export function installFonts() {
  const css = FACES.map(
    ([family, url, weight, style]) =>
      `@font-face{font-family:'${family}';src:url(${url}) format('woff2');font-weight:${weight};font-style:${style};font-display:swap}`,
  ).join('\n');
  const el = document.createElement('style');
  el.id = 'albatross-fonts';
  el.textContent = css;
  document.head.appendChild(el);
}

export const FONT_URLS = FACES.map((f) => f[1]);
