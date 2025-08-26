import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xoohhcndzvwthzfdqgjz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvb2hoY25kenZ3dGh6ZmRxZ2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxODE3ODgsImV4cCI6MjA3MTc1Nzc4OH0.RugTPLdcgrM6EXKxCOjvp4FXVPjyyJ9-DidY_SuqWGQ';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database setup utility
export const setupDatabase = async () => {
  console.log('Setting up database...');
  
  // SQL to create the websites table if it doesn't exist
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS websites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'checking',
      uptime INTEGER NOT NULL DEFAULT 0,
      downtime INTEGER NOT NULL DEFAULT 0,
      last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      uptime_percentage REAL DEFAULT 0,
      last_error TEXT
    );
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('Error creating table:', error);
      return false;
    }
    
    console.log('Database setup completed successfully');
    return true;
  } catch (error) {
    console.error('Database setup failed:', error);
    return false;
  }
};

// Test connection and check table structure
const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // First, try to get table info
    const { data: tableData, error: tableError } = await supabase
      .from('websites')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('Supabase table access error:', tableError);
      
      // If table doesn't exist, let's try to understand the error
      if (tableError.message.includes('relation "websites" does not exist')) {
        console.log('Table "websites" does not exist. You need to create it in Supabase.');
        console.log('Required columns: id, name, url, status, uptime, downtime, last_checked, created_at, uptime_percentage, last_error');
      }
      return false;
    }
    
    console.log('Supabase connection successful');
    console.log('Table structure sample:', tableData);
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
};

// Test on startup
testConnection();

export default supabase;