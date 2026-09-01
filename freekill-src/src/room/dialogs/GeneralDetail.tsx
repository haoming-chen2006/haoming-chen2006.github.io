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
 */
import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useRoom } from '../RoomContext';
import { sanitizeMarkup } from '../components/markup';
import type { GeneralDetail as GeneralDetailData } from '../ltk/types';
import { Dialog, Btn } from './parts';

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

          <div style={SECTION}>{lua.tr('Skill Description')}</div>
          {/* Some of the 319 carry six skills with a paragraph each, so the list
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
                  <div key={`${s.name}-${i}`} className="fk-detail__skill" style={{ marginBottom: 10 }}>
                    <b style={{ color: s.is_related_skill ? '#b79ae0' : 'var(--fk-gold)' }}>{lua.tr(s.name)}</b>
                    {body ? (
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
  margin: '0 0 6px', paddingBottom: 3, fontSize: 12, letterSpacing: 1,
  color: 'var(--fk-ink-dim)', borderBottom: '1px solid var(--fk-line)',
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
