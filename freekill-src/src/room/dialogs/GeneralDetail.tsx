/**
 * "What does this one actually do?" — the box 选将 was missing.
 *
 * `Fk/Pages/LunarLTK/GeneralDetailPage.qml`, cut down to what a player needs
 * while deciding: the portrait, the stats, the credits, and every skill with its
 * full rules text. `ChooseGeneralBox.qml:123` reaches it through a
 * `Show General Detail` button; this one is reached through that button and
 * through a ⓘ badge on each card, and it can page across everything on offer
 * without being closed in between.
 *
 * WHY IT PAGES. The general pool went from 25 to 319. Before that a player
 * could be assumed to half-know the three names in front of them; now the box
 * is not a footnote, it is the decision — you open it once, read the shortlist
 * end to end, close it, and pick. Making that mean "open, read, close, open,
 * read, close" would have been a worse box than no box.
 *
 * IT IS READ-ONLY, AND THAT IS LOAD-BEARING. It never calls `onReply`, never
 * touches the store, and holds no state but which general is on screen. It can
 * therefore go up over a live `AskForGeneral` without any of the failure modes
 * this room has already paid for once — a dialog that answers twice, or a
 * request left live after it was answered. Closing it puts the room back
 * exactly where it was; the pick is still made in the 选将 box behind it.
 *
 * WHERE THE SKILLS COME FROM. `GetGeneralDetail` (`client_util.lua:27`) walks
 * `general.all_skills` and runs `Fk:getDescription` over each entry, so both the
 * list and the text are the engine's own. There is deliberately no filter on the
 * *shape* of a skill's name: a namespaced package skill (`mobile__lianzhu`), a
 * view-as skill (`spear_skill&`) and a derived skill (`is_related_skill`) are
 * all reasons to take a general, and the dashboard lane has already paid for
 * what `!name.includes('__')` does to a package. Nor is anything special done
 * for 锁定技 — a compulsory skill never animates an invocation, so this box is
 * the only place it is ever readable, and it arrives in `all_skills` like the
 * rest.
 *
 * 简明 / 详细. The engine's text is correct, complete, and written for someone
 * who already knows the game — 神司马懿's runs to three hundred characters. A
 * player weighing three unfamiliar names cannot read that per candidate, so
 * every general also carries a two-sentence plain-language summary
 * (`../../i18n/generalSummaries.ts`) saying what it is FOR: aggressive, defensive,
 * draws cards, disrupts. That summary is drawn in BOTH modes — the toggle only
 * decides whether the rules text appears under it — and the choice persists in
 * `localStorage` the way the language does, because a player who wants the
 * short version wants it on the next general too.
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { useLanguage } from '../../i18n';
import { useRoom } from '../RoomContext';
import { sanitizeMarkup } from '../components/markup';
import { SUMMARY_LABELS, generalSummary } from '../../i18n/generalSummaries';
import type { GeneralDetail as GeneralDetailData } from '../ltk/types';
import { Dialog, Btn } from './parts';

/**
 * 简明 or 详细 — whether the box shows the rules text under each skill.
 *
 * A module-level store with `useSyncExternalStore`, the same shape and for the
 * same reason as `src/i18n/LanguageProvider`: this is a reading preference, not
 * a property of one popup, and a player who asked for the short version wants
 * the short version on the next general and on the next session too. The box is
 * unmounted and remounted on every open, so component state would forget it
 * between the first and second card of the same shortlist.
 *
 * The default is `full`. The summary is drawn in BOTH modes — a player who
 * never finds the toggle still gets the two-sentence lead — so defaulting to
 * `simple` would only take the rules text away from someone who did not ask.
 */
export type SkillView = 'simple' | 'full';

const VIEW_KEY = 'fk.skillView';
const DEFAULT_VIEW: SkillView = 'full';

function readStoredView(): SkillView {
  try {
    const saved = globalThis.localStorage?.getItem(VIEW_KEY);
    if (saved === 'simple' || saved === 'full') return saved;
  } catch {
    /* private mode, or no DOM at all (node tests) */
  }
  return DEFAULT_VIEW;
}

let view: SkillView = readStoredView();
const viewListeners = new Set<() => void>();

export function getSkillView(): SkillView {
  return view;
}

export function setSkillView(next: SkillView): void {
  if (next === view) return;
  view = next;
  try { globalThis.localStorage?.setItem(VIEW_KEY, next); } catch { /* private mode */ }
  for (const l of [...viewListeners]) l();
}

/** For tests: forget the stored choice and drop back to the default. */
export function resetSkillView(): void {
  try { globalThis.localStorage?.removeItem(VIEW_KEY); } catch { /* private mode */ }
  setSkillView(DEFAULT_VIEW);
}

function subscribeView(listener: () => void): () => void {
  viewListeners.add(listener);
  return () => { viewListeners.delete(listener); };
}

/**
 * `[view, setView]`. The third argument is the live store rather than a frozen
 * default: this app is client-only (`main.tsx` mounts, nothing hydrates), and
 * the room's tests render through `renderToStaticMarkup`, which would otherwise
 * be unable to see either mode but the default one.
 */
export function useSkillView(): [SkillView, (next: SkillView) => void] {
  return [useSyncExternalStore(subscribeView, getSkillView, getSkillView), setSkillView];
}

export interface GeneralDetailProps {
  /** The general on screen. */
  readonly name: string;
  readonly onClose: () => void;
  /** Everything on offer, so the box can page the shortlist. Optional: the
   *  table's right-click opens it on one seat's general and nothing else. */
  readonly pool?: readonly string[];
  /** Show a different member of `pool`. Required for paging to appear. */
  readonly onShow?: (name: string) => void;
  /** Whether `name` is currently among the picks, drawn as a marker only —
   *  the box does not select. */
  readonly selected?: boolean;
}

export function GeneralDetail({ name, onClose, pool, onShow, selected }: GeneralDetailProps) {
  const { lua, assets } = useRoom();
  const detail = safe(() => lua.getGeneralDetail(name));
  const art = assets.generalPortrait(name, detail?.extension);
  const skills = readSkills(detail);

  // The plain-language answer to "what is this one FOR", and the switch between
  // it and the engine's own rules text. `useLanguage` rather than `lua.tr`: a
  // summary is this repo's own prose, not a key the engine can translate.
  const lang = useLanguage();
  const labels = SUMMARY_LABELS[lang];
  const summary = generalSummary(name);
  const [view, setView] = useSkillView();

  const list = pool ?? [];
  const at = list.indexOf(name);
  const canPage = !!onShow && at >= 0 && list.length > 1;
  const step = (delta: number) => onShow?.(list[(at + delta + list.length) % list.length]);

  // Escape closes it. The box can be up over a live `AskForGeneral`, and leaving
  // a player no keyboard way out of something that dims the question is not an
  // option. `onClose` is the caller's own `setState(null)` and nothing else.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <Dialog
      // Over the 选将 box it was opened from. See `Dialog`.
      layer={45}
      title={`${selected ? '✓ ' : ''}${lua.tr(name)}`}
      actions={<Btn primary onClick={onClose}>{lua.tr('OK')}</Btn>}
    >
      <div className="fk-detail" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 auto', width: 180 }}>
          {canPage ? (
            // Glyphs, not words: paging needs no i18n key of its own, and the
            // counter is the one thing that tells a player how much of the
            // shortlist they have left to read.
            <div className="fk-detail__pager" style={PAGER}>
              <button type="button" className="fk-chip" onClick={() => step(-1)} aria-label="previous">◀</button>
              <span>{at + 1} / {list.length}</span>
              <button type="button" className="fk-chip" onClick={() => step(1)} aria-label="next">▶</button>
            </div>
          ) : null}
          {art ? <img src={art} alt="" style={{ width: 180, borderRadius: 5, display: 'block' }} /> : null}
          <Credits name={name} detail={detail} />
        </div>

        <div style={{ minWidth: 0, flex: '1 1 420px', maxWidth: 520 }}>
          {detail?.headnote ? <p style={NOTE}>{lua.tr(detail.headnote)}</p> : null}
          {detail?.companions?.length ? (
            <p style={NOTE}>
              <b>{lua.tr('Companions')}</b>: {detail.companions.map((c) => lua.tr(c)).join(' ')}
            </p>
          ) : null}

          <div style={SECTION}>
            <span>{lua.tr('Skill Description')}</span>
            {/* Two chips rather than one: a lone "简明" button never says which
                way it is currently set, and this box is read while paging, so
                the state has to be legible at a glance. */}
            <span className="fk-detail__view" style={{ display: 'flex', gap: 4 }}>
              {(['simple', 'full'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className="fk-chip"
                  aria-pressed={view === mode}
                  style={view === mode ? VIEW_ON : undefined}
                  onClick={() => setView(mode)}
                >
                  {labels[mode]}
                </button>
              ))}
            </span>
          </div>

          {/* Drawn in both modes. The rules text is what the toggle hides; the
              two-sentence answer to "what is this one for" is the reason the
              box is worth opening at all, and a player who never finds the
              toggle should still get it. A general with no summary says so
              rather than showing a blank line — the same rule the untranslated
              skill body below follows. */}
          <p className="fk-detail__summary" style={SUMMARY}>
            {summary ? summary[lang] : labels.none}
          </p>
          {summary?.missing?.length ? (
            // Named, not glossed over: these are skills this build ships no text
            // for at all (their package is not in `packages/`), and a summary
            // that quietly described three quarters of a character would be the
            // same lie as a skill drawn with nothing under it.
            <p className="fk-detail__gap" style={GAP}>
              {labels.missing}{summary.missing.join(' · ')}
            </p>
          ) : null}

          {/* Some of them carry six skills with a paragraph each, so the list
              scrolls inside the box rather than growing it past `.fk-dialog`'s
              86% cap and pushing OK off the bottom of the screen. */}
          <div className="fk-detail__skills" style={SKILLS}>
            {skills.length === 0
              ? <p style={NOTE}>—</p>
              : skills.map((s, i) => {
                /**
                 * `GetGeneralDetail` builds its text with `Fk:getDescription`,
                 * which reads the VM's OWN `Config.language` — so a skill the
                 * active language has no `:<name>` entry for comes back as the
                 * bare key. Ask again through `lua.tr`, which consults this
                 * side's `en_US` table before the VM: it is the same key, still
                 * the engine's answer, and it recovers the text whenever the two
                 * tables disagree — including when the VM never got the language
                 * push at all.
                 *
                 * When neither has it, say so. A skill drawn with a name and
                 * nothing under it reads as a skill that does nothing, which is
                 * a worse lie than an obvious gap.
                 */
                const body = s.description || resolve(lua, `:${s.name}`);
                return (
                  // Index in the key as well as the name: `all_skills` is a list,
                  // not a set, and a general that both has and grants the same
                  // skill puts it in twice.
                  <div key={`${s.name}-${i}`} className="fk-detail__skill" style={{ marginBottom: view === 'full' ? 10 : 2 }}>
                    <b style={{ color: s.is_related_skill ? '#b79ae0' : 'var(--fk-gold)' }}>{lua.tr(s.name)}</b>
                    {/* 简明 keeps the names and drops the rules. The names alone
                        are literary allusions and say nothing about function —
                        that is what the summary above is for — but they are how
                        a player recognises the skill again once it fires, and
                        dropping them would leave the mode with nothing in it. */}
                    {view !== 'full' ? null : body ? (
                      <div
                        style={{ fontSize: 13, lineHeight: 1.55, marginTop: 2 }}
                        dangerouslySetInnerHTML={{ __html: sanitizeMarkup(body) }}
                      />
                    ) : (
                      <div className="fk-detail__untranslated" style={{ fontSize: 13, marginTop: 2, opacity: 0.55 }}>—</div>
                    )}
                  </div>
                );
              })}
          </div>

          {detail?.endnote ? <p style={NOTE}>{lua.tr(detail.endnote)}</p> : null}
        </div>
      </div>
    </Dialog>
  );
}

/**
 * Kingdom, HP, package, and the four credit lines the packages ship as i18n keys
 * — `#<general>`, `designer:`, `cv:`, `illustrator:`, the same block
 * `GeneralDetailPage.qml` builds. `Fk:translate` answers a key nobody defined
 * with the key itself, and an undefined credit is worth less than the line it
 * would take, so those are left out.
 */
function Credits({ name, detail }: { name: string; detail?: GeneralDetailData }) {
  const { lua } = useRoom();
  const lines: [string, string][] = [];
  const add = (label: string, key: string) => {
    const v = lua.tr(key);
    if (v && v !== key) lines.push([lua.tr(label), v]);
  };
  add('Title', `#${name}`);
  add('Designer', `designer:${name}`);
  add('Voice Actor', `cv:${name}`);
  add('Illustrator', `illustrator:${name}`);

  return (
    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--fk-ink-dim)' }}>
      <div>
        {lua.tr(detail?.kingdom ?? '')} · <span style={{ color: 'var(--fk-gold)' }}>
          {detail?.hp ?? '?'}/{detail?.maxHp ?? '?'}
        </span>
        {detail?.package ? <> · {lua.tr(detail.package)}</> : null}
      </div>
      {lines.map(([label, value]) => <div key={label}>{label}: {value}</div>)}
      {detail?.hidden ? <div>{lua.tr('Hidden General')}</div> : null}
    </div>
  );
}

/** What the box shows of `GetGeneralDetail(...).skill`. */
export interface DetailSkill {
  readonly name: string;
  readonly description: string;
  readonly is_related_skill: boolean;
}

/**
 * The engine's skill list, made safe to render — and nothing more.
 *
 * Two things happen here and both are presentation:
 *
 *  - `Fk:translate` answers an unknown key with the key itself, so a skill with
 *    no `:<name>` entry arrives carrying `":foo"` as its description. That is a
 *    missing translation, not rules text, and it renders as an empty body.
 *  - a `#`-prefixed name is upstream's marker for an internal sub-skill a player
 *    is not meant to read, and `GeneralDetailPage.qml:104` drops every one of
 *    them. Dropped here only when it also has no text, so the rule can never
 *    hide something with real rules in it.
 *
 * Exported so the tests can hold it to that without a DOM.
 */
export function readSkills(detail: { skill?: readonly DetailSkill[] } | undefined): DetailSkill[] {
  const out: DetailSkill[] = [];
  for (const s of detail?.skill ?? []) {
    if (!s || typeof s.name !== 'string' || s.name === '') continue;
    const raw = typeof s.description === 'string' ? s.description : '';
    const description = raw === `:${s.name}` ? '' : raw;
    if (description === '' && s.name.startsWith('#')) continue;
    out.push({ name: s.name, description, is_related_skill: !!s.is_related_skill });
  }
  return out;
}

const NOTE: CSSProperties = { margin: '0 0 8px', fontSize: 12, color: 'var(--fk-ink-dim)' };
const SECTION: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  margin: '0 0 6px', paddingBottom: 3, fontSize: 12, letterSpacing: 1,
  color: 'var(--fk-ink-dim)', borderBottom: '1px solid var(--fk-line)',
};
/** The chip that is currently in force. `aria-pressed` carries it for a screen
 *  reader; this is the same thing for everybody else. */
const VIEW_ON: CSSProperties = { borderColor: 'var(--fk-gold)', color: 'var(--fk-gold)' };
/** Deliberately bigger than the rules text below it: in 简明 it is the whole
 *  content of the box, and in 详细 it is the sentence that frames the rest. */
const SUMMARY: CSSProperties = { margin: '0 0 8px', fontSize: 13.5, lineHeight: 1.6 };
const GAP: CSSProperties = {
  margin: '0 0 8px', fontSize: 12, lineHeight: 1.5, opacity: 0.7, color: 'var(--fk-ink-dim)',
};
const SKILLS: CSSProperties = { maxHeight: '46vh', overflowY: 'auto', paddingRight: 6 };
const PAGER: CSSProperties = {
  display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between',
  marginBottom: 6, fontSize: 12, color: 'var(--fk-ink-dim)',
};

function safe<T>(fn: () => T): T | undefined {
  try { return fn(); } catch { return undefined; }
}

/** `Fk:translate` answers an unknown key with the key. That is "no", not text. */
function resolve(lua: { tr: (key: string) => string }, key: string): string {
  const v = safe(() => lua.tr(key));
  return !v || v === key ? '' : v;
}
