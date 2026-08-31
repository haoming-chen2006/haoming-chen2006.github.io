/**
 * The interactive-request UI, as data.
 *
 * `lua/ui_emu/` models the request UI as `Item`s inside a `Scene`. The client's
 * Lua diffs the scene and pushes the diff as `notifyUI("UpdateRequestUI", change)`.
 * Interaction goes back through `UpdateRequestUI(elemType, id, action, data)` in
 * `lua/client/client_util.lua:1158`.
 *
 * The hard rule for the room lane: legality lives here, not in TypeScript. If an
 * item is not `enabled`, it is not selectable. If `Button.OK` is not `enabled`,
 * the move is not legal. There is no second opinion to compute.
 *
 * WHAT THE SPIKE CHANGED. The plan assumed every request type reachable in a
 * 身份局 renders through this scene model. It does not. Across 16 full games the
 * only `_type` observed was `Room`. Choose-general, guanxing, AG (amazing grace),
 * card-chosen and skill-invoke arrive as their own `AskFor*` commands with their
 * own payloads and are rendered by dedicated dialogs — the QML client implements
 * them itself. `PopupBox` / `ChooseCardBox` scenes exist in `lua/ui_emu/` and are
 * declared below, but nothing in the standard pack exercised them. Treat the
 * non-`Room` scene types as designed-for but unproven.
 */
import { z } from 'zod';

/* --------------------------------------------------------------- item model */

/** `Item.class.name` in `lua/ui_emu/`. The diff is keyed by this. */
export const ELEM_TYPES = [
  'Button',        // ui_emu/control.lua      — OK / Cancel / End
  'CardItem',      // ui_emu/common.lua       — a card in hand or on the table
  'Photo',         // ui_emu/common.lua       — a player seat
  'SkillButton',   // ui_emu/common.lua       — an invokable skill
  'Interaction',   // ui_emu/interaction.lua  — a skill's inline chooser
  'SpecialSkills', // ui_emu/specialskills.lua
] as const;
export type ElemType = (typeof ELEM_TYPES)[number];

/** Scene names seen in `_type`. Only `Room` was observed in a standard 身份局. */
export const SCENE_TYPES = ['Room', 'PopupBox', 'ChooseCardBox', 'PoxiBox'] as const;
export type SceneType = (typeof SCENE_TYPES)[number];

/**
 * `Item:toData()`. `id` is a number for cards and seats, a string for buttons
 * and skills. `enabled` is authoritative; `selected` exists on SelectableItem;
 * `Photo` additionally carries a `state` string. Unknown keys are allowed on
 * purpose — a package can add its own item subclass with extra fields.
 */
export const ItemDataSchema = z.object({
  id: z.union([z.string(), z.number()]),
  enabled: z.boolean().optional(),
  selected: z.boolean().optional(),
  state: z.string().optional(),
}).passthrough();
export type ItemData = z.infer<typeof ItemDataSchema>;

/** `Scene:addItem` -> `change._new`. `ui_data` is renderer hints, opaque here. */
export const NewItemSchema = z.object({
  type: z.string(),
  data: ItemDataSchema,
  ui_data: z.unknown().optional(),
});
export type NewItem = z.infer<typeof NewItemSchema>;

/** `Scene:removeItem` -> `change._delete`. */
export const DeletedItemSchema = z.object({
  type: z.string(),
  id: z.union([z.string(), z.number()]),
  ui_data: z.unknown().optional(),
});
export type DeletedItem = z.infer<typeof DeletedItemSchema>;

/**
 * The `UpdateRequestUI` payload: a diff, not a snapshot. Underscore-prefixed
 * keys are scene metadata; every other key is an `ElemType` mapping to the
 * items whose data changed.
 *
 * Apply it by merging per (elemType, id) into a locally held scene. The scene is
 * reset by `CancelRequest`, which the client emits before every `AskFor*`.
 */
export const SceneChangeSchema = z.object({
  _type: z.string(),
  /** i18n key, e.g. `#PlayCard` or `#fire_attack-show:8`. Translate via LuaClient. */
  _prompt: z.string().optional(),
  _new: z.array(NewItemSchema).optional(),
  _delete: z.array(DeletedItemSchema).optional(),
}).catchall(z.array(ItemDataSchema));
export type SceneChange = z.infer<typeof SceneChangeSchema>;

/* ------------------------------------------------------------- interaction */

/**
 * `action` is a free-form string, deliberately. Grepping every request handler
 * in `lua/`, the ONLY value anything branches on is `"doubleClick"`; handlers
 * dispatch on `elemType` and `id` and let every other action fall through the
 * same path. `"click"` is the convention used by the AI
 * (`lua/lunarltk/server/ai/ai.lua`) and by `client_util.lua`; `"update"` is what
 * an Interaction widget sends when its value changes.
 *
 * So this is a known-values list, not a closed union — a package's own item
 * subclass may introduce its own action and the engine will route it fine.
 */
export const SCENE_ACTIONS = ['click', 'doubleClick', 'update'] as const;
export type KnownSceneAction = (typeof SCENE_ACTIONS)[number];
// eslint-disable-next-line @typescript-eslint/ban-types
export type SceneAction = KnownSceneAction | (string & {});

/** Exactly the argument list of `UpdateRequestUI(elemType, id, action, data)`. */
export interface SceneInteraction {
  readonly elemType: ElemType | string;
  readonly id: string | number;
  readonly action: SceneAction;
  /** e.g. `{ selected: true }` for a card, the interaction value for a chooser. */
  readonly data?: unknown;
}

/* ------------------------------------------------------- dialog-shaped asks */

/**
 * Requests that do NOT come through the scene model. Each is its own command
 * with its own payload; sample payloads live in `fixtures/request-payloads.json`.
 * Reply shape is whatever the matching request handler expects — take it from
 * the fixture, never invent one.
 *
 * `exercised: false` means the spike never produced one in a standard 身份局
 * with the standard pack. It is not missing, it is unreachable in v1 content.
 * `rendersUi: false` means it consumes a decision slot but draws nothing.
 */
export const DIALOG_REQUESTS = {
  AskForGeneral: { exercised: true },
  AskForSkillInvoke: { exercised: true },
  AskForUseCard: { exercised: true },
  AskForResponseCard: { exercised: true },
  AskForUseActiveSkill: { exercised: true },
  AskForCardChosen: { exercised: true },
  AskForAG: { exercised: true },
  AskForGuanxing: { exercised: true },
  PlayCard: { exercised: true },
  /** Not a dialog: the engine's filler when a seat has nothing to be asked.
   *  29 of the 328 decisions in the reference game; reply is always
   *  `"__cancel"`; never reaches a client stream. Render nothing. */
  EmptyRequest: { exercised: true, rendersUi: false },
  AskForArrangeCards: { exercised: false },
  AskForPoxi: { exercised: false },
  AskForChoice: { exercised: false },
  AskForChoices: { exercised: false },
  AskForCardsChosen: { exercised: false },
  AskForCardsAndChoice: { exercised: false },
  AskForExchange: { exercised: false },
  AskForMoveCardInBoard: { exercised: false },
  MiniGame: { exercised: false },
} as const satisfies Record<string, { exercised: boolean; rendersUi?: boolean }>;

export type DialogRequest = keyof typeof DIALOG_REQUESTS;
