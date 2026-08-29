import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    envVars[key.trim()] = values.join('=').trim().replace(/"/g, '');
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_PUBLISHABLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log("=== VERIFYING ROWS ===");
  const { data: rows, error: selectError } = await supabase
    .from('app_update_config')
    .select('*')
    .order('app')
    .order('platform');

  if (selectError) {
    console.error("Failed to query app_update_config:", selectError);
    return;
  }
  
  console.log(`Found ${rows?.length || 0} rows.`);
  console.log(JSON.stringify(rows, null, 2));

  console.log("\n=== VERIFYING RLS WRITE PROTECTION ===");
  // Attempt an insert
  const { error: insertError } = await supabase
    .from('app_update_config')
    .insert([{ app: 'customer', platform: 'ios', latest_version: '99.99', minimum_supported_version: '99.99', store_url: 'test' }]);
  
  if (insertError) {
    console.log("Insert failed as expected due to RLS:", insertError.message);
  } else {
    console.log("WARNING: Insert succeeded! RLS might not be restricting inserts properly.");
  }

  // Attempt an update
  const { error: updateError } = await supabase
    .from('app_update_config')
    .update({ latest_version: '99.99' })
    .eq('app', 'customer')
    .eq('platform', 'ios');

  if (updateError) {
    console.log("Update failed as expected due to RLS:", updateError.message);
  } else {
    // If it succeeds, it might be a silent success if it updated 0 rows. Let's check the result.
    console.log("Update call did not return an error, but it likely updated 0 rows due to RLS.");
  }
}

verify();
