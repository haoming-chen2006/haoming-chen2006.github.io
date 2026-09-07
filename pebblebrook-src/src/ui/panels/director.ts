import { fmtDate, MINUTES_PER_DAY } from '../../core/time.ts';
import type { WeatherKind } from '../../core/types.ts';
import { download, h, icon, img, replaceChildren, setClass, setHidden, setText, Throttle } from '../dom.ts';
import { cap, clock12, fmtDuration, fmtStamp, shortName, simFn, SPEEDS, type Panel, type UiCore } from '../shared.ts';
import { frame } from './frame.ts';

const WEATHERS: WeatherKind[] = ['sunny', 'cloudy', 'rain', 'storm', 'fog', 'snow'];

export function createDirector(core: UiCore): Panel {
  const { ctx } = core;
  const { win, body } = frame(core, 'director', { title: 'Director', key: 'G', cls: 'pb-director' });
  const eventsEl = h('div', { class: 'pb-list' }), forecastEl = h('div', { class: 'pb-list' }), activeEl = h('div', { class: 'pb-list' }), brainsEl = h('div', { class: 'brains' });
  const clockEl = h('div', { class: 'pb-row wrap' }, h('b', { style: 'font-family:var(--pb-font-display);font-size:16px;white-space:nowrap' }), h('span', { class: 'pb-muted pb-small' }));
  const pauseBtn = h('button', { class: 'pb-btn ghost sm', onclick: () => core.togglePause() }, 'Pause');
  const speedBtns = SPEEDS.map((s) => h('button', { class: 'pb-btn ghost sm', onclick: () => core.setSpeed(s) }, `${s}×`));
  const jumpBtn = h('button', { class: 'pb-btn wood sm', title: 'Simulate until 6:00 tomorrow', onclick: () => jump() }, 'Next morning');
  const hourBtn = h('button', { class: 'pb-btn wood sm', title: 'Simulate one hour', onclick: () => advance(60) }, '+1 hour');
  const weatherSel = h('select', { class: 'pb-select', style: 'width:auto', 'aria-label': 'Weather override' }, ...WEATHERS.map((w) => h('option', { value: w }, cap(w))));
  const weatherBtn = h('button', { class: 'pb-btn ghost sm', onclick: () => setWeather() }, 'Set weather');
  const weatherRow = h('div', { class: 'pb-row' }, h('span', null, 'Weather'), weatherSel, weatherBtn);
  const allLocal = h('button', { class: 'pb-btn ghost sm', onclick: () => { for (const v of ctx.sim.villagers) ctx.sim.setBrain(v.id, 'local'); lastBrainKey = ''; } }, 'All local');
  const allLlm = h('button', { class: 'pb-btn ghost sm', onclick: () => { if (!ctx.sim.brains.llm || ctx.getLlm().provider === 'none') { core.toast('No AI provider configured — Settings → AI brains', 'warn'); return; } for (const v of ctx.sim.villagers) ctx.sim.setBrain(v.id, 'llm'); lastBrainKey = ''; } }, 'All model');
  const llmNote = h('div', { class: 'pb-small pb-muted' });
  const exportArea = h('textarea', { class: 'pb-textarea', readonly: true, style: 'min-height:120px;font-size:11px', 'aria-label': 'Chronicle text' });
  const exportBtn = h('button', { class: 'pb-btn wood sm', onclick: () => { const t = chronicleText(); exportArea.value = t; setHidden(exportArea, false); if (!download(`pebblebrook-chronicle-day${ctx.world.time.dayIndex}.txt`, t)) core.toast('Download blocked here — copy it from the box instead', 'warn'); else core.toast('Chronicle downloaded (and shown below)', 'good'); } }, 'Export chronicle');
  const copyBtn = h('button', { class: 'pb-btn ghost sm', onclick: () => { exportArea.value = chronicleText(); setHidden(exportArea, false); exportArea.select(); try { void navigator.clipboard?.writeText(exportArea.value); core.toast('Copied', 'good'); } catch { /* no clipboard */ } } }, 'Copy');
  const section = (title: string, ...kids: HTMLElement[]) => h('div', { class: 'pb-section' }, h('h3', null, title), ...kids);
  body.append(
    h('div', { class: 'col' },
      section('Events', h('div', { class: 'pb-small pb-muted', style: 'margin-bottom:6px' }, 'Fire anything; the villagers will hear about it and react in their own way.'), eventsEl)),
    h('div', { class: 'col' },
      section('Time', clockEl, h('div', { class: 'pb-row wrap' }, pauseBtn, ...speedBtns, h('span', { class: 'pb-right' }), hourBtn, jumpBtn), weatherRow),
      section('Happening now', activeEl),
      section('Forecast', forecastEl),
      section('Brains', h('div', { class: 'pb-row', style: 'margin-bottom:6px' }, allLocal, allLlm, llmNote), brainsEl),
      section('Chronicle', h('div', { class: 'pb-row' }, exportBtn, copyBtn), h('div', { style: 'margin-top:8px' }, exportArea))));
  setHidden(exportArea, true);

  let lastEvKey = '', lastActKey = '', lastFcKey = '', lastBrainKey = '';
  const th = new Throttle(0.5);

  function chronicleText(): string {
    const lines = ctx.sim.chronicle.map((c) => `[${fmtStamp(c.t)}] (${c.importance}) ${c.text}`);
    return `Pebblebrook chronicle — seed ${ctx.world.seed} — ${fmtDate(ctx.world.time)} ${clock12(ctx.world.time.hour, ctx.world.time.min)}\n\n${lines.join('\n')}\n`;
  }
  function advance(minutes: number): void {
    const skip = simFn<(minutes: number) => void>(ctx.sim, 'skipMinutes') ?? simFn<(minutes: number) => void>(ctx.director, 'skip');
    if (skip) { skip(minutes); return; }
    // fallback: simulate in coarse steps (the sim owns the clock)
    const wasPaused = ctx.world.paused; ctx.world.paused = false;
    const t0 = performance.now();
    let left = minutes;
    while (left > 0 && performance.now() - t0 < 4000) { const step = Math.min(5, left); ctx.sim.update(step); ctx.director.update(step); left -= step; }
    ctx.world.paused = wasPaused;
    if (left > 0) core.toast(`Stopped early — the sim needs a skip helper for long jumps (${left} min left)`, 'warn');
  }
  function jump(): void {
    const t = ctx.world.time; const target = (t.dayIndex) * MINUTES_PER_DAY + 6 * 60; // 6:00 tomorrow
    advance(Math.max(1, target - t.minute)); core.toast(`Morning of day ${ctx.world.time.dayIndex}`, 'good');
  }
  function setWeather(): void {
    const kind = weatherSel.value as WeatherKind;
    const f = simFn<(k: WeatherKind) => void>(ctx.director, 'setWeather') ?? simFn<(k: WeatherKind) => void>(ctx.world, 'setWeather');
    if (f) { f(kind); core.toast(`Weather: ${kind}`, 'good'); return; }
    try { (ctx.world.weather as { kind: WeatherKind }).kind = kind; core.toast(`Weather: ${kind} (direct override; the world may change it back)`, 'warn'); } catch { core.toast('This world does not allow weather overrides', 'warn'); }
  }

  function refresh(): void {
    const t = ctx.world.time, w = ctx.world;
    setText(clockEl.firstElementChild as Element, `${clock12(t.hour, t.min)}${w.paused ? ' · paused' : ` · ${w.speed}×`}`); setText(clockEl.lastElementChild as Element, `${fmtDate(t)} · day ${t.dayIndex} · ${w.weather.kind}, tomorrow ${w.weather.forecast}`);
    setClass(pauseBtn, 'on', w.paused); speedBtns.forEach((b, i) => setClass(b, 'on', !w.paused && w.speed === SPEEDS[i]));
    if (weatherSel.value !== w.weather.kind && document.activeElement !== weatherSel) weatherSel.value = w.weather.kind;
    const list = ctx.director.list();
    const ek = list.map((e) => `${e.id}${e.canFire ? 1 : 0}`).join(',');
    if (ek !== lastEvKey) { lastEvKey = ek; replaceChildren(eventsEl, list.length ? list.map((e) => h('div', { class: 'pb-card ev' }, h('div', null, h('b', null, e.name), ' ', h('span', { class: `pb-chip kind-${e.kind}` }, e.kind)), h('button', { class: 'pb-btn sm', disabled: !e.canFire, onclick: () => { const r = ctx.director.fire(e.id); if (r) { core.toast(`${e.name} begins`, 'good'); lastEvKey = ''; lastActKey = ''; } else core.toast(`${e.name} cannot start right now`, 'warn'); } }, 'Fire'), h('div', { class: 'd' }, e.description))) : [h('div', { class: 'pb-empty' }, 'No events available.')]); }
    const act = ctx.director.active.length ? ctx.director.active : ctx.sim.events;
    const ak = act.map((e) => `${e.id}${Math.round((e.endsAt - t.minute) / 10)}`).join(',');
    if (ak !== lastActKey) { lastActKey = ak; replaceChildren(activeEl, act.length ? act.map((e) => h('div', { class: 'pb-card' }, h('div', { class: 'pb-row' }, h('b', { style: 'font-family:var(--pb-font-display)' }, e.name), h('span', { class: `pb-chip kind-${e.kind}` }, e.kind), h('span', { class: 'pb-small pb-muted pb-right' }, e.endsAt > t.minute ? `${fmtDuration(e.endsAt - t.minute)} left` : 'ending')), h('div', { class: 'pb-small' }, e.text), e.place ? h('div', { class: 'pb-small pb-mute2' }, `at ${ctx.world.place(e.place)?.name ?? e.place}`) : null)) : [h('div', { class: 'pb-empty' }, 'A quiet day so far.')]); }
    const fc = ctx.director.forecast();
    const fk = fc.map((f) => `${f.id}${f.dayIndex}`).join(',');
    if (fk !== lastFcKey) { lastFcKey = fk; replaceChildren(forecastEl, fc.length ? fc.map((f) => { const inDays = f.dayIndex - t.dayIndex; return h('div', { class: 'pb-row pb-small' }, h('span', { class: 'pb-chip' }, inDays <= 0 ? 'today' : inDays === 1 ? 'tomorrow' : `in ${inDays} days`), h('span', null, f.name), h('span', { class: 'pb-mute2 pb-right' }, `day ${f.dayIndex}`)); }) : [h('div', { class: 'pb-empty' }, 'Nothing on the calendar.')]); }
    const bk = ctx.sim.villagers.map((v) => `${v.id}${v.brain}`).join(',') + ctx.getLlm().provider;
    if (bk !== lastBrainKey) {
      lastBrainKey = bk;
      const llmOk = !!ctx.sim.brains.llm && ctx.getLlm().provider !== 'none';
      setText(llmNote, llmOk ? `${cap(ctx.getLlm().provider)} · ${ctx.getLlm().model}` : 'no model configured');
      replaceChildren(brainsEl, ctx.sim.villagers.map((v) => h('div', { class: 'b' }, img(core.portrait(v), 'pb-portrait sm', v.name), h('span', null, shortName(v)), h('button', { class: `pb-btn sm ${v.brain === 'llm' ? 'on' : 'ghost'}`, title: 'Toggle local / model', onclick: () => { const next = v.brain === 'llm' ? 'local' : 'llm'; if (next === 'llm' && !llmOk) { core.toast('No AI provider configured — Settings → AI brains', 'warn'); return; } ctx.sim.setBrain(v.id, next); lastBrainKey = ''; } }, icon('brain'), v.brain === 'llm' ? 'model' : 'local'))));
    }
  }
  return { id: 'director', el: win, modal: false, closable: true, show() { lastEvKey = lastActKey = lastFcKey = lastBrainKey = ''; refresh(); }, hide() {}, tick(dt) { if (th.tick(dt)) refresh(); } };
}
