import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace these with your own Supabase project details from your Supabase dashboard
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;


// Intelligent connection handler for Android stability
const customFetch = (url: any, options: any) => {
  const headers = {};
  
  // 1. Start with any existing headers
  if (options?.headers) {
    if (typeof (options.headers as any).forEach === 'function') {
      (options.headers as any).forEach((v: string, k: string) => { headers[k] = v; });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  // 2. Ensure security keys are present
  if (!headers['apikey']) headers['apikey'] = supabaseAnonKey;
  if (!headers['Authorization']) headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
  
  // 3. Apply the Android stability patch
  headers['Connection'] = 'keep-alive';
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';

  return fetch(url, {
    ...options,
    headers,
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch,
    headers: { 'x-application-name': 'notflix' },
  },
});

