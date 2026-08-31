/**
 * The room's single door into the client Lua VM.
 *
 * This is the web equivalent of `Fk/Components/LunarLTK/LTKLuaUtil.qml`, which
 * holds 69 of the QML client's 164 `Lua.call` sites. Everything the room wants
 * to know that is not in the notify stream is asked here, and every interaction
 * leaves through `interact`.
 *
 * THE RULE FOR THIS LANE. There is no card-legality, target-validity, distance
 * or skill-availability predicate in `src/room`. `cardFitPattern`, `distanceTo`,
 * `getCardProhibitReason`, `getSkillStatus` and `getTargetTip` below are
 * *forwarders* — the answer is computed by the engine, in Lua, exactly once.
 * If you ever want to write `canPlayCard`, the answer is already sitting on the
 * scene's `enabled` flag.
 *
 * Every call is synchronous. That is the whole reason the client VM stays on
 * the main thread (see `contract/engine.ts`).
 */
import type { LuaClient } from '../../contract/engine';
import type { SceneAction, SceneInteraction } from '../../contract/scene';
import type {
  CardData, GeneralData, GeneralDetail, PlayerSkill, SkillData, SkillStatus, TargetTip,
} from './types';

export class LtkLua {
  constructor(private readonly client: LuaClient) {}

  /* ------------------------------------------------------------ i18n */

  /** `Translate` / `Fk:translate`. Returns the key unchanged when unknown,
   *  which is what the Lua does and what the QML relies on. */
  tr(src: string): string {
    if (src === '' || src == null) return '';
    return this.client.call<string>('Translate', src);
  }

  /* ----------------------------------------------------------- cards */

  getCardData(id: number, filterCard = false): CardData {
    return this.client.call<CardData>('GetCardData', id, filterCard);
  }

  getCardExtensionByName(name: string): string {
    return this.client.call<string>('GetCardExtensionByName', name);
  }

  getCardSkill(cid: number): unknown {
    return this.client.call('GetCardSkill', cid);
  }

  getCardSpecialSkills(cid: number): readonly string[] {
    return this.client.call<string[]>('GetCardSpecialSkills', cid) ?? [];
  }

  getVirtualEquipData(playerId: number, cid: number): CardData | undefined {
    return this.client.call<CardData | undefined>('GetVirtualEquipData', playerId, cid);
  }

  /** Whether the viewer may see this card's face. Engine-side visibility rules. */
  cardVisibility(cid: number): boolean {
    return !!this.client.call<boolean>('CardVisibility', cid);
  }

  /** Forwarder. Pattern matching lives in `Exppattern`, in Lua. */
  cardFitPattern(cardNameOrId: string | number, pattern: string): boolean {
    return !!this.client.call<boolean>('CardFitPattern', cardNameOrId, pattern);
  }

  /** Forwarder. The reason a card may not be used, computed by the engine. */
  getCardProhibitReason(cid: number): string {
    return this.client.call<string>('GetCardProhibitReason', cid) ?? '';
  }

  /* --------------------------------------------------------- generals */

  getGeneralData(name: string): GeneralData {
    return this.client.call<GeneralData>('GetGeneralData', name);
  }

  getGeneralDetail(name: string): GeneralDetail {
    return this.client.call<GeneralDetail>('GetGeneralDetail', name);
  }

  getSameGenerals(name: string): readonly string[] {
    return this.client.call<string[]>('GetSameGenerals', name) ?? [];
  }

  isCompanionWith(a: string, b: string): boolean {
    return !!this.client.call<boolean>('IsCompanionWith', a, b);
  }

  /**
   * The artist credit that ships inline in each package's i18n table
   * (`illustrator:<general>` → "KayaK" for 25 standard portraits). The spec
   * asks for these to be surfaced, so they are a first-class lookup.
   */
  getIllustrator(general: string): string | undefined {
    const key = `illustrator:${general}`; // e.g. `illustrator:caocao` -> "KayaK"

    const v = this.tr(key);
    return v === key ? undefined : v;
  }

  /* ---------------------------------------------------------- skills */

  getSkillData(name: string): SkillData | undefined {
    return this.client.call<SkillData | undefined>('GetSkillData', name);
  }

  /** Forwarder. `locked` is `not skill:isEffectable(player)` — engine-side. */
  getSkillStatus(name: string): SkillStatus {
    return this.client.call<SkillStatus>('GetSkillStatus', name);
  }

  getMySkills(): readonly string[] {
    return this.client.call<string[]>('GetMySkills') ?? [];
  }

  getPlayerSkills(pid: number): readonly PlayerSkill[] {
    return this.client.call<PlayerSkill[]>('GetPlayerSkills', pid) ?? [];
  }

  /** The room ticks this the way `Room.qml`'s 200 ms timer does. */
  refreshStatusSkills(): void {
    this.client.call('RefreshStatusSkills');
  }

  /** Non-empty while a view-as skill is mid-selection. */
  getPendingSkill(): string {
    return this.client.call<string>('GetPendingSkill') ?? '';
  }

  /* --------------------------------------------------------- players */

  /** Forwarder. Distance is a rule; it is computed in `lua/lunarltk/core/player.lua`. */
  distanceTo(from: number, to: number): number {
    return this.client.call<number>('DistanceTo', from, to);
  }

  getPlayerHandcards(pid: number): readonly number[] {
    return this.client.call<number[]>('GetPlayerHandcards', pid) ?? [];
  }

  getPlayerEquips(pid: number): readonly number[] {
    return this.client.call<number[]>('GetPlayerEquips', pid) ?? [];
  }

  getPlayerJudges(pid: number): readonly number[] {
    return this.client.call<number[]>('GetPlayerJudges', pid) ?? [];
  }

  getPile(pid: number, name: string): readonly number[] {
    return this.client.call<number[]>('GetPile', pid, name) ?? [];
  }

  getAllPiles(pid: number): Readonly<Record<string, readonly number[]>> {
    return this.client.call<Record<string, number[]>>('GetAllPiles', pid) ?? {};
  }

  roleVisibility(pid: number): boolean {
    return !!this.client.call<boolean>('RoleVisibility', pid);
  }

  isMyBuddy(me: number, other: number): boolean {
    return !!this.client.call<boolean>('IsMyBuddy', me, other);
  }

  hasVisibleCard(me: number, other: number, specialName?: string): boolean {
    return !!this.client.call<boolean>('HasVisibleCard', me, other, specialName);
  }

  /** Forwarder. The per-target hint the engine wants shown on a photo. */
  getTargetTip(pid: number): readonly TargetTip[] {
    return this.client.call<TargetTip[]>('GetTargetTip', pid) ?? [];
  }

  canSortHandcards(pid: number): boolean {
    return !!this.client.call<boolean>('CanSortHandcards', pid);
  }

  /* ----------------------------------------------------- dialog rules */

  /* Choose-general and poxi dialogs delegate their filter/feasible predicates
   * to the engine. This is the same escape hatch the QML dialogs use, and it is
   * why those dialogs need no rules of their own. */

  chooseGeneralPrompt(rule: string, data: unknown, extra: unknown): string {
    return this.client.call<string>('ChooseGeneralPrompt', rule, data, extra) ?? '';
  }

  chooseGeneralFilter(rule: string, toSelect: string, selected: readonly string[], data: unknown, extra: unknown): boolean {
    return !!this.client.call<boolean>('ChooseGeneralFilter', rule, toSelect, selected, data, extra);
  }

  chooseGeneralFeasible(rule: string, selected: readonly string[], data: unknown, extra: unknown): boolean {
    return !!this.client.call<boolean>('ChooseGeneralFeasible', rule, selected, data, extra);
  }

  poxiPrompt(type: string, data: unknown, extra: unknown): string {
    return this.client.call<string>('PoxiPrompt', type, data, extra) ?? '';
  }

  poxiFilter(type: string, toSelect: number, selected: readonly number[], data: unknown, extra: unknown): boolean {
    return !!this.client.call<boolean>('PoxiFilter', type, toSelect, selected, data, extra);
  }

  poxiFeasible(type: string, selected: readonly number[], data: unknown, extra: unknown): boolean {
    return !!this.client.call<boolean>('PoxiFeasible', type, selected, data, extra);
  }

  getQmlMark(mtype: string, name: string, p: unknown): unknown {
    return this.client.call('GetQmlMark', mtype, name, p);
  }

  /* ----------------------------------------------------- interaction */

  /**
   * `UpdateRequestUI(elemType, id, action, data)` — `client_util.lua:1158`.
   * The single entry point for everything a player clicks inside a request.
   */
  interact(elemType: string, id: string | number, action: SceneAction = 'click', data?: unknown): void {
    // `SceneAction` is an open list, not a closed union: `"click"`,
    // `"doubleClick"` and `"update"` are the known values, and a package's own
    // item subclass may introduce another. Pass whatever the caller gives.
    this.client.interact({ elemType, id, action, data } satisfies SceneInteraction);
  }

  /** `RevertSelection` — invert the current pending selection, in Lua. */
  revertSelection(): void {
    this.client.call('RevertSelection');
  }

  /** `FinishRequestUI` — the room leaving the "active" state. */
  finishRequestUI(): void {
    this.client.call('FinishRequestUI');
  }

  /**
   * Answer a dialog-shaped request: choose-general, guanxing, card-chosen,
   * poxi, amazing grace — everything that does not go through the scene. The
   * QML client answers exactly these by calling `ClientInstance.replyToServer`
   * directly (`RoomLogic.js:141`), with an empty command name, and
   * `contract/engine.ts` grew `replyToServer(command, reply)` to match.
   *
   * The command name is a label: `lua/web/client.lua:208` forwards it and the
   * host matches a reply to the outstanding request, not to a name. `''` is
   * what QML sends; `'ReplyToServer'` is what the engine's own human test
   * sends. Either works — what does NOT work is calling this with one argument,
   * which lands the *payload* in the command slot and sends `null` as the
   * answer. That was live for the whole first release: `LuaClient` was mocked on
   * this side and the room was never run against a real client VM, so the seat
   * that chose a general appeared to answer and the room waited for it forever.
   */
  replyToServer(value: unknown): void {
    this.client.replyToServer('ReplyToServer', value);
  }

  /* --------------------------------------------------------- results */

  findMosts(): unknown {
    return this.client.call('FindMosts');
  }

  entitle(data: unknown, seat: unknown, winner: unknown): unknown {
    return this.client.call('Entitle', data, seat, winner);
  }

  getPlayerGameData(pid: number): unknown {
    return this.client.call('GetPlayerGameData', pid);
  }

  /* ----------------------------------------------------------- misc */

  /** Resolve a CBOR `TaggedRef` into renderable data. Never walk one yourself —
   *  tag 33002 reaches the whole engine object graph (see `protocol.ts`). */
  resolve(ref: unknown): unknown {
    return this.client.resolve(ref);
  }

  toUIString(v: unknown): string {
    return this.client.call<string>('ToUIString', v);
  }
}
