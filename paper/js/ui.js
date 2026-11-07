// Shared UI state and cross-module actions (filled in by main.js).
import { store } from './util.js';

export const ui = {
  view: 'notebook',
  chapter: null,
  tags: new Set(),
  day: null,
  sort: ['read', 'updated', 'title'].includes(store.get('paper.sort')) ? store.get('paper.sort') : 'read',
  query: '',
  results: null,       // search results or null
  searching: false,
  noteId: null,
  overview: false,
  cursor: -1,
  match: new Map(),    // note id -> matched section heading (from the last search)
  rawOpen: false,
  editing: false,
};

export const actions = {
  navigate: (hash) => { location.hash = hash; },
  render: () => {},
  renderList: () => {},
  renderReader: () => {},
  refreshData: async () => {},
  dockJob: () => {},
  openSettings: () => {},
  confirm: async () => false,
};

export const noteHref = (id) => `#/note/${encodeURIComponent(id)}`;
