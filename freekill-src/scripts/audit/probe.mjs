/**
 * The in-page instrument.
 *
 * Everything the auditor knows about a seat is read by this script, running in
 * the tab. It does three jobs and nothing else:
 *
 *  1. FINDS THE LIVE MODEL. `RoomView` builds a `RoomServices` object and hands
 *     it down a React context. There is no window global for it, so the probe
 *     walks up the fiber from `.fk-room` until it finds the provider's value.
 *     That gives it `store.state` (card areas, hands, hp, piles) and
 *     `store.scene` — and `scene` is the ONLY place selectability exists, which
 *     is why the driver never computes legality: it reads `enabled` and clicks.
 *
 *  2. RECORDS THE STREAM. It wraps `store.applyNotify`, `lua.interact` and
 *     `lua.replyToServer` so every message in and every action out is
 *     timestamped in order. A poller cannot see a request that opened and
 *     closed between two samples; this does. The wrappers always call through —
 *     they observe, they never decide — and `--no-hook` turns them off if you
 *     ever need to prove the instrument is not the bug.
 *
 *  3. MEASURES THE PICTURE. Every action it offers the driver carries the
 *     element's real `getBoundingClientRect()`. A control that the model says
 *     is enabled but that has no box on screen is not a control a player can
 *     use, and this is where that shows up — the collapsed-board bug survived a
 *     green suite precisely because nothing looked at geometry.
 *
 * The source is a string because it is installed with
 * `Page.addScriptToEvaluateOnNewDocument`, so it is in place before the app's
 * first line runs and survives every reload.
 */

/** Bump when the body changes; a stale tab reinstalls instead of lying. */
export const PROBE_VERSION = 12;

export const PROBE_SRC = String.raw`
(function () {
  if (window.__fkAudit && window.__fkAudit.v === ${PROBE_VERSION}) return 'present';
  var A = {};
  A.v = ${PROBE_VERSION};
  A.pageErrors = [];
  A.log = [];        // the notify stream, in order
  A.acts = [];       // what this tab sent back, in order
  A.seq = 0;
  A.hooked = false;
  A.hookEnabled = true;
  A.startedAt = Date.now();

  var MAX_LOG = 60000;

  window.addEventListener('error', function (e) {
    A.pageErrors.push({
      at: Date.now(), kind: 'error',
      msg: String((e && e.message) || (e && e.error) || 'error'),
      stack: e && e.error && e.error.stack ? String(e.error.stack).split('\n').slice(0, 4).join(' | ') : ''
    });
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    A.pageErrors.push({
      at: Date.now(), kind: 'unhandledrejection',
      msg: String((r && r.message) || r),
      stack: r && r.stack ? String(r.stack).split('\n').slice(0, 4).join(' | ') : ''
    });
  });

  /* ------------------------------------------------------------- fiber */

  function fiberOf(el) {
    if (!el) return null;
    for (var k in el) {
      if (k.indexOf('__reactFiber$') === 0) return el[k];
    }
    return null;
  }

  /**
   * The RoomProvider's value. Walking up from .fk-room passes RoomBody and
   * lands on the context provider whose memoizedProps.value is RoomServices.
   */
  A.services = function () {
    var root = document.querySelector('.fk-room');
    if (!root) return null;
    var f = fiberOf(root);
    for (var hops = 0; f && hops < 80; hops++, f = f['return']) {
      var v = f.memoizedProps && f.memoizedProps.value;
      if (v && v.store && v.lua && v.naming) return v;
    }
    return null;
  };

  /** Any class component under .fk-room currently holding an error. */
  A.boundaryError = function () {
    var root = document.querySelector('.fk-room');
    if (!root) return null;
    var stack = [fiberOf(root)];
    var seen = 0;
    while (stack.length && seen++ < 1200) {
      var f = stack.pop();
      if (!f) continue;
      var sn = f.stateNode;
      if (sn && sn.state && sn.state.error) {
        return String(sn.state.error.message || sn.state.error);
      }
      if (f.child) stack.push(f.child);
      if (f !== stack[0] && f.sibling && seen > 1) stack.push(f.sibling);
    }
    return null;
  };

  /* ------------------------------------------------------------ recording */

  function trim(v, max) {
    try {
      var s = JSON.stringify(v);
      if (s === undefined) return null;
      return s.length > max ? s.slice(0, max) + '…' : JSON.parse(s);
    } catch (e) { return '<unserialisable>'; }
  }

  /** Keep a useful payload per command; drop the 70% that is bookkeeping. */
  function payloadOf(cmd, data) {
    switch (cmd) {
      case 'MoveCards': {
        var d = data || {};
        var merged = (d.merged || []).map(function (m) {
          return {
            fromArea: m.fromArea, toArea: m.toArea, from: m.from, to: m.to,
            ids: (m.ids || []).slice(0, 64),
            specialName: m.specialName, fromSpecialName: m.fromSpecialName
          };
        });
        return { merged: merged, event_id: d.event_id };
      }
      case 'GameLog': return { len: JSON.stringify(data || '').length };
      case 'UpdateRequestUI': {
        var c = data || {}, out = { _type: c._type, _prompt: c._prompt };
        if (c._new) out._new = c._new.slice(0, 60).map(function (n) {
          return { type: n.type, id: n.data && n.data.id, enabled: n.data && n.data.enabled, selected: n.data && n.data.selected, state: n.data && n.data.state };
        });
        if (c._delete) out._delete = c._delete.slice(0, 60).map(function (n) { return { type: n.type, id: n.id }; });
        for (var k in c) {
          if (k.charAt(0) === '_') continue;
          if (!Array.isArray(c[k])) continue;
          out[k] = c[k].slice(0, 60).map(function (i) { return { id: i.id, enabled: i.enabled, selected: i.selected, state: i.state }; });
        }
        return out;
      }
      case 'Animate': return trim(data, 400);
      case 'MoveFocus': return trim(data, 400);
      default: return trim(data, 2500);
    }
  }

  /**
   * A question from the engine, as opposed to the bookkeeping around one.
   * "EmptyRequest" is the engine's filler for a seat with nothing to be asked
   * and draws no UI, so it is not a question anybody answers.
   */
  var REQUEST_CMD = /^(AskFor|PlayCard$|MiniGame$|CustomDialog$)/;

  A.reqSeq = 0;     // stream index of the newest question
  A.reqCmd = null;
  A.reqAt = 0;

  A.record = function (cmd, data) {
    var c = String(cmd);
    A.seq += 1;
    // The one piece of state the driver trusts over the room's own request
    // field: a question exists because the engine asked it, and that is true
    // whether or not the client got the bookkeeping right. Answering off the
    // room's "request" instead means a build that forgets to close a request
    // gets answered over and over, which reads as a driver bug and is not one.
    if (c !== 'EmptyRequest' && REQUEST_CMD.test(c)) {
      A.reqSeq = A.seq; A.reqCmd = c; A.reqAt = Date.now();
    }
    if (A.log.length >= MAX_LOG) return;
    A.log.push({ i: A.seq, t: Date.now(), c: c, d: payloadOf(c, data) });
  };

  A.note = function (kind, detail) {
    A.seq += 1;
    A.acts.push({ i: A.seq, t: Date.now(), kind: kind, detail: detail === undefined ? null : trim(detail, 1200) });
  };

  /** Wrap the seams. Always calls through; observation only. */
  A.hook = function () {
    var sv = A.services();
    if (!sv) return false;
    if (sv.store.__fkHooked && sv.lua.__fkHooked) { A.hooked = true; return true; }

    if (!sv.store.__fkHooked) {
      var origNotify = sv.store.applyNotify;
      sv.store.applyNotify = function (cmd, data) {
        if (A.hookEnabled) { try { A.record(cmd, data); } catch (e) { /* never break the room */ } }
        return origNotify(cmd, data);
      };
      Object.defineProperty(sv.store, '__fkHooked', { value: true, enumerable: false });
    }

    if (!sv.lua.__fkHooked) {
      var origInteract = sv.lua.interact.bind(sv.lua);
      sv.lua.interact = function (elemType, id, action, data) {
        if (A.hookEnabled) { try { A.note('interact', { elemType: elemType, id: id, action: action, data: data }); } catch (e) {} }
        return origInteract(elemType, id, action, data);
      };
      var origReply = sv.lua.replyToServer.bind(sv.lua);
      sv.lua.replyToServer = function (value) {
        if (A.hookEnabled) { try { A.note('reply', value); } catch (e) {} }
        return origReply(value);
      };
      Object.defineProperty(sv.lua, '__fkHooked', { value: true, enumerable: false });
    }
    A.hooked = true;
    return true;
  };

  /**
   * Keep trying to hook.
   *
   * The room is built when the table mounts, and rebuilt from scratch on every
   * reload and every new client — a one-shot hook would silently stop recording
   * exactly when a rejoin is being tested. 200 ms matches the room's own
   * status-skill tick, and the check is one property read once hooked.
   */
  A.autoHook = setInterval(function () {
    try {
      var sv = A.services();
      if (sv && !(sv.store.__fkHooked && sv.lua.__fkHooked)) A.hook();
      else if (!sv) A.hooked = false;
    } catch (e) { /* between renders */ }
  }, 200);

  /** Drain the recorded stream; the driver keeps the whole history node-side. */
  A.drain = function () {
    var out = { log: A.log, acts: A.acts, errors: A.pageErrors };
    A.log = []; A.acts = []; A.pageErrors = [];
    return out;
  };

  /* ------------------------------------------------------------- geometry */

  function boxOf(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    return {
      x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
      w: Math.round(r.width), h: Math.round(r.height),
      onScreen: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
    };
  }

  /**
   * The cheapest possible "has anything happened". The store publishes once per
   * notify burst, so its version is the right beat to settle a click against —
   * a fixed sleep is either a stall or a race, and both cost whole games.
   */
  A.tick = function () {
    var sv = A.services();
    if (!sv) return { v: -1, seq: A.seq, req: null, out: -1 };
    return {
      v: sv.store.getVersion(),
      seq: A.seq,
      req: sv.store.state.request.kind + ':' + (sv.store.state.request.command || '-'),
      out: sv.store.outbound.length,
      over: sv.store.state.gameOver,
      reqSeq: A.reqSeq, reqCmd: A.reqCmd, reqAt: A.reqAt
    };
  };

  /* --------------------------------------------------------------- stage */

  A.stage = function () {
    if (document.querySelector('.fk-room')) return 'room';
    if (document.querySelector('.fk-curtain')) {
      var c = document.querySelector('.fk-curtain');
      return 'curtain:' + (c.dataset ? (c.dataset.phase || '?') : '?');
    }
    if (document.querySelector('.landing input[type=text]')) return 'landing';
    if (document.querySelector('.rooms')) return 'lobby';
    if (document.querySelector('.seat')) return 'waiting';
    var h = location.hash || '';
    if (h.indexOf('#/room/') === 0) return 'room?';
    if (h.indexOf('#/lobby') === 0) return 'lobby?';
    return 'unknown';
  };

  /* ------------------------------------------------------------ snapshot */

  var AREA_NAME = {
    0: 'unknown', 1: 'hand', 2: 'equip', 3: 'judge', 4: 'special',
    5: 'processing', 6: 'draw', 7: 'discard', 8: 'void'
  };

  A.snap = function () {
    // seq is the logical clock shared with the recorded stream: everything the
    // engine said up to this instant has an index <= out.seq, which is what
    // lets an accounting check line a hand up against the moves that made it.
    var out = { at: Date.now(), seq: A.seq, hooked: A.hooked, stage: A.stage(), hash: location.hash };
    var sv = A.services();
    out.model = !!sv;
    out.boundary = sv ? A.boundaryError() : null;
    if (!sv) return out;
    if (!A.hooked) { try { A.hook(); } catch (e) {} }

    var st = sv.store.state, sc = sv.store.scene;

    out.selfId = st.selfId;
    out.playerNum = st.playerNum;
    out.started = st.started;
    out.round = st.round;
    out.currentId = st.currentId;
    out.gameOver = st.gameOver;
    out.circle = (st.circle || []).slice();
    out.drawPile = st.drawPileCount;
    out.discard = st.discardCount;
    out.logLines = (st.log || []).length;
    out.outbound = sv.store.outbound.length;
    out.tick = st.tick;

    out.players = {};
    var order = out.circle.length ? out.circle : Object.keys(st.players).map(Number);
    for (var i = 0; i < order.length; i++) {
      var pid = order[i], p = st.players[pid];
      if (!p) continue;
      out.players[pid] = {
        seat: p.seat, index: p.index, name: p.screenName,
        general: p.general, deputy: p.deputyGeneral, kingdom: p.kingdom,
        role: p.roleShown || p.dead ? p.role : (p.role === 'lord' ? 'lord' : null),
        hp: p.hp, maxHp: p.maxHp, shield: p.shield, phase: p.phase,
        maxCards: p.maxCards, dead: p.dead, dying: p.dying, chained: p.chained,
        netstate: p.netstate, skills: (p.skills || []).slice(),
        hand: (st.hands[pid] || []).length,
        equip: (st.equips[pid] || []).length,
        judge: (st.judge[pid] || []).length
      };
    }

    // Card conservation is counted off cardArea, which is the client's own
    // per-card bookkeeping, plus the engine's authoritative draw-pile number
    // for the cards this seat has never been told about. Cards whose area IS
    // the draw pile are already inside that number, so they are excluded here
    // rather than added twice.
    var byArea = { unknown: 0, hand: 0, equip: 0, judge: 0, special: 0, processing: 0, draw: 0, discard: 0, "void": 0 };
    var known = 0;
    for (var cid in st.cardArea) {
      var a = AREA_NAME[st.cardArea[cid]] || 'unknown';
      byArea[a] += 1;
      known += 1;
    }
    out.areas = byArea;
    out.knownCards = known;
    out.universe = st.drawPileCount + (known - byArea.draw);

    out.ownHand = st.selfId == null ? [] : (st.hands[st.selfId] || []).slice();
    out.ownEquip = st.selfId == null ? [] : (st.equips[st.selfId] || []).slice();
    out.ownJudge = st.selfId == null ? [] : (st.judge[st.selfId] || []).slice();
    var myPiles = st.selfId == null ? {} : (st.piles[st.selfId] || {});
    out.ownPiles = {};
    for (var pn in myPiles) out.ownPiles[pn] = myPiles[pn].slice();

    out.table = (st.table || []).map(function (c) {
      return { cid: c.cid, expired: !!c.expired, eventId: c.eventId || 0, virtual: !!c.virtual };
    });

    out.request = { kind: st.request.kind, command: st.request.command || null };
    // The engine's own question counter, so the driver can tell "still the one
    // I answered" from "a new one that happens to look the same".
    out.reqSeq = A.reqSeq;
    out.reqCmd = A.reqCmd;
    out.reqAt = A.reqAt;
    out.focus = st.focus
      ? { ids: st.focus.ids.slice(), command: st.focus.command, timeout: st.focus.timeout, startedAt: st.focus.startedAt }
      : null;
    out.ag = st.ag
      ? { ids: st.ag.ids.slice(), taken: Object.assign({}, st.ag.taken), interactive: st.ag.interactive, disabled: st.ag.disabled.slice() }
      : null;

    var items = {};
    for (var et in sc.items) {
      items[et] = {};
      for (var id in sc.items[et]) {
        var it = sc.items[et][id];
        items[et][id] = { enabled: it.enabled === true, selected: it.selected === true, state: it.state || null };
      }
    }
    out.scene = {
      type: sc.type, prompt: sc.prompt, active: sc.active, items: items,
      created: sc.created || null,
      promptArg: st.request && st.request.promptArg ? st.request.promptArg : null
    };

    // What the picture actually shows, independent of the model.
    var roomEl = document.querySelector('.fk-room');
    var seatsEl = document.querySelector('.fk-seats');
    var photos = [].slice.call(document.querySelectorAll('.fk-photo'));
    out.dom = {
      roomH: roomEl ? Math.round(roomEl.getBoundingClientRect().height) : 0,
      seatsH: seatsEl ? Math.round(seatsEl.getBoundingClientRect().height) : 0,
      photos: photos.length,
      photosOnScreen: photos.filter(function (el) { return !!boxOf(el) && boxOf(el).onScreen; }).length,
      handCards: document.querySelectorAll('.fk-hand .fk-card').length,
      handOnScreen: [].slice.call(document.querySelectorAll('.fk-hand .fk-card'))
        .filter(function (el) { var b = boxOf(el); return b && b.onScreen; }).length,
      tableCards: document.querySelectorAll('.fk-table .fk-card').length,
      logLines: document.querySelectorAll('.fk-log p').length,
      modal: !!document.querySelector('.fk-modal'),
      dialogTitle: (document.querySelector('.fk-dialog__title') || {}).textContent || null,
      prompt: (document.querySelector('.fk-prompt') || {}).textContent || null,
      generals: document.querySelectorAll('.fk-general').length,
      // The two numbers the player actually reads off the table. Kept as text
      // so a conservation failure can be quoted as what was on screen rather
      // than as a number out of a model nobody can see.
      piles: [].slice.call(document.querySelectorAll('.fk-piles span'))
        .map(function (el) { return (el.textContent || '').trim(); }).join(' | '),
      viewport: { w: innerWidth, h: innerHeight }
    };
    return out;
  };

  /* -------------------------------------------------------------- actions */

  /**
   * Everything the app is currently offering, with the box to click it in.
   *
   * "enabled" is copied from the scene, never derived. The DOM order of hand
   * cards and seat slots is the render order of hands[self] and circle,
   * which is what maps a box back to a card id or a player id.
   */
  A.actions = function () {
    var sv = A.services();
    if (!sv) return { ok: false, why: 'no model' };
    var st = sv.store.state, sc = sv.store.scene;
    var acts = [];
    var push = function (o, el) {
      var b = boxOf(el);
      o.box = b;
      o.visible = !!b && b.onScreen;
      acts.push(o);
    };

    var req = st.request;
    var cardItems = sc.items.CardItem || {};
    var photoItems = sc.items.Photo || {};
    var skillItems = sc.items.SkillButton || {};
    var buttonItems = sc.items.Button || {};

    /* --- the dashboard: hand, skills, seats, OK/Cancel/End ---------------- */

    // The dashboard draws the hand, then the cards the request added beside it
    // (an expanded pile). Which cards those are is the scene's own "created"
    // set when the build has one, and the older subtract-the-hand derivation
    // otherwise — the mapping from the Nth box to a card id has to match
    // whatever the page is actually rendering, or every click lands on the
    // wrong card.
    var hand = st.selfId == null ? [] : (st.hands[st.selfId] || []);
    var createdIds = (sc.created && sc.created.CardItem) ? sc.created.CardItem : null;
    var extra = (createdIds || Object.keys(cardItems)).map(Number)
      .filter(function (c) { return isFinite(c) && hand.indexOf(c) < 0; });
    var handOrder = hand.concat(extra);
    var handEls = [].slice.call(document.querySelectorAll('.fk-hand .fk-card'));
    for (var i = 0; i < handEls.length && i < handOrder.length; i++) {
      var cid = handOrder[i];
      var it = cardItems[String(cid)];
      push({
        group: 'card', cid: cid, idx: i,
        offered: it !== undefined,
        enabled: !!(it && it.enabled === true),
        selected: !!(it && it.selected === true),
        fromPile: i >= hand.length
      }, handEls[i]);
    }

    var skillEls = [].slice.call(document.querySelectorAll('.fk-skills .fk-skill'));
    for (var s = 0; s < skillEls.length; s++) {
      var sname = skillEls[s].getAttribute('title') || '';
      var si = skillItems[sname];
      push({
        group: 'skill', name: sname,
        offered: si !== undefined,
        enabled: !!(si && si.enabled === true) && !skillEls[s].disabled,
        selected: !!(si && si.selected === true)
      }, skillEls[s]);
    }

    var order = (st.circle && st.circle.length) ? st.circle : Object.keys(st.players).map(Number);
    var slotEls = [].slice.call(document.querySelectorAll('.fk-seat-slot'));
    for (var q = 0; q < slotEls.length && q < order.length; q++) {
      var pid = order[q];
      var pi = photoItems[String(pid)];
      var photoEl = slotEls[q].querySelector('.fk-photo');
      push({
        group: 'photo', pid: pid,
        offered: pi !== undefined,
        enabled: !!(pi && pi.enabled === true),
        selected: !!(pi && pi.selected === true),
        state: (pi && pi.state) || null,
        dead: !!(st.players[pid] && st.players[pid].dead),
        self: pid === st.selfId
      }, photoEl || slotEls[q]);
    }

    // OK / Cancel / End render only when the scene offers them, in that order.
    var btnEls = [].slice.call(document.querySelectorAll('.fk-controls .fk-buttons .fk-btn'));
    var wanted = [];
    if (buttonItems.OK) wanted.push('OK');
    if (buttonItems.Cancel) wanted.push('Cancel');
    if (buttonItems.End) wanted.push('End');
    for (var bi = 0; bi < btnEls.length && bi < wanted.length; bi++) {
      var bid = wanted[bi];
      push({
        group: 'button', id: bid,
        enabled: buttonItems[bid].enabled === true && !btnEls[bi].disabled,
        label: (btnEls[bi].textContent || '').trim()
      }, btnEls[bi]);
    }

    var interWrap = document.querySelectorAll('.fk-controls .fk-interaction');
    for (var iw = 0; iw < interWrap.length; iw++) {
      var chips = [].slice.call(interWrap[iw].querySelectorAll('.fk-chip'));
      for (var ci = 0; ci < chips.length; ci++) {
        push({
          group: 'chip', wrap: iw, idx: ci,
          label: (chips[ci].textContent || '').trim(),
          enabled: !chips[ci].disabled,
          selected: chips[ci].className.indexOf('fk-chip--on') >= 0
        }, chips[ci]);
      }
    }

    /* --- dialogs ---------------------------------------------------------- */

    var generals = [].slice.call(document.querySelectorAll('.fk-general'));
    for (var g = 0; g < generals.length; g++) {
      push({
        group: 'general', idx: g,
        name: generals[g].getAttribute('title') || '',
        selected: generals[g].className.indexOf('fk-general--on') >= 0,
        enabled: generals[g].style.cursor !== 'not-allowed'
      }, generals[g]);
    }

    // Zone cards cover guanxing / arrange / exchange / choose-card / poxi. The
    // ⇄ chip moves a card between zones and ◀ ▶ reorder it; the driver needs
    // each of those boxes, not just the card's.
    var zones = [].slice.call(document.querySelectorAll('.fk-dialog .fk-zone'));
    for (var z = 0; z < zones.length; z++) {
      var title = (zones[z].querySelector('.fk-zone__title') || {}).textContent || '';
      var kids = [].slice.call(zones[z].querySelectorAll('.fk-zone__cards > *'));
      for (var k2 = 0; k2 < kids.length; k2++) {
        var chipsInCard = [].slice.call(kids[k2].querySelectorAll('.fk-chip'));
        var o = {
          group: 'zoneCard', zone: z, zoneTitle: title.trim(), idx: k2,
          selected: kids[k2].className.indexOf('fk-card--selected') >= 0,
          enabled: true
        };
        push(o, kids[k2].querySelector('.fk-card') || kids[k2]);
        for (var c3 = 0; c3 < chipsInCard.length; c3++) {
          push({
            group: 'zoneChip', zone: z, idx: k2, chip: c3,
            label: (chipsInCard[c3].textContent || '').trim()
          }, chipsInCard[c3]);
        }
      }
    }

    var agSlots = [].slice.call(document.querySelectorAll('.fk-ag .fk-ag__slot'));
    for (var ag = 0; ag < agSlots.length; ag++) {
      var agCid = st.ag ? st.ag.ids[ag] : null;
      var taken = st.ag && agCid != null && st.ag.taken[agCid] != null;
      push({
        group: 'ag', idx: ag, cid: agCid,
        enabled: !!(st.ag && st.ag.interactive && !taken && st.ag.disabled.indexOf(agCid) < 0)
      }, agSlots[ag]);
    }

    var dlgBtns = [].slice.call(document.querySelectorAll('.fk-dialog__actions .fk-btn'));
    for (var d2 = 0; d2 < dlgBtns.length; d2++) {
      push({
        group: 'dialogBtn', idx: d2,
        label: (dlgBtns[d2].textContent || '').trim(),
        primary: dlgBtns[d2].className.indexOf('fk-btn--primary') >= 0,
        enabled: !dlgBtns[d2].disabled
      }, dlgBtns[d2]);
    }

    // Choice boxes put their options straight in the dialog row.
    var rowBtns = [].slice.call(document.querySelectorAll('.fk-dialog .fk-dialog__row > .fk-btn'));
    for (var r2 = 0; r2 < rowBtns.length; r2++) {
      push({
        group: 'choice', idx: r2,
        label: (rowBtns[r2].textContent || '').trim(),
        enabled: !rowBtns[r2].disabled
      }, rowBtns[r2]);
    }

    return {
      ok: true,
      request: { kind: req.kind, command: req.command || null },
      prompt: sc.prompt || null,
      sceneActive: sc.active,
      gameOver: st.gameOver,
      actions: acts
    };
  };

  /* ------------------------------------------------------------- coverage */

  /** Card faces for cids this tab can see. Used for card-type coverage. */
  A.cardInfo = function (cids) {
    var sv = A.services();
    if (!sv) return {};
    var out = {};
    for (var i = 0; i < cids.length; i++) {
      try {
        var d = sv.lua.getCardData(cids[i], true);
        if (d && d.known !== false) {
          out[cids[i]] = { name: d.virt_name || d.name, suit: d.suit, number: d.number, type: d.type, subtype: d.subtype };
        }
      } catch (e) { /* an id the VM has not learned yet */ }
    }
    return out;
  };

  window.__fkAudit = A;
  return 'installed';
})()
`;
