import { createClient } from '@supabase/supabase-js';

export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // Force disable caching for admin operations
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            cache: 'no-store', 
          });
        },
      },
    }
  );
};

