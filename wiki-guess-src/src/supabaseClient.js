import { createClient } from '@supabase/supabase-js';

// Reuses the World Cup Supabase project purely as a Realtime relay for one
// live game session — no tables are read or written, only Realtime broadcast
// and presence channels. Nothing about the game is persisted.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://bgxmcgsfkjhpocptrezi.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_18hn9O3SKu_Sr1H7RRGVKw_5lnb8UJL';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 20 } },
});
