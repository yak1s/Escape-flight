import type { FunctionComponent } from 'preact';
import type { PuzzleProps } from './types';
import { Mosaic, Rush, Valves, Net } from './ch1';
import { Piano, NextMinute, Hiding } from './ch2';
import { Silhouettes, CabinSix, Cipher } from './ch3';
import { Stack, Mirror, RatRun } from './ch4';
import { Handwriting, Wave, Lullaby, Brooch } from './ch5';
import { Catwalk, Ballast, Cords } from './ch6';
import { Planisphere, Lights, Course } from './ch7';
import { Gears, Search, Appendix } from './ch8';
import { Finale } from './finale';

export const PUZZLE_COMPONENTS: Record<string, FunctionComponent<PuzzleProps>> = {
  mosaic: Mosaic,
  rush: Rush,
  valves: Valves,
  net: Net,
  piano: Piano,
  nextminute: NextMinute,
  hiding: Hiding,
  silhouettes: Silhouettes,
  cabinsix: CabinSix,
  cipher: Cipher,
  stack: Stack,
  mirror: Mirror,
  ratrun: RatRun,
  handwriting: Handwriting,
  wave: Wave,
  lullaby: Lullaby,
  brooch: Brooch,
  catwalk: Catwalk,
  ballast: Ballast,
  cords: Cords,
  planisphere: Planisphere,
  lights: Lights,
  course: Course,
  gears: Gears,
  search: Search,
  appendix: Appendix,
  finale: Finale,
};
