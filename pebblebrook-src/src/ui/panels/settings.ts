import type { LlmSettings } from '../../core/app.ts';
import { guardTextField, h, icon, setHidden, setText } from '../dom.ts';
import type { Panel, UiCore } from '../shared.ts';
import { frame } from './frame.ts';

const MODELS: Record<LlmSettings['provider'], { id: string; label: string }[]> = {
  none: [],
  anthropic: [{ id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — fast, cheap (default)' }, { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 — richer' }, { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' }],
  openai: [{ id: 'gpt-4o-mini', label: 'GPT-4o mini — fast, cheap' }, { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' }, { id: 'gpt-4o', label: 'GPT-4o' }],
};

export function createSettings(core: UiCore): Panel {
  const { ctx } = core;
  const applyBtn = h('button', { class: 'pb-btn', id: 'pb-settings-apply', onclick: () => apply() }, 'Apply');
  const { win, body } = frame(core, 'settings', { title: 'Settings', cls: 'pb-settings', foot: h('div', { class: 'pb-foot' }, h('span', { class: 'pb-small pb-muted grow' }, 'Saved in this browser.'), h('button', { class: 'pb-btn ghost', onclick: () => core.close('settings') }, 'Close'), applyBtn) });

  const music = h('input', { class: 'pb-range', type: 'range', min: 0, max: 100, step: 5, 'aria-label': 'Music volume' });
  const sfx = h('input', { class: 'pb-range', type: 'range', min: 0, max: 100, step: 5, 'aria-label': 'Sound volume' });
  const musicV = h('span', { class: 'v' }), sfxV = h('span', { class: 'v' });
  const quality = h('select', { class: 'pb-select', 'aria-label': 'Graphics quality' }, h('option', { value: 'high' }, 'High — lighting and weather'), h('option', { value: 'low' }, 'Low — for small laptops'));
  const typewriter = h('input', { type: 'checkbox' });
  music.oninput = () => setText(musicV, `${music.value}%`); sfx.oninput = () => setText(sfxV, `${sfx.value}%`);

  const provider = h('select', { class: 'pb-select', id: 'pb-llm-provider', 'aria-label': 'AI provider' }, h('option', { value: 'none' }, 'None — local brains only'), h('option', { value: 'anthropic' }, 'Anthropic (Claude)'), h('option', { value: 'openai' }, 'OpenAI'));
  const key = h('input', { class: 'pb-input', id: 'pb-llm-key', type: 'password', placeholder: 'sk-…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'API key' });
  const showKey = h('button', { class: 'pb-btn ghost', title: 'Show / hide key', 'aria-label': 'Show or hide key', onclick: () => { key.type = key.type === 'password' ? 'text' : 'password'; } }, icon('eye'));
  const model = h('input', { class: 'pb-input', id: 'pb-llm-model', list: 'pb-llm-models', placeholder: 'model id', 'aria-label': 'Model' });
  const modelList = h('datalist', { id: 'pb-llm-models' });
  const mode = h('select', { class: 'pb-select', id: 'pb-llm-mode', 'aria-label': 'AI mode' }, h('option', { value: 'all' }, 'All — every decision and every line'), h('option', { value: 'social' }, 'Social — conversations and reflections only'), h('option', { value: 'off' }, 'Off — keep the key, use local brains'));
  const budget = h('input', { class: 'pb-input', type: 'number', min: 1, max: 600, step: 1, 'aria-label': 'Requests per in-game hour' });
  const providerNote = h('div', { class: 'note' });
  for (const f of [key, model, budget]) guardTextField(f);
  const llmRows = h('div');
  provider.onchange = () => refreshProvider(true);

  function refreshProvider(resetModel: boolean): void {
    const p = provider.value as LlmSettings['provider'];
    setHidden(llmRows, p === 'none');
    modelList.replaceChildren(...MODELS[p].map((m) => h('option', { value: m.id }, m.label)));
    if (resetModel && MODELS[p][0]) model.value = MODELS[p][0].id;
    providerNote.replaceChildren(p === 'anthropic' ? 'Uses the Anthropic Messages API directly from your browser. The key stays in this browser (localStorage) and is sent only to api.anthropic.com. Haiku 4.5 keeps a whole village talking for a few cents an hour.'
      : p === 'openai' ? 'Uses the OpenAI chat completions API directly from your browser. The key stays in this browser (localStorage) and is sent only to api.openai.com.'
      : 'With no provider the villagers use their local brains: utility scoring, schedules, goals and a large bank of templates. They are still individuals — just less surprising.');
  }

  body.append(
    h('h3', null, 'Sound and picture'),
    h('div', { class: 'row' }, h('label', null, 'Music'), music, musicV),
    h('div', { class: 'row' }, h('label', null, 'Sounds'), sfx, sfxV),
    h('div', { class: 'row' }, h('label', null, 'Quality'), quality, h('span')),
    h('div', { class: 'row' }, h('label', null, 'Dialogue'), h('label', { class: 'pb-check' }, typewriter, 'Type out villager lines letter by letter'), h('span')),
    h('div', { class: 'pb-sep' }),
    h('h3', null, h('span', { class: 'pb-row', style: 'display:inline-flex' }, icon('brain'), ' AI brains')),
    h('div', { class: 'row' }, h('label', null, 'Provider'), provider, h('span')),
    providerNote,
    llmRows,
  );
  llmRows.append(
    h('div', { class: 'row' }, h('label', null, 'API key'), h('div', { class: 'keyrow' }, key, showKey), h('span')),
    h('div', { class: 'row' }, h('label', null, 'Model'), model, modelList),
    h('div', { class: 'row' }, h('label', null, 'Mode'), mode, h('span')),
    h('div', { class: 'row' }, h('label', null, 'Budget'), budget, h('span', { class: 'v', style: 'min-width:auto' }, 'requests / in-game hour')),
    h('div', { class: 'note' }, 'Any failed or slow request falls back to the local brain for that decision, so the village never stalls. Requests are queued: at most three in flight.'),
  );

  function load(): void {
    const s = core.settings;
    music.value = String(Math.round(s.music * 100)); sfx.value = String(Math.round(s.sfx * 100)); setText(musicV, `${music.value}%`); setText(sfxV, `${sfx.value}%`);
    quality.value = s.quality; typewriter.checked = s.typewriter;
    const l = ctx.getLlm();
    provider.value = l.provider; key.value = l.apiKey; model.value = l.model; mode.value = l.mode; budget.value = String(l.budgetPerHour);
    refreshProvider(false);
  }
  function apply(): void {
    const s = core.settings;
    s.music = Number(music.value) / 100; s.sfx = Number(sfx.value) / 100; s.quality = quality.value as 'high' | 'low'; s.typewriter = typewriter.checked;
    core.saveSettings();
    ctx.audio.setVolume(s.music, s.sfx); ctx.renderer.setQuality(s.quality);
    const p = provider.value as LlmSettings['provider'];
    ctx.setLlm({ provider: p, apiKey: key.value.trim(), model: model.value.trim() || (MODELS[p][0]?.id ?? ''), mode: p === 'none' ? 'off' : (mode.value as LlmSettings['mode']), budgetPerHour: Math.max(1, Number(budget.value) || 60) });
    core.toast(p === 'none' ? 'Settings saved. Villagers use their local brains.' : mode.value === 'off' ? 'Key saved. Pick a mode (all / social) to let the model think for them.' : `Settings saved. ${p === 'anthropic' ? 'Claude' : 'OpenAI'} will think for the villagers (${mode.value === 'all' ? 'everything' : 'conversations and reflections'}).`, 'good');
    core.close('settings');
  }
  return { id: 'settings', el: win, modal: true, closable: true, show: load, hide() {}, tick() {} };
}
