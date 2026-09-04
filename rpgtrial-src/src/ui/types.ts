// UI-facing contract types (mirrors ARCHITECTURE.md "UI context"). Kept structural so the dev page can fake them.
import type { World } from '../sim/world.ts';
import type { Input } from '../core/input.ts';
import type { QualityTier } from '../render/quality.ts';
import type { ThirdPersonCamera } from '../render/camera.ts';
import type { ClassId, DialogueNode, DialogueChoice, QuestStep } from '../sim/types.ts';
import type { RollResult } from '../core/events.ts';
import type { Vec3 } from '../core/math.ts';

export interface UIGame {
  pause(on: boolean): void;
  setQuality(t: QualityTier): void;
  quality: QualityTier;
  input: Input;
  restart(): void;
  startGame(classId: ClassId, name: string): void;
  cam: ThirdPersonCamera;
}
export interface UIContext { world: World; game: UIGame }

export type ScreenName = 'menu' | 'classSelect' | 'pause' | 'inventory' | 'character' | 'journal' | 'map' | 'levelUp' | 'settings' | 'ending' | 'death' | 'credits' | null;

export interface UI {
  update(dt: number): void;
  showScreen(name: ScreenName): void;
  dialogue: {
    present(node: DialogueNode, choices: DialogueChoice[], onPick: (i: number) => void, onContinue: () => void): void;
    hide(): void;
    showRoll(roll: RollResult, onDone: () => void): void;
  };
  tutorial: { show(step: QuestStep): void; complete(id: string): void; card(title: string, html: string, keys?: string[]): void };
  worldToScreen(pos: Vec3): { x: number; y: number; visible: boolean };
  isBlocking(): boolean;
  /** Current screen (null = none). */
  screen: ScreenName;
  /** Fire a toast from anywhere. */
  toast(text: string, kind?: 'info' | 'warn' | 'gold' | 'xp'): void;
  /** Bottom-centre subtitle ("Ilyra — …"). `dialogueLine` events outside a dialogue panel already route here. */
  subtitle(speakerId: string, text: string): void;
  root: HTMLElement;
  /** Pre-compile the dice renderer (called automatically on idle; call earlier from the loading screen if you like). */
  warm(): void;
}

export interface Screen {
  el: HTMLElement;
  open(): void;
  close(): void;
  /** Handle a key while open. Return true if consumed. */
  key?(code: string, e: KeyboardEvent): boolean;
}

/** XP needed to reach each level (index = level). Level 2 at 300 XP per ARCHITECTURE.md. */
export const XP_TABLE = [0, 0, 300, 900, 2700, 6500];
export const xpForLevel = (lvl: number) => XP_TABLE[Math.min(lvl, XP_TABLE.length - 1)] ?? XP_TABLE[XP_TABLE.length - 1];
