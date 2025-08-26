import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xoohhcndzvwthzfdqgjz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvb2hoY25kenZ3dGh6ZmRxZ2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxODE3ODgsImV4cCI6MjA3MTc1Nzc4OH0.RugTPLdcgrM6EXKxCOjvp4FXVPjyyJ9-DidY_SuqWGQ';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
const testConnection = async () => {
  try {
    const { error } = await supabase.from('websites').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
};

// Test on startup
testConnection();

export default supabase;