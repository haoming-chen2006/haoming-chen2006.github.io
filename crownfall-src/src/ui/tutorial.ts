/** Guided first-battle tutorial: spotlight + tip cards that advance on gameplay events. */

export type TutorialEvent = 'deployed' | 'possessed' | 'attacked' | 'ability' | 'released' | 'summoned' | 'heroDeath' | 'locked';

interface Step {
  id: string;
  title: string;
  text: string;
  target: string | 'stage-center' | 'stage-reticle' | 'none';
  triggers: TutorialEvent[];
  place: 'above' | 'below' | 'left' | 'center';
}

const STEPS: Step[] = [
  { id: 'deploy', title: 'Deploy a troop', text: 'Press <kbd>1</kbd>–<kbd>4</kbd> or click a card, then click your half of the arena. Troops march down their lane on their own.', target: 'hand', triggers: ['deployed'], place: 'left' },
  { id: 'possess', title: 'Possess it', text: 'Hover your troop and press <kbd>F</kbd> (or click it). Your soul flies into the troop and you see through its eyes.', target: 'stage-center', triggers: ['possessed'], place: 'below' },
  { id: 'fight', title: 'Fight in first person', text: 'Click to capture the mouse, look around, and <b>hold click</b> to attack at the crosshair. <kbd>WASD</kbd> moves. Cross a bridge to reach the enemy towers.', target: 'stage-reticle', triggers: ['attacked'], place: 'below' },
  { id: 'ability', title: 'Signature ability', text: 'Every troop has one. Press <kbd>Space</kbd> to fire it at the crosshair. <kbd>Shift</kbd> dashes.', target: 'skill-ability', triggers: ['ability'], place: 'left' },
  { id: 'summon', title: 'Summon reinforcements', text: 'While possessed, cards deploy beside you, even in enemy territory. Press <kbd>1</kbd>–<kbd>4</kbd>, aim at the ground, click.', target: 'hand', triggers: ['summoned', 'released', 'heroDeath'], place: 'left' },
  { id: 'return', title: 'Return to the throne', text: 'Press <kbd>E</kbd> to leave your champion, or fight until it falls: your soul returns and you keep commanding.', target: 'heroPanel', triggers: ['released', 'heroDeath'], place: 'left' },
  { id: 'done', title: 'You are ready', text: 'Take two Princess Towers for crowns, or the King Tower to win outright. Good hunting, Commander.', target: 'none', triggers: [], place: 'center' },
  // Detour shown when the champion is lost before the possession steps are finished.
  { id: 'repossess', title: 'Your champion fell', text: 'Your soul is back on the throne. Deploy another troop, hover it and press <kbd>F</kbd> to possess it and carry on.', target: 'hand', triggers: ['possessed'], place: 'left' },
];
const MAIN_STEPS = STEPS.length - 1; // 'repossess' is a detour, not part of the sequence

const $ = (id: string): HTMLElement | null => document.getElementById(id);

export class Tutorial {
  active = false;
  private idx = 0;
  private root: HTMLElement;
  private spot: HTMLElement;
  private card: HTMLElement;
  private onDone: () => void;
  private doneTimer = 0;
  private resumeIdx = -1;
  private layoutBound = () => this.layout();
  private canvasClick = () => { if (this.active && STEPS[this.idx]?.id === 'fight') this.advance(); };

  constructor(onDone: () => void) {
    this.onDone = onDone;
    const root = $('tutorial');
    if (!root) throw new Error('missing #tutorial');
    this.root = root;
    this.spot = document.createElement('div'); this.spot.className = 'tut-spot';
    this.card = document.createElement('div'); this.card.className = 'tut-card';
    root.append(this.spot, this.card);
  }

  start(): void {
    this.active = true;
    this.idx = 0;
    this.resumeIdx = -1;
    this.root.classList.remove('hidden');
    window.addEventListener('resize', this.layoutBound);
    document.getElementById('canvas')?.addEventListener('pointerdown', this.canvasClick);
    this.render();
  }

  /** Jump to a named step. */
  step(name: string): void {
    const i = STEPS.findIndex((s) => s.id === name);
    if (i < 0) return;
    this.idx = i;
    if (!this.active) { this.active = true; this.root.classList.remove('hidden'); }
    this.render();
  }

  /** Feed a gameplay event; advances when it matches the current step. */
  notify(ev: TutorialEvent): void {
    if (!this.active) return;
    const s = STEPS[this.idx];
    if (!s) return;
    // Losing the champion during the possession steps: detour, then come back to where we were.
    if ((ev === 'heroDeath' || ev === 'released') && (s.id === 'fight' || s.id === 'ability')) {
      this.resumeIdx = this.idx;
      this.idx = STEPS.findIndex((x) => x.id === 'repossess');
      this.render();
      return;
    }
    if (!s.triggers.includes(ev)) return;
    if (s.id === 'repossess') {
      this.idx = this.resumeIdx >= 0 ? this.resumeIdx : STEPS.findIndex((x) => x.id === 'fight');
      this.resumeIdx = -1;
      this.render();
      return;
    }
    this.advance();
  }

  currentStep(): string | null { return this.active ? STEPS[this.idx]?.id ?? null : null; }

  /**
   * Hide the tutorial. `completed` marks it as finished so it does not show again; leaving a
   * match early (the game calling dismiss() without arguments) keeps it for the next battle.
   */
  dismiss(completed = false): void {
    if (!this.active) return;
    this.active = false;
    window.clearTimeout(this.doneTimer);
    window.removeEventListener('resize', this.layoutBound);
    document.getElementById('canvas')?.removeEventListener('pointerdown', this.canvasClick);
    this.root.classList.add('hidden');
    if (completed) this.onDone();
  }

  private advance(): void {
    this.idx++;
    if (this.idx >= MAIN_STEPS) { this.dismiss(true); return; }
    this.render();
    if (STEPS[this.idx].id === 'done') { window.clearTimeout(this.doneTimer); this.doneTimer = window.setTimeout(() => this.dismiss(true), 4500); }
  }

  private targetRect(s: Step): DOMRect | null {
    const stage = $('stage');
    if (s.target === 'none') return null;
    if (s.target === 'stage-center' && stage) { const r = stage.getBoundingClientRect(); const w = Math.min(360, r.width * 0.45), h = Math.min(300, r.height * 0.42); return new DOMRect(r.left + r.width / 2 - w / 2, r.top + r.height / 2 - h / 2 + 20, w, h); }
    if (s.target === 'stage-reticle' && stage) { const r = stage.getBoundingClientRect(); return new DOMRect(r.left + r.width / 2 - 90, r.top + r.height / 2 - 90, 180, 180); }
    if (s.target === 'skill-ability') { const el = document.querySelector('#heroPanel .skill[data-s="ability"]') as HTMLElement | null; return el ? el.getBoundingClientRect() : ($('heroPanel')?.getBoundingClientRect() ?? null); }
    const el = $(s.target);
    return el ? el.getBoundingClientRect() : null;
  }

  private render(): void {
    const s = STEPS[this.idx];
    if (!s) return;
    const shown = s.id === 'repossess' ? (this.resumeIdx >= 0 ? this.resumeIdx : 2) : this.idx;
    const progress = STEPS.slice(0, MAIN_STEPS - 1).map((_, i) => `<i class="${i < shown ? 'done' : ''}"></i>`).join('');
    this.card.innerHTML = `<div class="progress">${progress}</div><h4><span>${s.title}</span><small>${Math.min(shown + 1, MAIN_STEPS - 1)} / ${MAIN_STEPS - 1}</small></h4><p>${s.text}</p><div class="row"><button class="btn small ghost" data-act="skip">Skip tutorial</button>${s.id === 'done' ? '<button class="btn small primary" data-act="ok">Let\'s go</button>' : '<button class="btn small" data-act="next">Next</button>'}</div>`;
    this.card.querySelector('[data-act="skip"]')?.addEventListener('click', () => this.dismiss(true));
    this.card.querySelector('[data-act="ok"]')?.addEventListener('click', () => this.dismiss(true));
    this.card.querySelector('[data-act="next"]')?.addEventListener('click', () => { if (s.id === 'repossess') { this.idx = this.resumeIdx >= 0 ? this.resumeIdx : 2; this.resumeIdx = -1; this.render(); } else this.advance(); });
    this.layout();
    this.card.classList.add('enter');
    requestAnimationFrame(() => requestAnimationFrame(() => this.card.classList.remove('enter')));
  }

  layout(): void {
    if (!this.active) return;
    const s = STEPS[this.idx];
    if (!s) return;
    const rect = this.targetRect(s);
    const vw = window.innerWidth, vh = window.innerHeight;
    const cw = 300;
    const entering = this.card.classList.contains('enter');
    this.card.className = entering ? 'tut-card enter' : 'tut-card';
    if (!rect) {
      this.spot.style.display = 'none';
      this.card.classList.add('arrow-none');
      this.card.style.left = `${vw / 2 - cw / 2}px`;
      this.card.style.top = `${vh * 0.3}px`;
      return;
    }
    this.spot.style.display = 'block';
    const pad = 8;
    this.spot.style.left = `${rect.left - pad}px`; this.spot.style.top = `${rect.top - pad}px`;
    this.spot.style.width = `${rect.width + pad * 2}px`; this.spot.style.height = `${rect.height + pad * 2}px`;
    // card placement
    const ch = this.card.offsetHeight || 150;
    let left = rect.left + rect.width / 2 - cw / 2, top = rect.top - ch - 18;
    if (s.place === 'left') { left = rect.left - cw - 18; top = rect.top + rect.height / 2 - ch / 2; this.card.classList.add('arrow-right'); }
    else if (s.place === 'below') { top = rect.bottom + 18; this.card.classList.add('arrow-top'); }
    if (left < 10) { left = 10; }
    if (left + cw > vw - 10) left = vw - 10 - cw;
    if (top < 10) top = 10;
    if (top + ch > vh - 10) top = vh - 10 - ch;
    this.card.style.left = `${left}px`;
    this.card.style.top = `${top}px`;
  }
}
