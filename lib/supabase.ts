import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://wssjhnjuhfvbehotjnlz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzc2pobmp1aGZ2YmVob3Rqbmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzkyNTEsImV4cCI6MjA5MDg1NTI1MX0.a9JhFPY6-EhSZjdSfYI1pM6lQw-rz6BrIoqwdQqtNzg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On web: detect recovery tokens in URL hash (for password reset links)
    // On native: no URL bar, so disable
    detectSessionInUrl: Platform.OS === 'web',
  },
});
