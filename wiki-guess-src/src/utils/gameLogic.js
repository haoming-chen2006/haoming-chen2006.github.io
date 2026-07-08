import popularData from '../data/popularArticles.json';

export const ROUND_DURATION_MS = 5 * 60 * 1000;
export const TOTAL_ROUNDS = 5;
export const ROUND_POINTS = [5, 3, 2, 1];

// Final-round "boss" pairs: both endpoints are household-famous, but they live
// in wildly different worlds so connecting them is brutal. Stored in English;
// each round carries srcLang so every player (any language) gets them
// translated at runtime via langlinks.
const HARD_PAIRS = [
  ['LeBron_James', 'Excalibur'],
  ['Pizza', 'Black_hole'],
  ['Taylor_Swift', 'Genghis_Khan'],
  ['Pikachu', 'French_Revolution'],
  ['SpongeBob_SquarePants', 'Quantum_mechanics'],
  ['Cristiano_Ronaldo', 'Photosynthesis'],
  ['Mona_Lisa', 'Basketball'],
  ['Coca-Cola', 'Julius_Caesar'],
  ['Mount_Everest', 'Beyoncé'],
  ['Sushi', 'Isaac_Newton'],
  ['Darth_Vader', 'Great_Wall_of_China'],
  ['Minecraft', 'William_Shakespeare'],
  ['Elon_Musk', 'Ancient_Egypt'],
  ['The_Beatles', 'DNA'],
  ['Harry_Potter', 'Periodic_table'],
  ['IPhone', 'Roman_Empire'],
  ['Titanic_(1997_film)', 'Mount_Fuji'],
  ['Pokémon', 'World_War_I'],
  ['Michael_Jackson', 'Amazon_River'],
  ['Batman', 'Great_Barrier_Reef'],
  ['Instagram', 'Napoleon'],
  ['Lion', 'Eiffel_Tower'],
  ['Association_football', 'Solar_System'],
  ["McDonald's", 'Leonardo_da_Vinci'],
  ['Spider-Man', 'Mount_Kilimanjaro'],
  ['Nintendo', 'Cleopatra'],
  ['YouTube', 'Ludwig_van_Beethoven'],
  ['Banana', 'Nikola_Tesla'],
  ['Dinosaur', 'Statue_of_Liberty'],
  ['Great_white_shark', 'Wolfgang_Amadeus_Mozart'],
];

export function pickHardPair() {
  const [start, end] = HARD_PAIRS[Math.floor(Math.random() * HARD_PAIRS.length)];
  return { start, end, srcLang: 'en', hard: true };
}

// Topics are hand-curated in popularArticles.json, so nothing is blocked.
const BLOCKED_TOPICS = new Set([]);

function isBlockedTopic(title) {
  const normalized = title.replace(/_/g, ' ');
  return BLOCKED_TOPICS.has(title) || BLOCKED_TOPICS.has(normalized);
}

function categoriesFor(lang) {
  return popularData.categories?.[lang === 'zh' ? 'zh' : 'en'] || [];
}

// Categories with blocked topics stripped out; empty categories dropped.
function cleanCategories(lang) {
  return categoriesFor(lang)
    .map((cat) => cat.filter((title) => !isBlockedTopic(title)))
    .filter((cat) => cat.length > 0);
}

export function getTopics(lang) {
  // Data may be a flat list per lang, or only categories we flatten.
  const list = popularData[lang] ?? categoriesFor(lang).flat();
  const filtered = list.filter((title) => !isBlockedTopic(title));
  const fallbackSource = popularData.en ?? categoriesFor('en').flat();
  const fallback = fallbackSource.filter((title) => !isBlockedTopic(title));
  return filtered.length ? filtered : fallback;
}

export function pickRoundPair(lang, usedPairs = new Set()) {
  const categories = cleanCategories(lang).length ? cleanCategories(lang) : [getTopics(lang)];

  const fallbacks = lang === 'zh'
    ? { start: '中国', end: '北京' }
    : { start: 'Albert_Einstein', end: 'Pizza' };

  if (categories.length < 2) {
    if (!categories[0] || categories[0].length < 2) return fallbacks;
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    // Pick two DIFFERENT categories
    let catStartIdx = Math.floor(Math.random() * categories.length);
    let catEndIdx = Math.floor(Math.random() * categories.length);
    
    // Fallback if only 1 flat category exists
    if (categories.length > 1) {
      while (catEndIdx === catStartIdx) {
        catEndIdx = Math.floor(Math.random() * categories.length);
      }
    }
    
    const catStart = categories[catStartIdx];
    const catEnd = categories[catEndIdx];
    
    // Pick articles from each category
    const startIdx = Math.floor(Math.random() * catStart.length);
    let endIdx = Math.floor(Math.random() * catEnd.length);
    
    if (catStart === catEnd) {
      while (endIdx === startIdx) {
         endIdx = Math.floor(Math.random() * catEnd.length);
      }
    }

    const start = catStart[startIdx];
    const end = catEnd[endIdx];
    const key = `${start}→${end}`;
    
    if (!usedPairs.has(key)) {
      return { start, end };
    }
  }
  
  // Last resort
  const flat = getTopics(lang);
  const start = flat[0];
  const end = flat[Math.min(1, flat.length - 1)];
  return { start, end };
}

export function generateRounds(lang) {
  const usedPairs = new Set();
  const rounds = [];
  // Rounds 1..N-1 are normal cross-category pairs.
  for (let i = 0; i < TOTAL_ROUNDS - 1; i++) {
    const pair = pickRoundPair(lang, usedPairs);
    usedPairs.add(`${pair.start}→${pair.end}`);
    rounds.push({ round: i + 1, ...pair });
  }
  // Final round is a deliberately brutal "boss" pair.
  rounds.push({ round: TOTAL_ROUNDS, ...pickHardPair() });
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
