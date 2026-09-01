/**
 * How a seat decides.
 *
 * THE RULE. Nothing in this file works out whether a move is legal. It reads
 * `enabled` off the items the probe copied out of the Lua scene and picks among
 * the ones the app is already offering; `Button.OK` being enabled is the only
 * definition of "this move can be made". Any predicate here that decided a card
 * was playable would be a second source of truth for the rules, and the whole
 * point of driving the real UI is that there is only one.
 *
 * What it does own is *which* legal option to take, and it deliberately picks
 * badly on purpose sometimes — a driver that always plays its first card and
 * always targets its left-hand neighbour tests one line through the game
 * forever. Choices are seeded, so a failing game replays.
 *
 * The shape of a scene answer is the shape the QML client uses: select a card
 * or a skill, then select targets until OK lights up, then press OK. When it
 * does not light up, the opener was a dead end — so the attempt is unwound
 * (every toggle clicked off again) and another opener is tried. That unwinding
 * is not politeness: a half-selected card left behind poisons the next attempt,
 * and it is exactly how a driver ends up "stuck" on a screen that is working.
 */

/** Deterministic PRNG so a seed replays a game's choices exactly. */
export function rngFrom(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

function shuffled(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const of = (a, group) => (a.actions ?? []).filter((x) => x.group === group);
const clickable = (x) => x.enabled && x.visible && x.box;

/**
 * Put the options the campaign still needs at the front of the list.
 *
 * This is the whole of the bias, and it is worth being precise about what it
 * does and does not do. It reorders an array. Every element of that array was
 * already offered by the app and already passed `clickable`, which reads
 * `enabled` off the scene; nothing is added, nothing is enabled, nothing is
 * judged legal here. Preferring an option the app is offering is a player's
 * privilege. Deciding whether it may be offered is the engine's, and stays there.
 *
 * Within each tier the order is still the seeded shuffle, so a seed replays.
 */
function preferring(rng, items, wanted, keyOf) {
  if (!wanted || !wanted.size) return shuffled(rng, items);
  const want = [];
  const rest = [];
  for (const it of shuffled(rng, items)) {
    (wanted.has(keyOf(it)) ? want : rest).push(it);
  }
  return [...want, ...rest];
}

/**
 * Answer whatever is on screen once.
 *
 * Returns a step-by-step account of what it clicked and why, which is what
 * makes a failure readable afterwards: "clicked card 153, no target lit, backed
 * out, clicked skill rende" is a diagnosis; "timed out" is not.
 */
export async function answerOnce(seat, ctx, a) {
  const { rng } = ctx;
  const steps = [];
  /**
   * The question being answered, captured before anything is clicked.
   *
   * `refresh()` reassigns `a`, and every dialog branch below refreshes after
   * committing its answer — so by the time those branches reported
   * `a.request.command` they were reading the request that had *replaced* the
   * one they just answered. Seventeen `AskForCardChosen` dialogs in a nine-game
   * campaign were answered correctly, on the right control, and every one of
   * them was filed under `PlayCard`; the coverage report then said
   * `AskForCardChosen` was "sent by the engine but never answered here", which
   * reads as a product bug and was a bookkeeping one. It also explains the
   * tell that was sitting in plain sight — 246 PlayCards answered against 233
   * sent, a count that cannot happen and nobody had asked about.
   */
  const asked = a.request?.command ?? null;
  const say = (what, detail) => { steps.push({ at: Date.now(), what, ...detail }); };

  const refresh = async () => { a = await seat.actions(); return a; };

  const clickOne = async (item, why, opts) => {
    say(why, {
      group: item.group, id: item.cid ?? item.name ?? item.pid ?? item.id ?? item.idx,
      label: item.label ?? item.name ?? null, box: item.box,
    });
    await seat.click(item.box, opts);
    await ctx.settle();
  };

  /* ---------------------------------------------------------- dialog boxes */

  const generals = of(a, 'general');
  if (generals.length) {
    // The one place a run can decide what the rest of it will be about.
    //
    // Which generals are offered is the engine's business and it offers a
    // handful at random. Which of those is taken is the player's, and taking
    // whichever came first uniformly means the campaign covers the roster by
    // coupon collector — 25 generals, three offered a game, and the last one
    // arrives around never. Preferring one the campaign has never seated turns
    // that into a sweep. `guanxing` in particular exists on exactly one general
    // in this build, so "cover zhugeliang" and "cover AskForGuanxing" are the
    // same task.
    //
    // The dialog's own OK is still the only thing that says a pick is legal:
    // the loop below offers candidates and stops when the app lights OK.
    const ordered = preferring(rng, generals, ctx.bias?.generals, (g) => g.name);
    if (ctx.bias?.generals?.size && ordered.length && ctx.bias.generals.has(ordered[0].name)) {
      say('steering', { group: 'general', id: ordered[0].name, reason: 'never seated in this campaign' });
    }
    // Selection is a toggle and `ChooseGeneralFilter` may refuse a card, so
    // clicking the first one and pressing OK is not an answer — keep offering
    // candidates until the dialog's own OK says the pick is feasible.
    for (const g of ordered) {
      const btn = of(await refresh(), 'dialogBtn').find((b) => b.primary);
      if (btn && clickable(btn)) break;
      if (!of(a, 'general').length) break;
      const live = of(a, 'general').find((x) => x.idx === g.idx);
      if (!live || !live.box) continue;
      await clickOne(live, 'pick-general');
    }
    // Whatever the dialog ended up holding selected is what this seat will
    // play, and the campaign ledger needs the id — "which generals has a human
    // seat actually driven" is a different and much smaller set than "which
    // generals appeared at the table", and only the first one is testing.
    const picked = of(await refresh(), 'general').filter((x) => x.selected).map((x) => x.name);
    // Everything the engine put in front of this seat, taken or not. It is the
    // only way to tell "the bias failed to steer toward zhugeliang" from "the
    // build has offered zhugeliang to a human seat exactly zero times in
    // twenty games" — one of those is a harness problem and the other is a
    // fact about the general pool, and they look identical in a coverage tally.
    const offered = generals.map((g) => g.name).filter(Boolean);
    const ok = of(a, 'dialogBtn').find((b) => b.primary && clickable(b));
    if (ok) { await clickOne(ok, 'confirm-general'); return { handled: 'AskForGeneral', picked, offered, steps }; }
    return { handled: 'AskForGeneral', picked, offered, stuck: 'OK never enabled', steps };
  }

  const ags = of(a, 'ag').filter(clickable);
  if (ags.length) {
    await clickOne(pick(rng, ags), 'take-ag');
    return { handled: 'AskForAG', steps };
  }

  const choices = of(a, 'choice').filter(clickable);
  if (choices.length) {
    await clickOne(pick(rng, choices), 'pick-choice');
    const ok = of(await refresh(), 'dialogBtn').find((b) => b.primary && clickable(b));
    if (ok) await clickOne(ok, 'confirm-choice');
    return { handled: asked ?? 'AskForChoice', steps };
  }

  const zoneCards = of(a, 'zoneCard');
  if (zoneCards.length) {
    const chips = of(a, 'zoneChip').filter((c) => c.box);
    if (chips.length) {
      // Guanxing / arrange: shuffle the zones a little so the reply is a real
      // rearrangement rather than "accept whatever the engine handed me".
      const n = Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        const live = of(await refresh(), 'zoneChip').filter((c) => c.box);
        if (!live.length) break;
        await clickOne(pick(rng, live), 'arrange');
      }
      const ok = of(await refresh(), 'dialogBtn').find((b) => b.primary && clickable(b));
      if (ok) { await clickOne(ok, 'confirm-arrange'); return { handled: asked ?? 'arrange', steps }; }
      const any = of(a, 'dialogBtn').find(clickable);
      if (any) { await clickOne(any, 'dismiss-arrange'); return { handled: asked ?? 'arrange', steps }; }
      return { handled: asked ?? 'arrange', stuck: 'no enabled dialog button', steps };
    }

    // Choose-a-card boxes: a single-pick box replies on the click itself, a
    // multi-pick box toggles and waits for OK.
    //
    // ONE CLICK IS NOT AN ANSWER. `AskForPoxi` became reachable when the mobile
    // pack landed — it registers five poxi methods, and utility's
    // `askforCardsChosenFromAreas` only calls the pick feasible when one card
    // has been taken from every area (`packages/utility/init.lua`, `feasible`).
    // Picking one card left OK correctly disabled, the driver sent nothing, and
    // the run reported `reply-delivery` and `stale-request` FAILs against a room
    // that was behaving properly. So this follows the same rule the general
    // picker does: keep offering cards, and let the dialog's own OK say when the
    // selection is legal. Bounded by the number of cards on offer.
    const takeable = () => of(a, 'zoneCard').filter((c) => c.box);
    let picked = 0;
    for (const card of shuffled(rng, zoneCards.filter((c) => c.box))) {
      const btn = of(await refresh(), 'dialogBtn').find((b) => b.primary);
      if (btn && clickable(btn)) break;
      // A single-pick box replies on the click and tears the dialog down; when
      // that happens there is nothing left to take and nothing left to confirm.
      if (picked > 0 && !takeable().length) break;
      const live = takeable().find((c) => c.idx === card.idx);
      if (!live) continue;
      await clickOne(live, 'pick-card-from-zone');
      picked += 1;
    }
    const after = await refresh();
    const ok = of(after, 'dialogBtn').find((b) => b.primary && clickable(b));
    if (ok) { await clickOne(ok, 'confirm-card-pick'); return { handled: asked ?? 'AskForCardChosen', steps }; }
    return {
      handled: asked ?? 'AskForCardChosen',
      ...(picked && of(after, 'zoneCard').length ? { stuck: 'OK never enabled' } : {}),
      steps,
    };
  }

  /* --------------------------------------------------------- scene answers */

  if (a.request.kind === 'scene') {
    return sceneAnswer(seat, ctx, a, steps, say, clickOne, refresh);
  }

  // A dialog request with a dialog on screen but nothing the driver recognised.
  const dlg = of(a, 'dialogBtn').filter(clickable);
  if (a.request.kind === 'dialog' && dlg.length) {
    await clickOne(pick(rng, dlg), 'dismiss-unknown-dialog');
    return { handled: asked ?? 'unknown-dialog', unknown: true, steps };
  }

  return { handled: null, steps };
}

/**
 * The PlayCard / AskForUseCard / AskForSkillInvoke family.
 *
 * `End` ends the play phase, `Cancel` declines, `OK` commits — and which of the
 * three the scene even renders is the scene's business, so this only ever
 * presses one it was handed.
 */
async function sceneAnswer(seat, ctx, a, steps, say, clickOne, refresh) {
  const { rng } = ctx;
  const cmd = a.request.command;
  const btn = (id) => of(a, 'button').find((b) => b.id === id && clickable(b));

  // Skill invoke has no card to pick: it is a yes/no, and both answers are
  // worth exercising — declining is a code path too.
  if (cmd === 'AskForSkillInvoke') {
    // Declining is a code path, so it stays in the mix — but a skill the
    // campaign has never once seen fire is not the place to spend a decline.
    const prompt = String(a.prompt ?? '');
    const wanted = [...(ctx.bias?.skills ?? [])].find((s) => s && prompt.includes(s));
    const wantYes = wanted ? true : rng() < ctx.invokeSkillP;
    if (wanted) say('steering', { group: 'skill', id: wanted, reason: 'never fired in this campaign' });
    const target = (wantYes && btn('OK')) || btn('Cancel') || btn('OK');
    if (target) {
      await clickOne(target, wantYes ? 'invoke-skill' : 'decline-skill');
      return { handled: cmd, steps, invoked: target.id === 'OK' };
    }
  }

  const endTurn = cmd === 'PlayCard'
    && (ctx.playsThisTurn >= ctx.maxPlaysPerTurn || rng() > ctx.playCardP);
  if (endTurn) {
    const e = btn('End') ?? btn('Cancel');
    if (e) { await clickOne(e, 'end-phase'); return { handled: cmd, steps, ended: true }; }
  }
  if (cmd !== 'PlayCard' && rng() > ctx.respondP) {
    const c = btn('Cancel');
    if (c) { await clickOne(c, 'decline'); return { handled: cmd, steps, declined: true }; }
  }

  // Openers: a card the scene enabled, or a skill it enabled. Skills first
  // some of the time, because a driver that only ever plays cards never fires
  // a view-as skill and then reports "no skills broken".
  const cards = of(a, 'card').filter((c) => clickable(c) && !c.selected);
  const skills = of(a, 'skill').filter((s) => clickable(s) && !s.selected);

  // Which of these the campaign still needs. Card ids mean nothing on their
  // own — "cid 153" is not a coverage fact — so the faces are resolved from
  // the client VM, the same way the report resolves the ones that reached the
  // table. Only asked for when there is something left to want, because it
  // costs a VM round trip per decision.
  let nameOf = () => null;
  const wantCards = ctx.bias?.cards;
  if (wantCards?.size && cards.length) {
    const cids = cards.map((c) => c.cid).filter((c) => c != null);
    const info = cids.length ? await seat.cardInfo(cids).catch(() => ({})) : {};
    nameOf = (c) => info?.[c.cid]?.name ?? null;
  }

  const bySkill = preferring(rng, skills, ctx.bias?.skills, (s) => s.name);
  const byCard = preferring(rng, cards, wantCards, nameOf);
  const skillWanted = bySkill.length && ctx.bias?.skills?.has(bySkill[0].name);
  const cardWanted = byCard.length && wantCards?.has(nameOf(byCard[0]));
  // A wanted opener goes first outright rather than waiting on the coin flip
  // that normally decides cards-vs-skills; a rare path that only shows up 35%
  // of the time it is available is still mostly luck.
  const skillFirst = skillWanted ? true : (cardWanted ? false : rng() < ctx.skillFirstP);
  if (skillWanted) say('steering', { group: 'skill', id: bySkill[0].name, reason: 'never fired in this campaign' });
  else if (cardWanted) say('steering', { group: 'card', id: nameOf(byCard[0]), reason: 'never played in this campaign' });
  const openers = skillFirst ? [...bySkill, ...byCard] : [...byCard, ...bySkill];

  for (const opener of openers) {
    if (Date.now() > ctx.deadline) break;
    const r = await attempt(seat, ctx, opener, steps, say, clickOne, refresh);
    if (r === 'played') return { handled: cmd, steps, played: true, opener: opener.group };
    if (r === 'gone') return { handled: cmd, steps, raced: true };
    // r === 'dead-end': the unwind already happened, try the next opener.
  }

  /**
   * Target-only asks. Not every scene request starts with a card.
   * 突袭 (`#tuxi-ask`) enables three seats and nothing else — no card, no
   * skill, not even an OK until a seat is picked — and a driver that only
   * knows how to open with a card sits there until the engine's 30-second
   * timeout hands the turn to the AI. Every one of those cost thirty seconds
   * of a real game before this branch existed.
   */
  if (!openers.length) {
    const r = await attempt(seat, ctx, null, steps, say, clickOne, refresh);
    if (r === 'played') return { handled: cmd, steps, played: true, opener: 'target' };
    if (r === 'gone') return { handled: cmd, steps, raced: true };
  }

  // Nothing worked, or nothing was offered. Take whatever way out the scene
  // gives — that is still an answer, and leaving the request open is the one
  // outcome that deadlocks the table.
  a = await refresh();
  const out = btn('End') ?? btn('Cancel') ?? btn('OK');
  if (out) { await clickOne(out, 'fallback-exit'); return { handled: cmd, steps, ended: out.id !== 'OK' }; }
  // Say what the scene was actually showing when the driver ran out of moves.
  // "no enabled control" on its own is indistinguishable from a driver gap,
  // and one of those two is a product bug worth chasing.
  const shown = ['button', 'card', 'skill', 'photo', 'chip']
    .map((g) => `${g}:${of(a, g).filter(clickable).length}/${of(a, g).length}`)
    .join(' ');
  return { handled: cmd, steps, stuck: `nothing pressable — enabled/total ${shown}` };
}

/**
 * Try one opener through to OK, and put everything back if it does not get
 * there.
 *
 * A card that needs a target the seat cannot legally give leaves OK dark
 * forever. Backing out — clicking every toggle off again — is what lets the
 * next opener start from a clean scene; without it the second attempt inherits
 * the first one's selection and the driver looks stuck on a screen that is
 * working perfectly.
 */
async function attempt(seat, ctx, opener, steps, say, clickOne, refresh) {
  const { rng } = ctx;
  // Cards already clicked in this attempt. A card whose `selected` never flips
  // is telling you something — the click did not reach the scene — and clicking
  // it again neither fixes that nor learns anything, it just spends the seat's
  // clock. Each card gets one press per attempt.
  const pressed = new Set([opener?.cid].filter((c) => c != null));
  // A null opener means the scene is asking only for targets; the loop below
  // is the whole answer.
  if (opener) await clickOne(opener, opener.group === 'skill' ? 'select-skill' : 'select-card');

  for (let step = 0; step < ctx.maxTargetSteps; step++) {
    const a = await refresh();
    if (a.request.kind === 'none' || a.gameOver) return 'gone';

    const ok = of(a, 'button').find((b) => b.id === 'OK' && clickable(b));
    if (ok) { await clickOne(ok, 'commit'); return 'played'; }

    // A skill's inline chooser (SkillCombo / SkillSpin) has to be given a value
    // before OK will ever light; it is part of the answer, not decoration.
    const chips = of(a, 'chip').filter((c) => clickable(c) && !c.selected);
    if (chips.length && step === 0) { await clickOne(pick(rng, chips), 'set-interaction'); continue; }

    const targets = of(a, 'photo').filter((p) => clickable(p) && !p.selected);
    if (targets.length) { await clickOne(pick(rng, targets), 'add-target'); continue; }

    const more = of(a, 'card')
      .filter((c) => clickable(c) && !c.selected && !pressed.has(c.cid));
    if (more.length && step < ctx.maxExtraCards) {
      const c = pick(rng, more);
      pressed.add(c.cid);
      await clickOne(c, 'add-card');
      continue;
    }

    break;
  }

  // Dead end. Unwind, most-recent kind first, so the scene is clean for the
  // next opener.
  say('back-out', { group: opener?.group ?? 'target', id: opener?.cid ?? opener?.name ?? null });
  for (let round = 0; round < 12; round++) {
    const a = await refresh();
    if (a.request.kind === 'none' || a.gameOver) return 'gone';
    const sel = [
      ...of(a, 'photo').filter((x) => x.selected && x.box),
      ...of(a, 'card').filter((x) => x.selected && x.box),
      ...of(a, 'skill').filter((x) => x.selected && x.box),
    ];
    if (!sel.length) break;
    await seat.click(sel[0].box);
    await ctx.settle();
  }
  return 'dead-end';
}

/** Defaults tuned to keep games moving while still exercising both branches. */
export function makeContext({ seed, settle, deadline, bias }) {
  return {
    rng: rngFrom(seed),
    settle,
    deadline,
    /**
     * What the campaign has never covered, as three sets of ids: `generals`,
     * `skills`, `cards`. Used only to reorder options the app already offered.
     * Empty sets mean "everything is covered" and the driver goes back to
     * picking uniformly, which is the right behaviour — a campaign that has
     * seen everything should be re-rolling the dice, not chasing itself.
     */
    bias: bias ?? { generals: new Set(), skills: new Set(), cards: new Set() },
    /** How often a PlayCard request actually plays rather than ending. */
    playCardP: 0.8,
    /** How often a response request (jink/peach/wuxie) is answered with a card. */
    respondP: 0.85,
    /** How often an optional skill is invoked. */
    invokeSkillP: 0.75,
    /** How often a skill is preferred over a card as an opener. */
    skillFirstP: 0.35,
    maxPlaysPerTurn: 6,
    /**
     * How many add-a-card / add-a-target rounds one attempt gets.
     *
     * These were 6 and 2, and 2 is not enough to answer the discard phase. A
     * seat holding eight cards at its discard step is asked to drop five, and
     * OK does not light until the fifth is selected — so an attempt capped at
     * three selections could never light it, backed out, tried every other
     * opener, backed out of those too, and finally handed the turn to the AI
     * on the engine's 30-second timeout. Six of those in one campaign, each
     * costing half a minute of a real game and each logged as an
     * unanswerable screen, which is what a product bug looks like.
     *
     * The loop still stops the instant OK lights or the scene stops enabling
     * cards, so a higher cap does not mean more clicks in the common case —
     * it only stops the driver giving up before the app was finished asking.
     */
    maxTargetSteps: 16,
    maxExtraCards: 12,
    playsThisTurn: 0,
  };
}

export { of, clickable, shuffled, pick };
