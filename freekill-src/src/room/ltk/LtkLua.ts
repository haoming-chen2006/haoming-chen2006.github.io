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
 *
 * WHAT MAY BE REMEMBERED HERE. Every call below is a round trip into the VM,
 * and a profiled host seat spent 2,243 ms on 132,676 translations and 650 ms on
 * 17,158 general lookups over three games — the same few hundred answers, asked
 * again on every render. Three of these questions have answers that cannot
 * change while the room is open, so they are answered once:
 *
 *   `tr` / `getIllustrator`  a table lookup, `Fk:translate` -> `self.translations
 *       [Config.language][src] or src` (`lua/core/mod_manager.lua:122`). The
 *       tables are written only by `loadTranslationTable`, whose every call site
 *       is a package file evaluated during `FKClient.boot()`; `Config.language`
 *       is written only by `FkWebSetLanguage` (`lua/web/client.lua:255`). So the
 *       answer is a function of the key and the language, and nothing else.
 *   `getGeneralData`  reads `Fk.generals[name]` (`client_util.lua:9`), a
 *       registry written only by `Engine:addGeneral` at package-load time, and
 *       copies out prototype fields whose only assignments in the whole engine
 *       are in the `General` constructor and in package definitions
 *       (`anjiang.total_hidden = true`). No player state, no language.
 *
 * AND WHAT MAY NOT. `getCardData` is live game state, not a description: it
 * reads `Fk:getCardById(id, not filterCard)`, and with `filterCard` that is
 * `Fk.filtered_cards[id]`, which lock-view skills rewrite mid-game — name,
 * suit, colour and number all move. It also copies `card.mark`, which
 * `Room:setCardMark` changes on the printed card too. There is no signal on
 * this side that says when either happened, so nothing about a card is
 * remembered here. Its call count is a symptom of the table re-rendering, not
 * of a missing cache. `getSkillData` is the same story for a different reason:
 * `Fk:getSkillName(name, nil, Self)` resolves a *dynamic* name against the
 * viewing player.
 */
import { getLanguage } from '../../i18n';
import type { LuaClient } from '../../contract/engine';
import type { SceneAction, SceneInteraction } from '../../contract/scene';
import type {
  CardData, GeneralData, GeneralDetail, PlayerSkill, SkillData, SkillStatus, TargetTip,
} from './types';

/**
 * A room is long-lived and these key spaces are bounded by the packages that
 * are loaded — a few thousand i18n keys, a few hundred generals — so this is
 * never reached. It is here so that a caller which composes keys rather than
 * naming them cannot turn a cache into a leak.
 */
const CACHE_LIMIT = 20_000;

export class LtkLua {
  /* The mechanics below are `#`-private, not `private`. A TypeScript `private`
   * is still a prototype method at runtime, and the audit probe times every
   * prototype method of this class as if it were a client-VM call
   * (`scripts/audit/probe.mjs`, `wrapLua`) — which is a fair assumption about a
   * facade whose public surface IS the set of questions it asks the VM. Keeping
   * the bookkeeping off the prototype keeps that true. */

  /** i18n key -> translation, for the language in `#cachedLang`. */
  readonly #trCache = new Map<string, string>();
  /** general -> artist credit, for the language in `#cachedLang`. */
  readonly #illustratorCache = new Map<string, string | undefined>();
  /** The language generation the two caches above were filled for. */
  #cachedLang: string | null = null;
  /** general -> `GetGeneralData`. Never invalidated; see the header. */
  readonly #generalCache = new Map<string, GeneralData>();

  constructor(private readonly client: LuaClient) {}

  /* ------------------------------------------------------------ i18n */

  /**
   * Which language the cached answers belong to.
   *
   * Two separate things decide what `Translate` answers, and a cache that
   * watches only one of them serves the old language after a switch:
   *
   *  - the app's language store. `withLanguage` in `src/i18n/translate.ts`
   *    wraps the `LuaClient` once per room and reads `getLanguage()` at call
   *    time — it answers `en_US` out of the static table and pushes
   *    `FkWebSetLanguage` into the VM when the store moves.
   *  - the client's own `language`, which `FixtureLuaClient` reads directly and
   *    which the harness and the room's tests flip on the client itself,
   *    without going near the store.
   *
   * Both are read, so a switch through either is a miss and not a stale hit.
   */
  #languageGeneration(): string {
    const own = (this.client as { language?: unknown }).language;
    return `${getLanguage()}/${typeof own === 'string' ? own : ''}`;
  }

  /**
   * Drop the language-scoped answers when the language has moved.
   *
   * Deliberately a clear rather than a map per language: it also keeps
   * `withLanguage`'s side effect intact. That wrapper pushes `FkWebSetLanguage`
   * into the VM on the first `call` after a switch, and translation is by far
   * the most frequent call — so the first `tr` after a toggle has to reach the
   * client for the VM's own `Config.language` to follow. An empty cache
   * guarantees it does. A per-language map would serve a warm hit on a switch
   * *back* and leave the VM rendering `chooseGeneralPrompt` in the old language.
   */
  #freshForLanguage(): void {
    const generation = this.#languageGeneration();
    if (generation === this.#cachedLang) return;
    this.#cachedLang = generation;
    this.#trCache.clear();
    this.#illustratorCache.clear();
  }

  static #remember<V>(cache: Map<string, V>, key: string, value: V): void {
    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(key, value);
  }

  /** `Translate` / `Fk:translate`. Returns the key unchanged when unknown,
   *  which is what the Lua does and what the QML relies on. */
  tr(src: string): string {
    if (src === '' || src == null) return '';
    this.#freshForLanguage();
    const hit = this.#trCache.get(src);
    if (hit !== undefined) return hit;
    const value = this.client.call<string>('Translate', src);
    // A client that could not answer has not told us anything worth keeping;
    // pass its answer through exactly as before and ask again next time.
    if (typeof value === 'string') LtkLua.#remember(this.#trCache, src, value);
    return value;
  }

  /* ----------------------------------------------------------- cards */

  /**
   * `GetCardData` already answers "I do not know that card" with
   * `{ cid, known: false }` rather than nil, so a renderer that trusts the
   * shape is right about the engine — but not about every `LuaClient`. The
   * fixture client answers every `call` with null, and a null here reached a
   * `data.virt_name` in `CardItem` and took the whole table down with it.
   *
   * A card that cannot be described is a face-down card, which the room
   * already knows how to draw. One unresolvable card must never cost the game.
   *
   * NOT CACHED, on purpose. This is the one hot lookup on this facade whose
   * answer moves during a game: the filtered card, its marks, and therefore its
   * name and suit. See the file header. A stale card face is a worse bug than a
   * slow one.
   */
  getCardData(id: number, filterCard = false): CardData {
    return this.client.call<CardData | null>('GetCardData', id, filterCard)
      ?? { cid: id, known: false };
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

  /**
   * Immutable for the life of the VM — see the header for why — so it is asked
   * once per general and then answered from here.
   *
   * The answer is copied and frozen rather than shared: `FixtureLuaClient`
   * hands back the same object on every call, and a cache that handed out the
   * client's own object would let one careless caller edit every later answer.
   * A client that cannot answer at all is passed straight through, uncached, so
   * `null` keeps meaning "ask again" the way it did before.
   */
  getGeneralData(name: string): GeneralData {
    const hit = this.#generalCache.get(name);
    if (hit !== undefined) return hit;
    const value = this.client.call<GeneralData>('GetGeneralData', name);
    if (value == null || typeof value !== 'object') return value;
    const snapshot = Object.freeze({ ...value });
    LtkLua.#remember(this.#generalCache, name, snapshot);
    return snapshot;
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
   *
   * A translation, so it lives and dies with the translation cache — it is kept
   * separately only to skip rebuilding the key and re-testing it on every one
   * of the ~17,000 portrait renders a three-game session draws.
   */
  getIllustrator(general: string): string | undefined {
    this.#freshForLanguage();
    if (this.#illustratorCache.has(general)) return this.#illustratorCache.get(general);

    const key = `illustrator:${general}`; // e.g. `illustrator:caocao` -> "KayaK"
    const v = this.tr(key);
    const credit = v === key ? undefined : v;
    // Same rule as `tr`: a client that could not answer has told us nothing.
    if (typeof v === 'string') LtkLua.#remember(this.#illustratorCache, general, credit);
    return credit;
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
