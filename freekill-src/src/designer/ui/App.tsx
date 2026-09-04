/**
 * The whole panel: the card, the canvas, and the drawer of blocks.
 *
 * Three columns, and the middle one never goes away. 「AI 设计」 and
 * 「我的武将」 are tabs in the RIGHT column rather than screens of their own,
 * because both of them exist to put a spec on the canvas and a player who
 * cannot see the canvas change has no idea whether they did. Watching thirty
 * blocks appear where there were none is the entire point of the AI lane.
 *
 * `window.__designerSpec` is the spec as the canvas holds it. It is there so a
 * browser test can read the truth rather than scraping it back out of the DOM,
 * and it is assigned in an effect so it is always the committed state and never
 * a render-time snapshot that a bailed-out render leaves behind.
 */
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import type { HeroSpec } from '../spec';
import { AiPanel } from './components/AiPanel';
import { Canvas } from './components/Canvas';
import { HeroCard } from './components/HeroCard';
import { MyHeroes } from './components/MyHeroes';
import { Palette } from './components/Palette';
import { createHero, validateHero, type CreateResponse, type ValidateResponse } from './api';
import { problemsOf } from './problems';
import type { Lane } from './palette';
import { clearDraft, initialState, loadDraft, reduce, saveDraft, type DesignerState } from './state';

declare global {
  interface Window {
    /** The spec the blocks currently describe. Read by the browser test. */
    __designerSpec?: HeroSpec;
  }
}

type Side = 'palette' | 'ai' | 'heroes';

const SIDE_LABEL: Record<Side, string> = { palette: '积木库', ai: 'AI 设计', heroes: '我的武将' };

const boot = (): DesignerState => ({ ...initialState(), ...loadDraft() });

export function App() {
  const [state, dispatch] = useReducer(reduce, undefined, boot);
  const [side, setSide] = useState<Side>('palette');
  const [validation, setValidation] = useState<ValidateResponse | null>(null);
  const [created, setCreated] = useState<CreateResponse | null>(null);
  const [busy, setBusy] = useState<'validate' | 'create' | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [showLua, setShowLua] = useState(false);
  const [heroesKey, setHeroesKey] = useState(0);

  const problems = useMemo(() => problemsOf(state.spec), [state.spec]);

  // Keyed on what is actually persisted, not on `state`. Selecting a different
  // stack changes `state` and nothing that gets saved, and a draft carrying a
  // megabyte of base64 portrait would be re-stringified on every click.
  useEffect(() => {
    window.__designerSpec = state.spec;
    saveDraft(state);
  }, [state.spec, state.image]);

  // Anything that changes the blocks invalidates a validation of the old ones.
  // Leaving a stale 「校验通过」 on screen beside an edited stack is a lie the
  // player has no way to spot.
  useEffect(() => {
    setValidation(null);
    setCreated(null);
  }, [state.spec]);

  const add = useCallback((lane: Lane, block: string) => {
    dispatch({ type: 'add-block', lane, block });
  }, []);

  const load = useCallback((spec: HeroSpec) => dispatch({ type: 'load', spec }), []);

  const run = async (what: 'validate' | 'create') => {
    setBusy(what);
    setFailure(null);
    try {
      if (what === 'validate') {
        const result = await validateHero(state.spec);
        setValidation(result);
        setShowLua(Boolean(result.lua));
      } else {
        const result = await createHero(state.spec, state.image);
        setCreated(result);
        setShowLua(Boolean(result.lua));
        if (result.ok) setHeroesKey((n) => n + 1);
      }
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  };

  const target = `技能 ${state.selected.skill + 1} · 时机 ${state.selected.effect + 1}`;
  const lua = created?.lua ?? validation?.lua;
  const serverErrors = created?.errors?.length ? created.errors : validation?.errors ?? [];

  return (
    <div className="fk-hd">
      <header className="fk-hd__top">
        <a className="fk-hd__brand" href="./">
          狗卡杀
        </a>
        <span className="fk-hd__page">武将设计器</span>
        <span className="fk-hd__lede">点右边的积木，搭出一个自己的武将。</span>
        <div className="fk-hd__topright">
          {problems.ok ? (
            <span className="fk-hd-ok">积木没问题</span>
          ) : (
            <span className="fk-hd-count">{problems.errors.length} 处待修</span>
          )}
          <button
            type="button"
            className="fk-hd-btn"
            onClick={() => {
              clearDraft();
              dispatch({ type: 'reset' });
            }}
          >
            清空重来
          </button>
        </div>
      </header>

      <main className="fk-hd__body">
        <aside className="fk-hd__left">
          <HeroCard state={state} problems={problems} dispatch={dispatch} />
        </aside>

        <section className="fk-hd__mid">
          <div className="fk-hd__scroll">
            <Canvas state={state} problems={problems} dispatch={dispatch} />
          </div>

          <footer className="fk-hd__actions">
            <div className="fk-hd__actionrow">
              <button
                type="button"
                className="fk-hd-btn"
                disabled={busy !== null}
                onClick={() => void run('validate')}
              >
                {busy === 'validate' ? '校验中…' : '校验'}
              </button>
              <button
                type="button"
                className="fk-hd-btn fk-hd-btn--primary"
                disabled={busy !== null || !problems.ok}
                title={problems.ok ? '生成武将并在真实对局里试跑' : '先把红色的地方补齐'}
                onClick={() => void run('create')}
              >
                {busy === 'create' ? '创建中…' : '创建武将'}
              </button>
              {lua ? (
                <button type="button" className="fk-hd-btn" onClick={() => setShowLua(!showLua)}>
                  {showLua ? '收起 Lua' : '查看生成的 Lua'}
                </button>
              ) : null}
              {validation && validation.ok && !created ? <span className="fk-hd-ok">校验通过</span> : null}
            </div>

            {failure ? <p className="fk-hd-err">{failure}</p> : null}

            {serverErrors.length ? (
              <ul className="fk-hd-errlist">
                {serverErrors.map((e, i) => (
                  <li key={i}>
                    {e.path ? <code>{e.path}</code> : null} {e.message}
                  </li>
                ))}
              </ul>
            ) : null}

            {validation?.warnings?.length ? (
              <ul className="fk-hd-errlist fk-hd-errlist--warn">
                {validation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}

            {created ? (
              <div className={`fk-hd-result${created.ok && created.test?.ok !== false ? '' : ' fk-hd-result--bad'}`}>
                <div className="fk-hd-result__head">
                  <span className={`fk-hd-status fk-hd-status--${created.ok ? 'created' : 'failed'}`}>
                    {created.ok ? '已创建' : '创建失败'}
                  </span>
                  {created.test ? (
                    <span className={`fk-hd-status fk-hd-status--${created.test.ok ? 'created' : 'failed'}`}>
                      {created.test.ok ? '试跑通过' : '试跑失败'}
                    </span>
                  ) : null}
                  {created.general ? <code>{created.general}</code> : null}
                </div>
                {created.ok ? (
                  <p className="fk-hd-note">
                    回到大厅开一局，在选将框里就能挑到「{state.spec.name || state.spec.id}」——
                    它和其他武将一样从同一份武将池里发出来。
                  </p>
                ) : null}
                {created.test?.log ? <pre className="fk-hd-log">{created.test.log}</pre> : null}
              </div>
            ) : null}

            {showLua && lua ? (
              <pre className="fk-hd-lua">
                <code>{lua}</code>
              </pre>
            ) : null}
          </footer>
        </section>

        <aside className="fk-hd__right">
          <div className="fk-hd__sidetabs" role="tablist" aria-label="右栏">
            {(Object.keys(SIDE_LABEL) as Side[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={side === key}
                className="fk-hd__sidetab"
                onClick={() => setSide(key)}
              >
                {SIDE_LABEL[key]}
              </button>
            ))}
          </div>
          <div className="fk-hd__sidebody">
            {side === 'palette' ? <Palette target={target} onAdd={add} /> : null}
            {side === 'ai' ? <AiPanel spec={state.spec} onSpec={load} /> : null}
            {side === 'heroes' ? <MyHeroes onOpen={load} refreshKey={heroesKey} /> : null}
          </div>
        </aside>
      </main>
    </div>
  );
}
