import popularData from '../data/popularArticles.json';

export const ROUND_DURATION_MS = 5 * 60 * 1000;
export const TOTAL_ROUNDS = 5;
export const ROUND_POINTS = [5, 3, 2, 1];

// Keep race topics family-friendly (popular-pages list includes adult entries).
const BLOCKED_TOPICS = new Set([
  'Adolf_Hitler', 'Donald_Trump', 'Joe_Biden', 'World_War_II',
  'XHamster', 'Sex', 'Pornography', 'Pornhub', 'XVideos', 'XNXX',
  'YouPorn', 'RedTube', 'Brazzers', 'Hentai', 'Masturbation',
  'Oral_sex', 'Anal_sex', 'Vagina', 'Penis', 'Vulva',
]);

function isBlockedTopic(title) {
  const normalized = title.replace(/_/g, ' ');
  return BLOCKED_TOPICS.has(title) || BLOCKED_TOPICS.has(normalized);
}

export function getTopics(lang) {
  const list = popularData[lang] ?? popularData.en ?? [];
  const filtered = list.filter((title) => !isBlockedTopic(title));
  const fallback = (popularData.en ?? []).filter((title) => !isBlockedTopic(title));
  return filtered.length ? filtered : fallback;
}

export function pickRoundPair(lang, usedPairs = new Set()) {
  const topics = getTopics(lang);
  const fallbacks = lang === 'zh'
    ? { start: '中国', end: '北京' }
    : { start: 'Albert_Einstein', end: 'Pizza' };
  if (topics.length < 2) return fallbacks;

  for (let attempt = 0; attempt < 50; attempt++) {
    const startIdx = Math.floor(Math.random() * topics.length);
    let endIdx = Math.floor(Math.random() * topics.length);
    while (endIdx === startIdx) {
      endIdx = Math.floor(Math.random() * topics.length);
    }
    const start = topics[startIdx];
    const end = topics[endIdx];
    const key = `${start}→${end}`;
    if (!usedPairs.has(key)) {
      return { start, end };
    }
  }
  const start = topics[0];
  const end = topics[Math.min(1, topics.length - 1)];
  return { start, end };
}

export function generateRounds(lang) {
  const usedPairs = new Set();
  const rounds = [];
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const pair = pickRoundPair(lang, usedPairs);
    usedPairs.add(`${pair.start}→${pair.end}`);
    rounds.push({ round: i + 1, ...pair });
  }
  return rounds;
}

export function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return { m, s: s.toString().padStart(2, '0'), label: `${m}:${s.toString().padStart(2, '0')}` };
}

export function scoreRound(finishers) {
  const sorted = [...finishers].sort((a, b) => a.elapsedMs - b.elapsedMs);
  const scores = {};
  sorted.forEach((p, i) => {
    scores[p.id] = ROUND_POINTS[i] ?? 1;
  });
  return { sorted, scores };
}

export function displayTitle(title) {
  return title.replace(/_/g, ' ');
}

export function randomRoomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
