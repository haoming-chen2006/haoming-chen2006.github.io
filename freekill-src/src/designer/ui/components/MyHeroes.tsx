/**
 * 「我的武将」 — what has already been built, and whether the game accepted it.
 *
 * The test status is the column that matters. `POST /api/designer/create` runs
 * the general through a real game before it says yes, so a row here is either a
 * general that has demonstrably worked or one that did not, and the second kind
 * is exactly what a player wants to re-open. Re-opening loads the stored spec
 * back onto the canvas — the same door the agent's replies and the saved draft
 * come in by (`state.ts`'s `load`) — so a failed general is a starting point
 * rather than a dead end.
 */
import { useCallback, useEffect, useState } from 'react';
import type { HeroSpec } from '../../spec';
import { listHeroes, type HeroRow } from '../api';
import { KINGDOM_NAMES } from '../state';

export interface MyHeroesProps {
  onOpen: (spec: HeroSpec) => void;
  /** Bumped by a successful create so the list refetches without a reload. */
  refreshKey: number;
}

export function MyHeroes({ onOpen, refreshKey }: MyHeroesProps) {
  const [rows, setRows] = useState<HeroRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(() => {
    setError(null);
    listHeroes()
      .then(setRows)
      .catch((cause: unknown) => {
        setRows([]);
        setError(cause instanceof Error ? cause.message : String(cause));
      });
  }, []);

  useEffect(load, [load, refreshKey]);

  return (
    <div className="fk-hd-heroes">
      <div className="fk-hd-heroes__head">
        <span className="fk-hd-note">这里是已经生成过的武将。</span>
        <button type="button" className="fk-hd-btn" onClick={load}>
          刷新
        </button>
      </div>
      {error ? <p className="fk-hd-err">{error}</p> : null}
      {rows === null ? <p className="fk-hd-note">正在读取……</p> : null}
      {rows?.length === 0 && !error ? <p className="fk-hd-note">还没有武将。去左边做一个吧。</p> : null}
      {rows?.map((row, i) => {
        const ok = row.test?.ok;
        return (
          <div key={row.id ?? row.general ?? i} className="fk-hd-herorow">
            <div className="fk-hd-herorow__top">
              <span className="fk-hd-herorow__name">{row.name ?? row.spec?.name ?? row.id ?? '未命名'}</span>
              <span className="fk-hd-herorow__title">{row.title ?? row.spec?.title ?? ''}</span>
              {(row.kingdom ?? row.spec?.kingdom) ? (
                <span className="fk-hd-herorow__kingdom" data-kingdom={row.kingdom ?? row.spec?.kingdom}>
                  {KINGDOM_NAMES[(row.kingdom ?? row.spec?.kingdom) as keyof typeof KINGDOM_NAMES] ?? ''}
                </span>
              ) : null}
              <span className={`fk-hd-status fk-hd-status--${ok === undefined ? 'draft' : ok ? 'created' : 'failed'}`}>
                {ok === undefined ? '未试跑' : ok ? '试跑通过' : '试跑失败'}
              </span>
            </div>
            <div className="fk-hd-herorow__acts">
              {row.spec ? (
                <button type="button" className="fk-hd-btn" onClick={() => onOpen(row.spec as HeroSpec)}>
                  载入积木
                </button>
              ) : (
                <span className="fk-hd-note">这条记录没有附带积木</span>
              )}
              {row.test?.log ? (
                <button type="button" className="fk-hd-btn" onClick={() => setOpen(open === i ? null : i)}>
                  {open === i ? '收起日志' : '查看日志'}
                </button>
              ) : null}
            </div>
            {open === i && row.test?.log ? <pre className="fk-hd-log">{row.test.log}</pre> : null}
          </div>
        );
      })}
    </div>
  );
}
