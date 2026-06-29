import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://bgxmcgsfkjhpocptrezi.supabase.co';
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_18hn9O3SKu_Sr1H7RRGVKw_5lnb8UJL';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // Implicit flow keeps the access token in the URL hash so magic links work
    // on any device/browser, not just the one that requested the link (PKCE
    // requires a per-browser code verifier and breaks cross-device sign in).
    flowType: 'implicit',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'worldcup-guess-auth',
  },
});
