/**
 * The checks. These are the point of the suite.
 *
 * Every one of them exists because the thing it asserts has already shipped
 * broken at least once, or because the user reported it:
 *
 *  - CONSERVATION. A prior bug moved a card from the table to the discard pile
 *    and counted it in both, so the deck grew. Counting cards is the only check
 *    that notices; counting DOM nodes is what let it through.
 *  - GEOMETRY. Eight seats existed in the DOM while `.fk-seats` was 0 px tall
 *    and the whole table was clipped to a strip. A suite that counts elements
 *    passes that. A suite that measures does not.
 *  - LIVENESS. "The second player is stuck on the choose-general screen" is
 *    only a bug you can act on once it has a threshold and a timestamp.
 *  - AGREEMENT. Two tabs watching one game must converge. Transient skew is
 *    normal — a flush lands on one tab first — so only skew that survives the
 *    settle window counts.
 *  - RETENTION. A hand may only change by moves the engine actually announced.
 *
 * Nothing here fails on a single sample. A burst of notify messages is applied
 * between renders, so any one read can catch the model mid-flight; every check
 * that could be transient re-reads and only reports what persists. A suite that
 * cries wolf on flush skew gets ignored, and an ignored suite is worse than none.
 */

/** How long a disagreement or a shortfall must persist before it is a bug. */
export const THRESHOLDS = {
  /**
   * A request that offers nothing clickable. The engine sends `AskFor*` and
   * the `UpdateRequestUI` that populates it in the same flush, so anything past
   * a few seconds means the scene diff never arrived or the render is wedged.
   * This is the signature of "stuck on the choose-general screen".
   */
  answerableMs: 6000,
  /**
   * A request still open past its own timeout. The engine hands an unanswered
   * request to the AI at `focus.timeout` (15 s by default, 30 s for a response)
   * and then sends `CancelRequest`; if the request is still open well past
   * that, the client missed the close.
   */
  requestGraceMs: 12000,
  /**
   * No shared state moved anywhere. With six bots answering instantly, the
   * longest legitimate gap is one human seat's request timeout plus the round
   * trip — 30 s at the outside — so 75 s is comfortably past anything normal.
   */
  stallMs: 75000,
  /** How long two tabs get to converge before their difference is a desync. */
  settleMs: 10000,
  /**
   * A main thread frozen longer than this is a delay finding.
   *
   * It used to be 3 000 ms, which was the right number for the wrong
   * measurement: the old block figure was a CDP round trip and carried the
   * transport, node's own busyness and the cost of the audit's own `snap()`,
   * so the threshold had to be set high enough to clear all that noise. The
   * number this is now compared against is the page's own timer overshoot,
   * where 500 ms means the page did nothing at all for half a second and a
   * click made in that window went nowhere. In a card game that is felt, so it
   * is reported.
   */
  blockedMs: 500,
  /** `.fk-seats` shorter than this cannot be showing a real ring of seats. */
  minSeatsH: 240,
};

/** Console noise that is not the app's fault and must not drown the signal. */
const IGNORED_CONSOLE = [
  /favicon/i,
  /Failed to load resource.*404/i,
  /Download the React DevTools/i,
  /\[vite\]/i,
];

const isNoise = (line) => IGNORED_CONSOLE.some((re) => re.test(line));

export class Auditor {
  constructor({ seats, thresholds = {} }) {
    this.t = { ...THRESHOLDS, ...thresholds };
    this.seatIds = seats;
    this.findings = [];
    /** Per-seat rolling state. */
    this.per = Object.fromEntries(seats.map((id) => [id, {
      lastSnap: null,
      deckSize: null,
      deckCandidate: null,
      request: null,          // { command, openedAt, seq, answerableAt }
      conservationSuspect: null,
      lastHand: null,
      lastHandSeq: 0,
      lastReply: null,
    }]));
    this.lastFingerprint = null;
    this.lastFingerprintAt = Date.now();
    this.settleSamples = [];
    this.latency = { answerable: [], decision: [], replyToChange: [] };
    this.blocked = [];
    /**
     * How many times each check actually ran. A check that never ran must be
     * reported as "not exercised", never as a pass — a suite that shows green
     * for a check it skipped is the failure mode this whole thing exists to
     * avoid.
     */
    this.ran = { conservation: 0, agreement: 0, retention: 0, geometry: 0, liveness: 0, fidelity: 0, reachable: 0, replies: 0 };
  }

  /** Record a finding once per (rule, key); repeats become a count. */
  report(rule, seat, message, detail = {}) {
    const key = `${rule}|${seat}|${detail.key ?? message}`;
    const prev = this.findings.find((f) => f.key === key);
    if (prev) { prev.count += 1; prev.lastAt = Date.now(); return prev; }
    const f = {
      key, rule, seat, message, detail, count: 1,
      firstAt: Date.now(), lastAt: Date.now(),
      severity: detail.severity ?? 'fail',
    };
    this.findings.push(f);
    return f;
  }

  /* ------------------------------------------------------- card conservation */

  /**
   * Every card in exactly one place.
   *
   * The total is the engine's own draw-pile number plus every card this seat
   * has been told the location of, minus the ones whose location IS the draw
   * pile — those are already inside the engine's number, and adding them is
   * precisely the double count this check exists to find.
   */
  conservation(seatId, snap, expectedDeck) {
    const p = this.per[seatId];
    if (!snap.started || snap.drawPile == null) return;
    // The deck size is whatever the game settled on once it is actually
    // dealing, rather than a constant baked in here: the number depends on
    // which packs the room enabled, and a hard 160 would fail a legitimate
    // configuration while telling you nothing about a real leak.
    if (p.deckSize == null) {
      // The baseline has to be confirmed, not taken on sight. `UpdateDrawPile`
      // sets an absolute number and the `MoveCards` that justifies it is a
      // separate message, so a single read taken between the two lands a few
      // cards short — and a baseline that starts low makes every later check
      // compare against the wrong deck. Two consecutive readings agreeing is
      // enough, because the number is constant whenever it is not mid-burst.
      if (!(snap.drawPile > 0 && snap.knownCards > 0)) return;
      if (p.deckCandidate === snap.universe) p.deckSize = snap.universe;
      else p.deckCandidate = snap.universe;
      return;
    }
    const want = expectedDeck ?? p.deckSize;
    this.ran.conservation += 1;
    if (snap.universe === want) { p.conservationSuspect = null; return; }
    // One sample can land mid-burst. Two, a beat apart, agreeing on the same
    // wrong number, cannot.
    if (!p.conservationSuspect) {
      p.conservationSuspect = { value: snap.universe, at: snap.at, seq: snap.seq };
      return;
    }
    if (p.conservationSuspect.value !== snap.universe) {
      p.conservationSuspect = { value: snap.universe, at: snap.at, seq: snap.seq };
      return;
    }
    // A real leak is permanent, so waiting longer costs nothing and rules out
    // the one-card blip a flush can show between `UpdateDrawPile` and the move
    // that justifies it.
    if (snap.at - p.conservationSuspect.at < 2500) return;
    // One finding per seat, not one per wrong total: the count is the number of
    // decision boundaries the deck was wrong at, and the range is how far it
    // drifted. Thirty near-identical entries bury everything else in the report.
    const f = this.report('conservation', seatId,
      `cards do not add up: ${snap.universe} accounted for, ${want} expected`, {
        key: 'universe',
        expected: want, firstSeen: snap.universe, worst: snap.universe,
        drawPile: snap.drawPile, discard: snap.discard,
        // Derived cards (negative ids) are excluded from `universe`; reported
        // here so a real leak is not confused with a skill printing a card.
        printedCards: snap.printedCards ?? 0,
        onScreen: snap.dom?.piles ?? null,
        areas: snap.areas, seq: snap.seq, round: snap.round,
        firstRound: snap.round,
      });
    if (Math.abs(snap.universe - want) > Math.abs(f.detail.worst - want)) {
      f.detail.worst = snap.universe;
      f.detail.onScreen = snap.dom?.piles ?? f.detail.onScreen;
      f.detail.drawPile = snap.drawPile;
      f.detail.discard = snap.discard;
      f.detail.seq = snap.seq;
      f.detail.round = snap.round;
      f.message = `cards do not add up: up to ${snap.universe} accounted for, ${want} expected`;
    }
  }

  /* ------------------------------------------------------------- geometry */

  /**
   * The picture, not the model. Eight photos in the DOM with `.fk-seats` at
   * zero height is a table nobody can play at, and it shipped.
   */
  geometry(seatId, snap) {
    if (snap.stage !== 'room' || !snap.started || !snap.model) return;
    const d = snap.dom;
    if (!d) return;
    this.ran.geometry += 1;
    if (d.seatsH < this.t.minSeatsH) {
      this.report('geometry', seatId, `the seat ring is ${d.seatsH}px tall`, {
        key: 'seatsH', seatsH: d.seatsH, roomH: d.roomH, viewport: d.viewport, seq: snap.seq,
      });
    }
    if (snap.playerNum > 0 && d.photos < snap.playerNum) {
      this.report('geometry', seatId, `${d.photos} seats drawn for ${snap.playerNum} players`, {
        key: 'photoCount', drawn: d.photos, expected: snap.playerNum, seq: snap.seq,
      });
    }
    if (d.photos > 0 && d.photosOnScreen < d.photos) {
      this.report('geometry', seatId, `${d.photos - d.photosOnScreen} of ${d.photos} seats are off-screen`, {
        key: 'photosClipped', onScreen: d.photosOnScreen, total: d.photos,
        viewport: d.viewport, seq: snap.seq,
      });
    }
    if (d.handCards > 0 && d.handOnScreen < d.handCards) {
      this.report('geometry', seatId, `${d.handCards - d.handOnScreen} of ${d.handCards} hand cards are off-screen`, {
        key: 'handClipped', onScreen: d.handOnScreen, total: d.handCards, seq: snap.seq,
      });
    }
    // The model says the seat holds n cards; the dashboard must draw them.
    const own = (snap.ownHand ?? []).length;
    if (own > 0 && d.handCards < own) {
      this.report('render', seatId, `hand holds ${own} cards but ${d.handCards} are drawn`, {
        key: 'handUnderdrawn', model: own, drawn: d.handCards, seq: snap.seq,
      });
    }
  }

  /**
   * The picture and the model must say the same thing about every control.
   *
   * `enabled` on a scene item is the engine's ruling on whether a move is
   * legal; `disabled` on the button and `fk-card--enabled` on the card are what
   * the player can actually press. When those two disagree the player is either
   * being offered a move the engine will refuse or denied one it would allow,
   * and both are invisible to a check that only ever reads one of them.
   */
  fidelity(seatId, snap, actions) {
    if (!actions?.actions?.length) return;
    this.ran.fidelity += 1;
    for (const it of actions.actions) {
      if (it.sceneEnabled == null || !it.offered) continue;
      if (it.sceneEnabled === it.enabled) continue;
      const what = `${it.group}:${it.id ?? it.cid ?? it.name}`;
      this.report('render', seatId,
        `${what} is ${it.enabled ? 'pressable' : 'greyed'} on screen but the scene says `
        + `${it.sceneEnabled ? 'enabled' : 'disabled'}`, {
          key: `fidelity:${it.group}`,
          control: what, dom: it.enabled, scene: it.sceneEnabled,
          command: snap.request?.command ?? null, seq: snap.seq,
        });
    }
  }

  /**
   * A control the app is offering must be one a mouse can actually reach.
   *
   * Enabled, visible and correctly sized is not the same as clickable. An
   * overlay drawn on top absorbs the press, and nothing anywhere reports an
   * error: the click is delivered, to the overlay, and the button it was aimed
   * at never hears about it. From the outside this is indistinguishable from
   * the app ignoring a reply, which is how it survived — five nullification
   * prompts a game where Cancel was offered, was pressed, and produced no
   * interact at all.
   *
   * The probe asks the browser's own hit testing what is at the control's
   * centre point. If the answer is something else, a player has the same
   * problem the driver does.
   */
  reachable(seatId, snap, actions) {
    if (!actions?.actions?.length) return;
    this.ran.reachable += 1;
    for (const it of actions.actions) {
      if (!it.enabled || !it.visible || !it.box) continue;
      if (it.box.hit !== false) continue;
      const what = `${it.group}:${it.id ?? it.cid ?? it.name ?? it.idx}`;
      this.report('obscured', seatId,
        `${what} is offered and enabled but ${it.box.over ?? 'something'} is drawn `
        + `on top of it — a click at its centre never reaches it`, {
          key: `obscured:${it.group}:${it.box.over ?? '?'}`,
          control: what, over: it.box.over ?? null,
          at: `${it.box.x},${it.box.y}`,
          command: snap?.request?.command ?? null,
          prompt: actions.prompt ?? null,
          seq: snap?.seq ?? null,
        });
    }
  }

  /**
   * One answer, one reply on the wire.
   *
   * The client calls `replyToServer` once per answer, or it should. Across
   * five runs of this suite, 70 of 270 replies went out twice with identical
   * payloads inside a millisecond of each other — a quarter of every answer
   * this game has ever sent. A duplicate is not obviously harmful on its own,
   * which is exactly why it survived: the engine takes the first and discards
   * the second, and nothing anywhere complains. It stops being harmless when
   * the second arrives after the request has closed, because the seat is then
   * answering a question that no longer exists.
   *
   * Counted off `lua.replyToServer` directly, which is the last thing the
   * client does before the wire, so there is nowhere for a duplicate to hide.
   */
  replyEcho(seatId, entries) {
    const p = this.per[seatId];
    for (const e of entries) {
      if (e.kind !== 'reply') continue;
      this.ran.replies += 1;
      const payload = JSON.stringify(e.detail ?? null);
      const prev = p.lastReply;
      p.lastReply = { at: e.t, payload };
      if (!prev || prev.payload !== payload || e.t - prev.at > 50) continue;
      this.report('duplicate-reply', seatId,
        `the same reply was sent twice ${e.t - prev.at} ms apart`, {
          key: 'duplicate-reply', severity: 'warn',
          payload: payload.slice(0, 60), gapMs: e.t - prev.at,
        });
    }
  }

  /* ------------------------------------------------------------- liveness */

  /**
   * A request that opens must become answerable, and must close.
   *
   * `actions` is passed in because "answerable" means the app is offering the
   * seat something it can actually click — a dialog with every option greyed
   * out is exactly as stuck as no dialog at all, and only the second of those
   * is visible to a check that looks at the request alone.
   */
  liveness(seatId, snap, actions) {
    const p = this.per[seatId];
    const open = snap.request && snap.request.kind !== 'none';
    const cmd = open ? snap.request.command : null;

    if (!open) {
      if (p.request && p.request.answeredAt == null) p.request.answeredAt = snap.at;
      p.request = null;
      return;
    }

    // `MoveFocus` arrives with the request and stamps the moment it landed in
    // this tab, so it dates the question far more precisely than the poll that
    // happened to notice it — which is the difference between measuring the
    // app and measuring the poll interval.
    const mine = snap.focus && snap.selfId != null && snap.focus.ids.includes(snap.selfId);
    const arrivedAt = mine ? snap.focus.startedAt : snap.at;

    if (!p.request || p.request.command !== cmd || p.request.arrivedAt !== arrivedAt) {
      p.request = {
        command: cmd, openedAt: snap.at, arrivedAt, seq: snap.seq,
        answerableAt: null, flagged: {},
      };
    }
    const r = p.request;

    this.ran.liveness += 1;
    const offered = (actions?.actions ?? []).filter((x) => x.enabled && x.visible && x.box);
    if (offered.length && r.answerableAt == null) {
      r.answerableAt = snap.at;
      // Measured from when the question landed in this tab, not from when the
      // poll noticed it — otherwise the number reports the poll interval and
      // the "stuck on the choose screen" delay stays invisible.
      this.latency.answerable.push({ seat: seatId, command: cmd, ms: snap.at - r.arrivedAt });
    }

    const openMs = snap.at - r.arrivedAt;
    if (r.answerableAt == null && openMs > this.t.answerableMs && !r.flagged.answerable) {
      r.flagged.answerable = true;
      this.report('liveness', seatId,
        `${cmd} has been open ${Math.round(openMs / 1000)}s with nothing the seat can click`, {
          key: `unanswerable:${cmd}`, command: cmd, openMs,
          stage: snap.stage, dialog: snap.dom?.dialogTitle ?? null,
          prompt: snap.scene?.prompt ?? null,
          scene: snap.scene?.items ?? null,
          seq: snap.seq,
        });
    }

    // Another seat's `MoveFocus` carries another seat's clock; using it would
    // budget this request against a timeout that was never its own.
    const budget = (mine ? snap.focus.timeout : 30000) + this.t.requestGraceMs;
    if (openMs > budget && !r.flagged.stuck) {
      r.flagged.stuck = true;
      this.report('liveness', seatId,
        `${cmd} still open ${Math.round(openMs / 1000)}s after opening (engine timeout ${snap.focus?.timeout ?? '?'}ms)`, {
          key: `stuck:${cmd}`, command: cmd, openMs,
          focus: snap.focus, offered: offered.length, seq: snap.seq,
        });
    }
  }

  /** Time from committing a reply to the next thing the engine said. */
  noteReply(seatId, command, decisionMs, replyToChangeMs) {
    if (decisionMs != null) this.latency.decision.push({ seat: seatId, command, ms: decisionMs });
    if (replyToChangeMs != null) this.latency.replyToChange.push({ seat: seatId, command, ms: replyToChangeMs });
  }

  noteBlocked(seatId, ms, where) {
    if (ms < this.t.blockedMs) return;
    this.blocked.push({ seat: seatId, ms, where, at: Date.now() });
    const f = this.report('delay', seatId, `the page stopped answering for ${ms}ms during ${where}`, {
      key: `blocked:${where}`, worstMs: ms, where, severity: 'warn',
    });
    if (ms > f.detail.worstMs) {
      f.detail.worstMs = ms;
      f.message = `the page stopped answering for ${ms}ms during ${where}`;
    }
  }

  /* -------------------------------------------------------- global stall */

  /** A fingerprint of everything that must move while a game is being played. */
  static fingerprint(snaps) {
    // Deliberately NOT the stream counter. `RefreshStatusSkills` ticks every
    // 200 ms and emits MaxCard / PropertyUpdate / UpdateDrawPile forever, so a
    // fingerprint containing the message index changes constantly and the stall
    // check can never fire — a check that cannot fail is worse than no check.
    // What is here is what a player would see stop moving.
    return snaps.map((s) => [
      s.round, s.currentId, s.drawPile, s.logLines, s.gameOver,
      Object.values(s.players ?? {}).map((p) => `${p.hp}/${p.hand}/${p.equip}/${p.dead ? 'D' : ''}`).join(','),
    ].join('|')).join(' || ');
  }

  stall(snaps) {
    if (snaps.some((s) => s.gameOver)) return;
    const fp = Auditor.fingerprint(snaps);
    const now = Date.now();
    if (fp !== this.lastFingerprint) {
      this.lastFingerprint = fp;
      this.lastFingerprintAt = now;
      return;
    }
    const still = now - this.lastFingerprintAt;
    if (still > this.t.stallMs) {
      this.lastFingerprintAt = now; // report once per window, then re-arm
      this.report('liveness', 'all',
        `nothing changed anywhere for ${Math.round(still / 1000)}s`, {
          key: 'globalStall', ms: still,
          requests: snaps.map((s) => `${s.request?.kind}:${s.request?.command ?? '-'}`),
          round: snaps[0]?.round, currentId: snaps[0]?.currentId,
        });
    }
  }

  /* --------------------------------------------------- cross-seat agreement */

  /**
   * Shared state, compared across tabs.
   *
   * Private state is excluded on purpose: a seat's own hand *contents* are
   * secret and must differ. What must not differ is the public picture — pile
   * sizes, every seat's hand *count*, hp, equipment, who is alive.
   */
  static shared(snap) {
    const players = {};
    for (const [pid, p] of Object.entries(snap.players ?? {})) {
      players[pid] = {
        hand: p.hand, equip: p.equip, judge: p.judge,
        hp: p.hp, maxHp: p.maxHp, dead: p.dead, general: p.general, seat: p.seat,
      };
    }
    return {
      drawPile: snap.drawPile, round: snap.round, playerNum: snap.playerNum,
      gameOver: snap.gameOver, players,
    };
  }

  static diffShared(a, b) {
    const out = [];
    for (const k of ['drawPile', 'round', 'playerNum', 'gameOver']) {
      if (a[k] !== b[k]) out.push({ field: k, a: a[k], b: b[k] });
    }
    const pids = new Set([...Object.keys(a.players), ...Object.keys(b.players)]);
    for (const pid of pids) {
      const pa = a.players[pid], pb = b.players[pid];
      if (!pa || !pb) { out.push({ field: `player ${pid}`, a: !!pa, b: !!pb }); continue; }
      for (const k of Object.keys(pa)) {
        if (pa[k] !== pb[k]) out.push({ field: `p${pid}.${k}`, a: pa[k], b: pb[k] });
      }
    }
    return out;
  }

  /**
   * Shared state, compared across tabs until it settles.
   *
   * Two things make this harder than it looks. Tabs are sampled one after the
   * other, so in a game that is actually moving the two reads are never at the
   * same instant and SOMETHING always differs — a check that reports the first
   * difference it sees reports every fast turn as a desync. And a flush landing
   * on one tab before the other is normal and self-correcting.
   *
   * So the rule is: a disagreement counts only if the SAME field holds the SAME
   * pair of values in every sample across the settle window. Skew moves — the
   * draw pile that was two behind is four behind and then equal. A desync does
   * not: one tab is simply wrong, and stays wrong, about one thing. Taking the
   * intersection over the window is what separates them, and it is why this
   * check can be trusted enough to act on.
   */
  async agreement(snaps, resample) {
    if (this.seatIds.length < 2) return;
    // Once any tab has GameOver the room stops being a shared live game — the
    // finished side clears its piles and the other is legitimately a broadcast
    // behind. Comparing across that boundary reports the end of the game as a
    // desync. Whether the ending reaches every seat is checked on its own.
    if (snaps.some((s) => s.gameOver)) return;
    this.ran.agreement += 1;

    const diffOf = (set) => {
      const out = [];
      for (let i = 1; i < set.length; i++) {
        for (const d of Auditor.diffShared(Auditor.shared(set[0]), Auditor.shared(set[i]))) {
          out.push({ ...d, between: `${this.seatIds[0]}/${this.seatIds[i]}` });
        }
      }
      return out;
    };
    const keyOf = (d) => `${d.between} ${d.field} ${d.a}\u2260${d.b}`;

    const started = Date.now();
    let persistent = null;   // the disagreements present in EVERY sample so far
    let samples = 0;

    for (;;) {
      const set = samples === 0 ? snaps : await resample();
      if (!set || set.some((x) => !x || !x.model)) return;
      if (set.some((x) => x.gameOver)) return;
      samples += 1;
      const found = diffOf(set);
      if (!found.length) { this.settleSamples.push(Date.now() - started); return; }

      const here = new Map(found.map((d) => [keyOf(d), d]));
      if (persistent === null) persistent = here;
      else {
        for (const k of [...persistent.keys()]) if (!here.has(k)) persistent.delete(k);
        if (persistent.size === 0) { this.settleSamples.push(Date.now() - started); return; }
      }

      if (Date.now() - started >= this.t.settleMs) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!persistent || persistent.size === 0) { this.settleSamples.push(Date.now() - started); return; }
    const stuck = [...persistent.values()];
    this.report('agreement', 'all',
      `tabs disagree on the same thing in all ${samples} samples over ${this.t.settleMs}ms: `
      + stuck.slice(0, 4).map((d) => `${d.field} ${d.a}\u2260${d.b}`).join(', '), {
        key: `desync:${stuck.map((d) => d.field).slice(0, 4).join(',')}`,
        diff: stuck.slice(0, 20), samples, settleMs: this.t.settleMs,
      });
  }

  /* -------------------------------------------------------- hand retention */

  /**
   * A seat's own hand may change only by moves the engine announced.
   *
   * The stream is sliced by the logical clock the snapshot carries, so the
   * accounting lines up exactly with the window between two decisions rather
   * than with wall-clock guesswork.
   */
  handRetention(seatId, snap, stream) {
    const p = this.per[seatId];
    const hand = snap.ownHand ?? [];
    if (snap.selfId == null) return;
    if (p.lastHand == null) { p.lastHand = hand; p.lastHandSeq = snap.seq; return; }
    this.ran.retention += 1;

    const before = new Set(p.lastHand);
    const after = new Set(hand);
    const gained = hand.filter((c) => !before.has(c));
    const lost = p.lastHand.filter((c) => !after.has(c));

    if (gained.length || lost.length) {
      const window = stream.filter((e) => e.i > p.lastHandSeq && e.i <= snap.seq && e.c === 'MoveCards');
      const inMoves = new Set();
      const outMoves = new Set();
      for (const e of window) {
        for (const m of e.d?.merged ?? []) {
          if (m.toArea === 1 && m.to === snap.selfId) for (const id of m.ids ?? []) inMoves.add(id);
          if (m.fromArea === 1 && m.from === snap.selfId) for (const id of m.ids ?? []) outMoves.add(id);
        }
      }
      const unexplainedIn = gained.filter((c) => !inMoves.has(c));
      const unexplainedOut = lost.filter((c) => !outMoves.has(c));
      if (unexplainedIn.length || unexplainedOut.length) {
        this.report('retention', seatId,
          `hand changed without a move: +[${unexplainedIn}] -[${unexplainedOut}]`, {
            key: 'unexplained',
            gained, lost, unexplainedIn, unexplainedOut,
            fromSeq: p.lastHandSeq, toSeq: snap.seq,
            moves: window.length, round: snap.round,
          });
      }
    }
    p.lastHand = hand;
    p.lastHandSeq = snap.seq;
  }

  /* ---------------------------------------------------------------- errors */

  errors(seatId, seat, snap) {
    for (const line of seat.thrown()) {
      this.report('exception', seatId, line.split('\n')[0], { key: line.slice(0, 120), full: line.slice(0, 900) });
    }
    for (const line of seat.consoleErrors()) {
      if (isNoise(line)) continue;
      this.report('console', seatId, line.slice(0, 240), { key: line.slice(0, 120) });
    }
    for (const e of seat.pageErrors) {
      this.report(e.kind === 'unhandledrejection' ? 'rejection' : 'exception', seatId,
        e.msg.slice(0, 240), { key: e.msg.slice(0, 120), stack: e.stack });
    }
    seat.pageErrors.length = 0;
    if (snap?.boundary) {
      this.report('boundary', seatId, `an error boundary caught: ${snap.boundary}`, {
        key: snap.boundary.slice(0, 120), seq: snap.seq,
      });
    }
  }

  /* ---------------------------------------------------------------- verdict */

  /** Deck sizes each seat settled on, so the conservation check is auditable. */
  get deckSizes() {
    return Object.fromEntries(Object.entries(this.per).map(([id, p]) => [id, p.deckSize]));
  }

  get failures() { return this.findings.filter((f) => f.severity === 'fail'); }
  get warnings() { return this.findings.filter((f) => f.severity !== 'fail'); }
  get passed() { return this.failures.length === 0; }
}
