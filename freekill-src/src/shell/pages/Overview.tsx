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
import { useMemo, useState } from 'react';
import { useSession } from '../session';
import { cardImage, generalImage } from '../boot';
import type { OverviewCard, OverviewGeneral } from '../boot';
import { renderMarkdown, renderMarkup } from '../markup';

type Tab = 'generals' | 'cards' | 'modes' | 'skills';

const KINGDOMS: Record<string, string> = { wei: '魏', shu: '蜀', wu: '吴', qun: '群', jin: '晋' };
const CARD_TYPE: Record<number, string> = { 1: '基本牌', 2: '锦囊牌', 3: '装备牌' };
const SUITS: Record<string, string> = { spade: '♠', heart: '♥', club: '♣', diamond: '♦', nosuit: '无' };
const NUMBERS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function Overview({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const { loaded } = useSession();
  const { generals, cards, modes, translations } = loaded.overview;
  const [q, setQ] = useState('');
  const [kingdom, setKingdom] = useState('');
  const [cardType, setCardType] = useState('');
  const [detail, setDetail] = useState<OverviewGeneral | null>(null);

  const skills = useMemo(() => {
    const byName = new Map<string, { name: string; title: string; text: string; owners: string[] }>();
    for (const g of generals) {
      for (const s of g.skills) {
        const e = byName.get(s) ?? {
          name: s,
          title: translations[s] ?? s,
          text: translations[`:${s}`] ?? '',
          owners: [],
        };
        e.owners.push(g.title || g.name);
        byName.set(s, e);
      }
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [generals, translations]);

  const needle = q.trim().toLowerCase();

  const shownGenerals = useMemo(() => generals.filter((g) => {
    if (kingdom && g.kingdom !== kingdom) return false;
    if (!needle) return true;
    return [g.name, g.title, g.subtitle, ...g.skills.map((s) => translations[s] ?? s)]
      .some((f) => f?.toLowerCase().includes(needle));
  }), [generals, kingdom, needle, translations]);

  const shownCards = useMemo(() => cards.filter((c) => {
    if (cardType && String(c.type) !== cardType) return false;
    if (!needle) return true;
    return [c.name, c.title, c.description].some((f) => f?.toLowerCase().includes(needle));
  }), [cards, cardType, needle]);

  const shownSkills = useMemo(() => skills.filter((s) => !needle
    || [s.name, s.title, s.text, ...s.owners].some((f) => f.toLowerCase().includes(needle))), [skills, needle]);

  return (
    <div className="page">
      <h2>资料</h2>
      <p className="lede">标准包、标准卡牌包、军争包 —— 与游戏里跑的是同一份数据。</p>

      <div className="tabs" role="tablist">
        {([['generals', '武将'], ['cards', '卡牌'], ['modes', '模式'], ['skills', '技能']] as const)
          .map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => onTab(id)}>{label}</button>
          ))}
      </div>

      {tab !== 'modes' ? (
        <div className="filters">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索名称、称号、技能…"
            style={{ minWidth: 260 }}
            aria-label="搜索"
          />
          {tab === 'generals' ? (
            <select value={kingdom} onChange={(e) => setKingdom(e.target.value)} aria-label="势力">
              <option value="">全部势力</option>
              {Object.entries(KINGDOMS)
                .filter(([k]) => generals.some((g) => g.kingdom === k))
                .map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          ) : null}
          {tab === 'cards' ? (
            <select value={cardType} onChange={(e) => setCardType(e.target.value)} aria-label="类别">
              <option value="">全部类别</option>
              {Object.entries(CARD_TYPE).map(([t, label]) => <option key={t} value={t}>{label}</option>)}
            </select>
          ) : null}
          <span className="count">
            {tab === 'generals' ? `${shownGenerals.length} / ${generals.length} 名武将`
              : tab === 'cards' ? `${shownCards.length} / ${cards.length} 种牌`
                : `${shownSkills.length} / ${skills.length} 个技能`}
          </span>
        </div>
      ) : null}

      {tab === 'generals' ? (
        <div className="grid-generals">
          {shownGenerals.map((g) => {
            const src = generalImage(loaded, g.name, g.pack);
            return (
              <button className="general-card" key={g.name} onClick={() => setDetail(g)}>
                {src ? <img src={src} alt={g.title} loading="lazy" /> : <div style={{ aspectRatio: '3/4' }} />}
                <div className="cap">
                  <div className="nm">{g.title}</div>
                  <div className="st">
                    <span className={`tag ${g.kingdom}`}>{KINGDOMS[g.kingdom] ?? g.kingdom}</span>
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
              <div className="nm">{s.title}<span style={{ color: 'var(--paper-faint)', fontSize: 12 }}>　{s.owners.join('、')}</span></div>
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
                {m.title}
              </h3>
              <p className="lede">{m.minPlayer}–{m.maxPlayer} 人</p>
              {renderMarkdown(m.description)}
            </div>
          ))}
        </div>
      ) : null}

      {detail ? <GeneralDetail general={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

function CardTile({ card }: { card: OverviewCard }) {
  const { loaded } = useSession();
  const src = cardImage(loaded, card);
  return (
    <div className="card-tile">
      {src ? <img src={src} alt={card.title} loading="lazy" /> : <div style={{ aspectRatio: '3/4' }} />}
      <div className="cap">
        <div className="nm">{card.title}</div>
        <div className="st">
          {CARD_TYPE[card.type] ?? ''} · {card.copies} 张
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
  const { loaded } = useSession();
  const { translations } = loaded.overview;
  const src = generalImage(loaded, general.name, general.pack);
  return (
    <div className="detail" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div>{src ? <img src={src} alt={general.title} /> : null}</div>
        <div className="body">
          <h3>{general.title}</h3>
          <p className="sub">
            {general.subtitle} · <span className={`tag ${general.kingdom}`}>
              {KINGDOMS[general.kingdom] ?? general.kingdom}
            </span> · {general.hp}/{general.maxHp}
          </p>
          {general.skills.map((s) => (
            <div className="skill" key={s}>
              <div className="nm">{translations[s] ?? s}</div>
              <div className="tx">{renderMarkup(translations[`:${s}`] ?? '')}</div>
            </div>
          ))}
          {general.illustrator ? <p className="credit">画师　{general.illustrator}</p> : null}
          <button className="btn small ghost" style={{ marginTop: 16 }} onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
