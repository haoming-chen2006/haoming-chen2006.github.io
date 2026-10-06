/**
 * 播报: match announcements spoken in 中文 through the browser's speech synthesis as a stand-in for the official
 * announcer. When `assets-hok/announcer/<key>.ogg` exists the loader plays that instead.
 */
const CLIPS: Record<string, string> = {
  '@streak.firstBlood': '一血', '@streak.double': '双杀', '@streak.triple': '三杀', '@streak.quad': '四杀', '@streak.penta': '五杀',
  '@streak.killingSpree': '大杀特杀', '@streak.unstoppable': '无人能挡', '@streak.rampage': '横扫千军', '@streak.peerless': '天下无双', '@streak.dominating': '主宰比赛', '@streak.legendary': '超神', '@streak.ace': '团灭',
  '@objective.tyrant': '暴君已被击杀', '@objective.overlord': '主宰已被击杀', '@objective.tyrantSpawned': '暴君已刷新', '@objective.overlordSpawned': '主宰已刷新',
  tower_mine: '我方防御塔被摧毁', tower_foe: '敌方防御塔被摧毁', victory: '胜利', defeat: '失败', start: '全军出击',
};

const FILE: Record<string, string> = {
  '@streak.firstBlood': 'first_blood', '@streak.double': 'double', '@streak.triple': 'triple', '@streak.quad': 'quadra', '@streak.penta': 'penta', '@streak.ace': 'ace',
  '@objective.tyrant': 'tyrant', '@objective.overlord': 'overlord', tower_mine: 'tower', tower_foe: 'tower', victory: 'victory', defeat: 'defeat',
};

class Announcer {
  enabled = true;
  /** Resolved relative to the page, so it works at / and at /kingsroad/. */
  base = 'assets-hok/announcer/';
  private missing = new Set<string>();
  private voice: SpeechSynthesisVoice | null = null;
  private lastT = 0;
  private lastKey = '';

  private pickVoice(): SpeechSynthesisVoice | null {
    if (typeof speechSynthesis === 'undefined') return null;
    if (this.voice) return this.voice;
    const voices = speechSynthesis.getVoices();
    this.voice = voices.find((v) => /zh[-_]CN/i.test(v.lang) && /ting|yu|mei|xiaoxiao|hui|li/i.test(v.name)) ?? voices.find((v) => /^zh/i.test(v.lang)) ?? null;
    return this.voice;
  }

  say(key: string): void {
    if (!this.enabled) return;
    const text = CLIPS[key];
    if (!text) return;
    const now = performance.now();
    if (key === this.lastKey && now - this.lastT < 1500) return;
    this.lastKey = key; this.lastT = now;
    const file = FILE[key];
    if (file && !this.missing.has(file)) {
      const a = new Audio(`${this.base}${file}.ogg`);
      a.volume = 0.9;
      a.play().catch(() => { this.missing.add(file); this.speak(text); });
      a.addEventListener('error', () => { this.missing.add(file); this.speak(text); }, { once: true });
      return;
    }
    this.speak(text);
  }

  private speak(text: string): void {
    if (typeof speechSynthesis === 'undefined') return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN'; u.rate = 0.95; u.pitch = 0.85; u.volume = 1;
      const v = this.pickVoice(); if (v) u.voice = v;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch { /* no speech on this platform */ }
  }
}

export const announcer = new Announcer();
