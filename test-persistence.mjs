import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Helper to get environment variables from .env.local
function getEnv(key) {
    try {
        const data = fs.readFileSync('.env.local', 'utf8');
        const match = data.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    } catch (err) {
        return null;
    }
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPersistence() {
    console.log("Starting persistence test...");

    // 1. Fetch a report to use as a template
    const { data: fetchResult, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .limit(1);

    if (fetchError || !fetchResult || fetchResult.length === 0) {
        console.error("No reports found to test with.", fetchError);
        return;
    }

    const reportRow = fetchResult[0];
    const originalData = reportRow.data;
    const originalCategory = originalData.transactions?.[0]?.category;

    console.log(`Original Report: ${reportRow.name} (${reportRow.id})`);
    console.log(`Original Category of 1st TX: ${originalCategory}`);

    // 2. Modify the data
    const newData = { ...originalData };
    const updatedCategory = "DEBUG-" + Date.now();
    if (newData.transactions && newData.transactions.length > 0) {
        newData.transactions[0].category = updatedCategory;
    }

    console.log(`Attempting to update category to: ${updatedCategory}`);

    // 3. Upsert it back
    const { error: upsertError } = await supabase
        .from('reports')
        .upsert({
            id: reportRow.id,
            name: reportRow.name,
            timestamp: reportRow.timestamp,
            data: newData,
            user_id: reportRow.user_id
        }, { onConflict: 'id' });

    if (upsertError) {
        console.error("Upsert failed:", upsertError);
        return;
    }

    console.log("Upsert call successful (no error returned).");

    // 4. Fetch again and verify
    const { data: verifyResult, error: verifyError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportRow.id);

    if (verifyError || !verifyResult || verifyResult.length === 0) {
        console.error("Failed to re-fetch report for verification.", verifyError);
        return;
    }

    const updatedReportRow = verifyResult[0];
    const finalCategory = updatedReportRow.data.transactions?.[0]?.category;

    console.log(`Final Category of 1st TX in DB: ${finalCategory}`);

    if (finalCategory === updatedCategory) {
        console.log("SUCCESS: Database was updated correctly!");
    } else {
        console.log("FAILURE: Database still has the original value!");
    }

    // Clean up: Optional - revert changes? No, better leave for inspection if failed.
}

testPersistence();
