/**
 * The reference pages: generals, cards, modes, skills.
 *
 * Every fact on this page came out of the engine's own tables — general HP and
 * kingdom, card suits and copies, skill text, the mode's rules — extracted at
 * build time by booting the real client VM (scripts/build-overview.mjs). Nothing
 * here is transcribed into TypeScript, so it cannot drift from the rules.
 *
 * The 25 portraits carry an `illustrator:` credit in the i18n tables naming
 * KayaK, and that credit is the only attribution the art has. It is shown.
 */
import { useCallback, useMemo, useState } from 'react';
import { engineTr, useLanguage, useT } from '../../i18n';
import type { UiKey } from '../../i18n';
import { useSession } from '../session';
import { cardImage, generalImage } from '../boot';
import type { OverviewCard, OverviewGeneral } from '../boot';
import { renderMarkdown, renderMarkup } from '../markup';

type Tab = 'generals' | 'cards' | 'modes' | 'skills';

/** Kingdom badges want one glyph in Chinese and a short word in English; the
 *  engine key (`wei`) renders long, so these are UI-dictionary keys. */
const KINGDOMS: Record<string, UiKey> = {
  wei: 'kingdom.wei', shu: 'kingdom.shu', wu: 'kingdom.wu', qun: 'kingdom.qun', jin: 'kingdom.jin',
  // The mobile roster brings nine 神 generals; without this they render a bare
  // `god` badge and the kingdom filter cannot reach them. `evil` is the same
  // story for 蚀心入魔's three 魔 generals — the pack registers the kingdom
  // itself via `Fk:appendKingdomMap`, so the engine knows it and only this map
  // did not.
  god: 'kingdom.god',
  evil: 'kingdom.evil',
};
const CARD_TYPE: Record<number, UiKey> = {
  1: 'cardType.basic', 2: 'cardType.trick', 3: 'cardType.equip',
};
const SUITS: Record<string, string> = { spade: '♠', heart: '♥', club: '♣', diamond: '♦', nosuit: '' };
const NUMBERS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Engine keys, resolved for the viewer.
 *
 * The overview payload is built from the real Lua tables, but it is built once,
 * in Chinese. Every name, title, subtitle, rules blurb and mode document on this
 * page is therefore looked up by its engine key at render time: Chinese out of
 * the payload's key table, English out of `src/i18n/engine`, which is complete.
 *
 * The `baked` argument is the payload's own pre-translated field, and it is the
 * Chinese fallback. `public/overview.json` is generated and gitignored, so a
 * checkout that has not rebuilt since the key table grew still has the old
 * 86-key one — without this the page would quietly render `caocao` instead of
 * 曹操. Regenerate with `npm run build:overview` to be rid of the fallback.
 */
function useEngineText(): (key: string, baked?: string) => string {
  const { loaded } = useSession();
  const lang = useLanguage();
  const zh = loaded.overview.translations;
  // Three tiers, best first: our own English table (complete for the standard
  // pack), then upstream's own English where upstream wrote any (44 of the
  // mobile roster's 249 general names), then the Chinese. The middle tier is
  // why an English reader sees "Cao Chun" rather than 曹纯; it is not why they
  // see English skill text, because upstream never wrote that.
  const en = loaded.overview.translationsEn;
  return useCallback(
    (key: string, baked?: string) => engineTr(key, lang, (k) => (
      (lang === 'en_US' ? en?.[k] : undefined) ?? zh[k] ?? baked ?? k
    )),
    [lang, zh, en],
  );
}

export function Overview({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const t = useT();
  const tr = useEngineText();
  const { loaded } = useSession();
  const { generals, cards, modes } = loaded.overview;
  const [q, setQ] = useState('');
  const [kingdom, setKingdom] = useState('');
  const [cardType, setCardType] = useState('');
  const [detail, setDetail] = useState<OverviewGeneral | null>(null);

  const skills = useMemo(() => {
    const byName = new Map<string, { name: string; title: string; text: string; owners: string[] }>();
    for (const g of generals) {
      for (const s of g.skills) {
        const e = byName.get(s) ?? { name: s, title: tr(s), text: tr(`:${s}`), owners: [] };
        e.owners.push(tr(g.name, g.title));
        byName.set(s, e);
      }
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [generals, tr]);

  const needle = q.trim().toLowerCase();

  const shownGenerals = useMemo(() => generals.filter((g) => {
    if (kingdom && g.kingdom !== kingdom) return false;
    if (!needle) return true;
    // Both languages are searchable: typing 奸雄 or "Villainous Hero" finds Cao
    // Cao whichever language the page is in.
    return [g.name, g.title, g.subtitle, tr(g.name, g.title), tr(`#${g.name}`, g.subtitle),
      ...g.skills.flatMap((s) => [s, tr(s)])]
      .some((f) => f?.toLowerCase().includes(needle));
  }), [generals, kingdom, needle, tr]);

  const shownCards = useMemo(() => cards.filter((c) => {
    if (cardType && String(c.type) !== cardType) return false;
    if (!needle) return true;
    return [c.name, c.title, c.description, tr(c.name, c.title), tr(`:${c.name}`, c.description)]
      .some((f) => f?.toLowerCase().includes(needle));
  }), [cards, cardType, needle, tr]);

  const shownSkills = useMemo(() => skills.filter((s) => !needle
    || [s.name, s.title, s.text, ...s.owners].some((f) => f.toLowerCase().includes(needle))), [skills, needle]);

  return (
    <div className="page">
      <h2>{t('overview.title')}</h2>
      <p className="lede">{t('overview.lede')}</p>

      <div className="tabs" role="tablist">
        {(['generals', 'cards', 'modes', 'skills'] as const).map((id) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => onTab(id)}>
            {t(`overview.tab.${id}`)}
          </button>
        ))}
      </div>

      {tab !== 'modes' ? (
        <div className="filters">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('overview.searchPlaceholder')}
            style={{ minWidth: 260 }}
            aria-label={t('overview.search')}
          />
          {tab === 'generals' ? (
            <select value={kingdom} onChange={(e) => setKingdom(e.target.value)} aria-label={t('overview.kingdomLabel')}>
              <option value="">{t('overview.allKingdoms')}</option>
              {Object.entries(KINGDOMS)
                .filter(([k]) => generals.some((g) => g.kingdom === k))
                .map(([k, label]) => <option key={k} value={k}>{t(label)}</option>)}
            </select>
          ) : null}
          {tab === 'cards' ? (
            <select value={cardType} onChange={(e) => setCardType(e.target.value)} aria-label={t('overview.typeLabel')}>
              <option value="">{t('overview.allTypes')}</option>
              {Object.entries(CARD_TYPE).map(([n, label]) => <option key={n} value={n}>{t(label)}</option>)}
            </select>
          ) : null}
          <span className="count">
            {tab === 'generals' ? t('overview.countGenerals', { shown: shownGenerals.length, total: generals.length })
              : tab === 'cards' ? t('overview.countCards', { shown: shownCards.length, total: cards.length })
                : t('overview.countSkills', { shown: shownSkills.length, total: skills.length })}
          </span>
        </div>
      ) : null}

      {tab === 'generals' ? (
        <div className="grid-generals">
          {shownGenerals.map((g) => {
            const src = generalImage(loaded, g.name, g.extension);
            return (
              <button className="general-card" key={g.name} onClick={() => setDetail(g)}>
                {src ? <img src={src} alt={tr(g.name, g.title)} loading="lazy" /> : <div style={{ aspectRatio: '3/4' }} />}
                <div className="cap">
                  <div className="nm">{tr(g.name, g.title)}</div>
                  <div className="st">
                    <span className={`tag ${g.kingdom}`}>
                      {KINGDOMS[g.kingdom] ? t(KINGDOMS[g.kingdom]) : g.kingdom}
                    </span>
                    {' '}{g.hp}/{g.maxHp}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {tab === 'cards' ? (
        <div className="grid-cards">
          {shownCards.map((c) => <CardTile key={c.name} card={c} />)}
        </div>
      ) : null}

      {tab === 'skills' ? (
        <div>
          {shownSkills.map((s) => (
            <div className="skill" key={s.name}>
              <div className="nm">
                {s.title}
                <span style={{ color: 'var(--paper-faint)', fontSize: 12 }}>
                  {'\u3000'}{s.owners.join(t('punct.listSep'))}
                </span>
              </div>
              <div className="tx">{renderMarkup(s.text)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'modes' ? (
        <div>
          {modes.map((m) => (
            <div className="card" key={m.name} style={{ marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'var(--han)', letterSpacing: 3, fontWeight: 400, margin: '0 0 4px' }}>
                {tr(m.name, m.title)}
              </h3>
              <p className="lede">{t('overview.playerRange', { min: m.minPlayer, max: m.maxPlayer })}</p>
              {renderMarkdown(tr(`:${m.name}`, m.description))}
            </div>
          ))}
        </div>
      ) : null}

      {detail ? <GeneralDetail general={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

function CardTile({ card }: { card: OverviewCard }) {
  const t = useT();
  const tr = useEngineText();
  const { loaded } = useSession();
  const src = cardImage(loaded, card);
  return (
    <div className="card-tile">
      {src ? <img src={src} alt={tr(card.name, card.title)} loading="lazy" /> : <div style={{ aspectRatio: '3/4' }} />}
      <div className="cap">
        <div className="nm">{tr(card.name, card.title)}</div>
        <div className="st">
          {CARD_TYPE[card.type] ? t(CARD_TYPE[card.type]) : ''} · {t('overview.copies', { n: card.copies })}
          <div style={{ marginTop: 2 }}>
            {card.suits.slice(0, 6).map((s, i) => (
              <span key={i} style={{ color: s.suit === 'heart' || s.suit === 'diamond' ? '#c9483a' : undefined }}>
                {SUITS[s.suit] ?? ''}{NUMBERS[s.number] ?? s.number}{' '}
              </span>
            ))}
            {card.suits.length > 6 ? '…' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneralDetail({ general, onClose }: { general: OverviewGeneral; onClose: () => void }) {
  const t = useT();
  const tr = useEngineText();
  const { loaded } = useSession();
  const src = generalImage(loaded, general.name, general.extension);
  return (
    <div className="detail" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div>{src ? <img src={src} alt={tr(general.name, general.title)} /> : null}</div>
        <div className="body">
          <h3>{tr(general.name, general.title)}</h3>
          <p className="sub">
            {tr(`#${general.name}`, general.subtitle)} · <span className={`tag ${general.kingdom}`}>
              {KINGDOMS[general.kingdom] ? t(KINGDOMS[general.kingdom]) : general.kingdom}
            </span> · {general.hp}/{general.maxHp}
          </p>
          {general.skills.map((s) => (
            <div className="skill" key={s}>
              <div className="nm">{tr(s)}</div>
              <div className="tx">{renderMarkup(tr(`:${s}`))}</div>
            </div>
          ))}
          {general.illustrator
            ? <p className="credit">{t('overview.illustrator')}{'\u3000'}{general.illustrator}</p>
            : null}
          <button className="btn small ghost" style={{ marginTop: 16 }} onClick={onClose}>
            {t('overview.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
