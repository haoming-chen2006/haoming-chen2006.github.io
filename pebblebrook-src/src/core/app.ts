import type { ActiveEvent, Brain, Dir, ItemId, ObjectKind, Place, PlaceId, Season, SimView, Vec, Villager, VillagerId, World, WorldObject } from './types.ts';

/** Application-level contracts between the modules main.ts wires together. */

export interface Sim extends SimView {
  /** advance the simulation by in-game minutes (the world clock is ticked by the sim) */
  update(minutes: number): void;
  setBrain(id: VillagerId, kind: 'local' | 'llm'): void;
  brains: { local: Brain; llm: Brain | null };
  /** the tool catalogue the sim executes */
  tools: import('./types.ts').ToolDef[];
  save(): unknown;
  load(data: unknown): void;
  /** player-facing helpers */
  playerTalk(v: Villager, intent: string, line?: string): Promise<import('./types.ts').ConversationTurn>;
  playerGift(v: Villager, item: ItemId): { ok: boolean; reaction: string };
  playerEnter(place: PlaceId): boolean;
  playerLeave(): void;
  endPlayerConversation(): void;
  /** shop counter for the player (Agent B): prices from the shop's demand/supply and event multipliers */
  playerBuy(place: PlaceId, item: ItemId, qty?: number): { ok: boolean; message: string; cost: number };
  playerSell(place: PlaceId, item: ItemId, qty?: number): { ok: boolean; message: string; earned: number };
  /** notice board for the player (Agent B) */
  playerAcceptRequest(id: string): boolean;
  playerCompleteRequest(id: string): { ok: boolean; message: string };
}

export interface Director {
  update(minutes: number): void;
  fire(eventId: string, opts?: Record<string, unknown>): ActiveEvent | null;
  list(): { id: string; name: string; kind: string; description: string; canFire: boolean }[];
  forecast(): { dayIndex: number; name: string; id: string }[];
  active: ActiveEvent[];
  save(): unknown;
  load(data: unknown): void;
}

/** A rectangle on a sprite sheet, in source pixels. */
export interface SpriteRect { img: HTMLImageElement | HTMLCanvasElement; sx: number; sy: number; sw: number; sh: number; /** draw offset in tiles for tall sprites */ ox?: number; oy?: number }

export interface CharacterSprites {
  /** frames[dir][frame], frame 0 = idle */
  frames: Record<Dir, SpriteRect[]>;
  width: number;
  height: number;
  /** a 32×32 portrait for the inspector */
  portrait: HTMLCanvasElement;
}

export interface Art {
  ready: boolean;
  tile(kind: string, variant: number, season: Season, neighbours?: number): SpriteRect | null;
  object(kind: ObjectKind, data: Record<string, unknown>, season: Season): SpriteRect | SpriteRect[] | null;
  item(id: ItemId): SpriteRect | null;
  character(look: Villager['look'], profession?: string): CharacterSprites;
  emote(kind: string): SpriteRect | null;
  /** an icon canvas for UI (portrait, item) */
  icon(kind: 'item' | 'place' | 'weather' | 'skill', id: string, size: number): HTMLCanvasElement;
}

export interface Camera { x: number; y: number; zoom: number; /** tile coords of the viewport centre */ }

export interface Renderer {
  camera: Camera;
  /** who the camera follows: 'player' | villager id | null (free) */
  follow: VillagerId | 'player' | null;
  render(sim: SimView, dtSec: number, player: { pos: Vec; facing: Dir; inside?: PlaceId; moving: boolean; look: Villager['look'] }): void;
  resize(w: number, h: number): void;
  screenToTile(px: number, py: number): Vec;
  tileToScreen(pos: Vec): Vec;
  /** the villager or object under a screen point, for hover/click */
  pick(px: number, py: number, sim: SimView): { villager?: Villager; object?: WorldObject; place?: Place } | null;
  setQuality(q: 'high' | 'low'): void;
  /** highlight a tile (player targeting) */
  highlight: Vec | null;
}

export interface InputState {
  down(code: string): boolean;
  pressed(code: string): boolean;
  mouse: Vec;
  mouseDown: boolean;
  clicked: boolean;
  rightClicked: boolean;
  wheel: number;
  /** true when a text field has focus, so game keys are ignored */
  typing: boolean;
  endFrame(): void;
}

export interface PlayerController {
  update(dtSec: number, input: InputState): void;
  /** what E would do right now, for the prompt */
  prompt(): string | null;
  moving: boolean;
  look: Villager['look'];
}

export interface AudioSystem {
  init(): void;
  ready: boolean;
  setScene(scene: 'title' | 'day' | 'night' | 'rain' | 'festival' | 'tavern'): void;
  play(name: string, opts?: { volume?: number; pos?: Vec }): void;
  update(dtSec: number, listener: Vec, world: World): void;
  setVolume(music: number, sfx: number): void;
  enabled: boolean;
}

export interface UiContext {
  sim: Sim;
  world: World;
  director: Director;
  renderer: Renderer;
  player: PlayerController;
  audio: AudioSystem;
  art: Art;
  input: InputState;
  /** persist/restore the whole game */
  save(): void;
  load(): boolean;
  newGame(seed: number): void;
  setLlm(cfg: LlmSettings): void;
  getLlm(): LlmSettings;
}

export interface Ui {
  update(dtSec: number): void;
  /** true when a modal owns the keyboard/mouse */
  modal: boolean;
  openDialogue(v: Villager): void;
  openShop(place: Place): void;
  openBoard(): void;
  openInspector(v: Villager | null): void;
  toast(text: string, kind?: 'info' | 'warn' | 'good'): void;
  showTitle(show: boolean): void;
}

export interface LlmSettings {
  provider: 'none' | 'anthropic' | 'openai';
  apiKey: string;
  model: string;
  /** 'all' = every villager thinks with the model; 'social' = conversations + reflections only; 'off' */
  mode: 'all' | 'social' | 'off';
  /** requests per in-game hour cap */
  budgetPerHour: number;
}
