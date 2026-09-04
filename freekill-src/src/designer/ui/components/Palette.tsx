/**
 * The palette: every block the panel offers, and the evidence that it works.
 *
 * The tooltip is the point. `vocabulary.generated.json` was built by booting the
 * real engine and walking the skeletons of 697 shipped generals, so every block
 * carries the engine function it compiles to and three skills that already do
 * it — 「和〖制衡〗一样」 tells a player what 「令其选择自己的牌」 means far
 * better than any wording of mine, and the citation tells anybody debugging the
 * generated Lua where to look. Neither is decoration: a block whose citation is
 * wrong is a general whose skill silently does nothing, which is the failure
 * this whole vocabulary exists to prevent.
 *
 * The example skills' Chinese names come from `catalogue.generated.json`, a
 * 1.6 MB dynamic import that the game's own load budget keeps off the critical
 * path. Until it lands the tooltip shows the ids, which is why it is fetched on
 * mount rather than on first hover.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadCatalogue } from '../../vocabulary/index';
import { LANE_LABEL, PALETTE, search, sectionsFor, type Lane, type PaletteBlock } from '../palette';

interface SkillNote {
  title: string;
  general: string;
}

/**
 * Skill id → what it is called and who prints it.
 *
 * One pass over the catalogue rather than a `find` per lookup: the tooltip is
 * built on hover and a linear scan of 1304 skills three times per hover is
 * exactly the kind of thing that makes a hover feel sticky.
 */
const useSkillNotes = (): Map<string, SkillNote> => {
  const [notes, setNotes] = useState<Map<string, SkillNote>>(new Map());
  useEffect(() => {
    let live = true;
    loadCatalogue()
      .then((catalogue) => {
        if (!live) return;
        const generals = new Map(catalogue.generals.map((g) => [g.name, g.title]));
        const out = new Map<string, SkillNote>();
        for (const skill of catalogue.skills) {
          out.set(skill.name, {
            title: skill.title || skill.name,
            general: generals.get(skill.generals[0] ?? '') ?? skill.generals[0] ?? '',
          });
        }
        setNotes(out);
      })
      .catch(() => {
        /* the panel works without the evidence; it just says less */
      });
    return () => {
      live = false;
    };
  }, []);
  return notes;
};

interface Tip {
  block: PaletteBlock;
  top: number;
  right: number;
}

function Tooltip({ tip, notes }: { tip: Tip; notes: Map<string, SkillNote> }) {
  const { block } = tip;
  return (
    <div className="fk-hd-tip" style={{ top: tip.top, right: tip.right }} role="tooltip">
      <div className="fk-hd-tip__name">{block.label}</div>
      {block.english ? <div className="fk-hd-tip__en">{block.english}</div> : null}
      <div className="fk-hd-tip__stat">
        {block.count} 个已有技能用到{block.asCost ? `，其中 ${block.asCost} 个用作代价` : ''}
      </div>
      {block.examples.length ? (
        <div className="fk-hd-tip__eg">
          例如
          {block.examples.map((id) => {
            const note = notes.get(id);
            return (
              <span key={id} className="fk-hd-tip__skill">
                〖{note?.title ?? id}〗{note?.general ? `·${note.general}` : ''}
              </span>
            );
          })}
        </div>
      ) : null}
      {block.citation ? <code className="fk-hd-tip__cite">{block.citation}</code> : null}
    </div>
  );
}

export interface PaletteProps {
  /** Which skill and stack a click lands in, printed so it is never a guess. */
  target: string;
  onAdd: (lane: Lane, block: string) => void;
}

const TABS: Lane[] = ['trigger', 'conditions', 'cost', 'actions'];

export function Palette({ target, onAdd }: PaletteProps) {
  const [tab, setTab] = useState<Lane>('trigger');
  const [query, setQuery] = useState('');
  const [tip, setTip] = useState<Tip | null>(null);
  const notes = useSkillNotes();
  const column = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => {
    if (!query.trim()) return sectionsFor(tab);
    const hits = search(PALETTE[tab], query);
    return hits.length ? [{ key: 'hits', title: `找到 ${hits.length} 块`, blocks: hits }] : [];
  }, [tab, query]);

  return (
    <div className="fk-hd-palette" ref={column}>
      <div className="fk-hd-palette__tabs" role="tablist" aria-label="积木类别">
        {TABS.map((lane) => (
          <button
            key={lane}
            type="button"
            role="tab"
            aria-selected={tab === lane}
            className={`fk-hd-palette__tab fk-hd-palette__tab--${lane}`}
            onClick={() => setTab(lane)}
          >
            {LANE_LABEL[lane]}
          </button>
        ))}
      </div>

      <div className="fk-hd-palette__target">
        点一下积木，加到 <b>{target}</b>
      </div>

      <input
        className="fk-hd-palette__search"
        value={query}
        placeholder="搜积木，中英文都行"
        aria-label="搜索积木"
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="fk-hd-palette__list" onScroll={() => setTip(null)}>
        {sections.map((section) => (
          <section key={section.key} className="fk-hd-palette__section">
            <h4>{section.title}</h4>
            {section.blocks.map((block) => (
              <button
                key={block.id}
                type="button"
                className={`fk-hd-chipblock fk-hd-chipblock--${tab}`}
                onClick={() => onAdd(tab, block.id)}
                onMouseEnter={(e) => {
                  const box = e.currentTarget.getBoundingClientRect();
                  const host = column.current?.getBoundingClientRect();
                  setTip({
                    block,
                    top: Math.min(box.top, window.innerHeight - 200),
                    right: window.innerWidth - (host?.left ?? box.left) + 10,
                  });
                }}
                onMouseLeave={() => setTip(null)}
                onFocus={(e) => {
                  const box = e.currentTarget.getBoundingClientRect();
                  const host = column.current?.getBoundingClientRect();
                  setTip({
                    block,
                    top: Math.min(box.top, window.innerHeight - 200),
                    right: window.innerWidth - (host?.left ?? box.left) + 10,
                  });
                }}
                onBlur={() => setTip(null)}
              >
                <span className="fk-hd-chipblock__label">{block.label}</span>
                <span className="fk-hd-chipblock__count">{block.count}</span>
              </button>
            ))}
          </section>
        ))}
        {sections.length === 0 ? (
          <p className="fk-hd-note">
            没有匹配的积木。冷门的写法交给「AI 设计」——积木只覆盖常用的那一批。
          </p>
        ) : null}
      </div>

      {tip ? <Tooltip tip={tip} notes={notes} /> : null}
    </div>
  );
}
