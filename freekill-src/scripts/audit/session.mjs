/**
 * The record, and what it proves was covered.
 *
 * A failing game is only useful if someone can read what happened, so the
 * session log is written as it goes — one JSON object per line, flushed at
 * every decision boundary — rather than assembled at the end, which is exactly
 * when a hung run never gets to.
 *
 * Coverage is kept in the same place because it comes from the same stream.
 * "We tested the game" is not a claim anyone can check; "these eleven generals
 * played, these nine skills fired, these card types were used, these eight
 * request types were answered" is.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export class SessionLog {
  constructor(path) {
    this.path = path;
    this.buffer = [];
    this.lines = 0;
    if (path) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, '');
    }
  }

  write(kind, payload) {
    // `kind` last, not first: a payload carrying its own `kind` (a request's
    // scene/dialog kind, say) would otherwise overwrite the record's type and
    // make the whole log unfilterable.
    const rec = { t: Date.now(), ...payload, kind };
    this.buffer.push(rec);
    this.lines += 1;
    if (this.buffer.length >= 24) this.flush();
    return rec;
  }

  flush() {
    if (!this.path || !this.buffer.length) { this.buffer.length = 0; return; }
    appendFileSync(this.path, this.buffer.map((r) => JSON.stringify(r)).join('\n') + '\n');
    this.buffer.length = 0;
  }
}

/** `Card.Type*` in `lua/lunarltk/core/card.lua`. */
const CARD_TYPE_NAME = { 1: 'basic', 2: 'trick', 3: 'equip' };

export class Coverage {
  constructor() {
    this.generals = new Set();
    /**
     * Generals a *human* seat chose, as opposed to every general at the table.
     * The distinction is the whole coverage story: a bot's zhugeliang answers
     * its own guanxing inside the engine and the client dialog is never drawn,
     * so it proves nothing about the UI. Only a seat this suite drives does.
     */
    this.generalsSeated = new Set();
    /** Generals the chooser put in front of a human seat, taken or not. */
    this.generalsOffered = new Set();
    this.skillsGranted = new Set();
    this.skillsFired = new Map();      // skill -> times seen firing
    this.cardsSeen = new Map();        // card name -> times seen on the table
    this.cardTypes = new Set();
    this.cardSubtypes = new Set();
    this.suits = new Set();
    this.requestsSeen = new Map();     // command -> times the engine asked
    this.requestsAnswered = new Map(); // command -> times this suite answered
    this.dialogsRendered = new Set();
    this.sceneTypes = new Set();
    this.interactions = new Map();     // elemType -> times clicked
    this.damage = 0;
    this.deaths = 0;
    this.rounds = 0;
    this.unknownRequests = new Set();
  }

  fromSnapshot(snap) {
    for (const p of Object.values(snap.players ?? {})) {
      if (p.general) this.generals.add(p.general);
      if (p.deputy) this.generals.add(p.deputy);
      for (const s of p.skills ?? []) this.skillsGranted.add(s);
    }
    if (snap.round > this.rounds) this.rounds = snap.round;
    if (snap.scene?.type) this.sceneTypes.add(snap.scene.type);
    if (snap.dom?.dialogTitle) this.dialogsRendered.add(snap.dom.dialogTitle);
    // `requestsSeen` is counted off the stream and nowhere else. Counting it
    // here too would count one long-open request once per poll and turn the
    // coverage number into a measure of how often the driver looked.
  }

  /** Everything the engine said, mined for what the game actually did. */
  fromStream(entries) {
    for (const e of entries) {
      switch (e.c) {
        case 'Animate': {
          const d = e.d ?? {};
          if (d.type === 'InvokeSkill' && d.name) {
            this.skillsFired.set(d.name, (this.skillsFired.get(d.name) ?? 0) + 1);
          }
          break;
        }
        case 'AddSkill': {
          const s = Array.isArray(e.d) ? e.d[1] : null;
          if (s) this.skillsGranted.add(s);
          break;
        }
        case 'LogEvent': {
          if (e.d?.type === 'Damage') this.damage += 1;
          if (e.d?.type === 'Death') this.deaths += 1;
          break;
        }
        default:
          break;
      }
      if (/^(AskFor|PlayCard$|MiniGame$|CustomDialog$)/.test(e.c)) {
        this.requestsSeen.set(e.c, (this.requestsSeen.get(e.c) ?? 0) + 1);
      }
    }
  }

  /** Faces resolved from the client VM for cards that reached the table. */
  fromCardInfo(info) {
    for (const d of Object.values(info ?? {})) {
      if (!d?.name) continue;
      this.cardsSeen.set(d.name, (this.cardsSeen.get(d.name) ?? 0) + 1);
      if (d.type != null) this.cardTypes.add(CARD_TYPE_NAME[d.type] ?? String(d.type));
      if (d.subtype && d.subtype !== 'none') this.cardSubtypes.add(d.subtype);
      if (d.suit) this.suits.add(d.suit);
    }
  }

  answered(command, unknown) {
    if (!command) return;
    this.requestsAnswered.set(command, (this.requestsAnswered.get(command) ?? 0) + 1);
    if (unknown) this.unknownRequests.add(command);
  }

  interacted(elemType) {
    this.interactions.set(elemType, (this.interactions.get(elemType) ?? 0) + 1);
  }

  offered(general) {
    if (general) this.generalsOffered.add(general);
  }

  seated(general) {
    if (general) { this.generalsSeated.add(general); this.generals.add(general); }
  }

  merge(other) {
    for (const k of ['generals', 'generalsSeated', 'generalsOffered', 'skillsGranted', 'cardTypes', 'cardSubtypes', 'suits', 'dialogsRendered', 'sceneTypes', 'unknownRequests']) {
      for (const v of other[k]) this[k].add(v);
    }
    for (const k of ['skillsFired', 'cardsSeen', 'requestsSeen', 'requestsAnswered', 'interactions']) {
      for (const [v, n] of other[k]) this[k].set(v, (this[k].get(v) ?? 0) + n);
    }
    this.damage += other.damage;
    this.deaths += other.deaths;
    this.rounds = Math.max(this.rounds, other.rounds);
  }

  toJSON() {
    const m = (map) => Object.fromEntries([...map].sort((a, b) => b[1] - a[1]));
    return {
      generals: [...this.generals].sort(),
      generalsSeated: [...this.generalsSeated].sort(),
      generalsOffered: [...this.generalsOffered].sort(),
      skillsGranted: [...this.skillsGranted].sort(),
      skillsFired: m(this.skillsFired),
      cardsUsed: m(this.cardsSeen),
      cardTypes: [...this.cardTypes].sort(),
      cardSubtypes: [...this.cardSubtypes].sort(),
      suits: [...this.suits].sort(),
      requestsSeen: m(this.requestsSeen),
      requestsAnswered: m(this.requestsAnswered),
      requestsWithNoDialog: [...this.unknownRequests].sort(),
      dialogsRendered: [...this.dialogsRendered].sort(),
      sceneTypes: [...this.sceneTypes].sort(),
      interactions: m(this.interactions),
      damageEvents: this.damage,
      deaths: this.deaths,
      rounds: this.rounds,
    };
  }
}
