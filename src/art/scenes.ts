import type { FunctionComponent } from 'preact';
import type { GameState } from '../engine/types';
import { Promenade, Corridor, BDeck, Wireless } from './scenesA';
import { Lounge, Dining, Smoking, Captain, Cabin9 } from './scenesB';
import { Keel, Control } from './scenesC';

export const SCENE_ART: Record<string, FunctionComponent<{ state: GameState }>> = {
  promenade: Promenade,
  corridor: Corridor,
  bdeck: BDeck,
  wireless: Wireless,
  lounge: Lounge,
  dining: Dining,
  smoking: Smoking,
  captain: Captain,
  cabin9: Cabin9,
  keel: Keel,
  control: Control,
};
