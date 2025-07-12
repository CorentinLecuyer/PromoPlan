// scripts/supabaseClient.js

// Import the Supabase client library directly within the module
// This makes the 'createClient' function available within this module's scope.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// For security, never expose your service_role key in client-side code.
// Replace with your actual Supabase URL and public 'anon' key.
const SUPABASE_URL = 'https://wbvfmgyaudfkhridkhep.supabase.co'; // e.g., 'https://abcde12345.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmZtZ3lhdWRma2hyaWRraGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjM0ODQsImV4cCI6MjA2NTkzOTQ4NH0.ycacnokvGqBRAKCBAOaWJMjafiFGB3KuAp3gQYGJLrc'; // e.g., 'eyJhbGciOiJIUzI1Ni...'


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetches promotional items from Supabase based on provided filters.
 * Filters by year based on promo_start_date.
 * @param {Array<string>} selectedYears - Years to filter by.
 * @param {Array<string>} selectedChannels - Channels to filter by.
 * @param {Array<string>} selectedStatuses - Statuses to filter by (e.g., ['public'], ['private', 'draft'], ['all']).
 * @returns {Promise<Array<object>>} A promise that resolves to an array of raw promotional items.
 */
export async function fetchPromotionalItems(selectedYears, selectedChannels, selectedStatuses) {
    try {
        let query = supabase.from('promo_items').select('*');

        // Apply status filter based on selectedStatuses
        if (!selectedStatuses.includes('all') && selectedStatuses.length > 0) {
            query = query.in('status', selectedStatuses);
        }
        // If 'all' is selected, no status filter is applied, allowing RLS to take full effect.

        // Apply year filter using promo_start_date
        if (!selectedYears.includes('all') && selectedYears.length > 0) {
            const numericYears = selectedYears.map(Number).filter(year => !isNaN(year));
            if (numericYears.length > 0) {
                const minYear = Math.min(...numericYears);
                const maxYear = Math.max(...numericYears);
                query = query
                    .gte('promo_start_date', `${minYear}-01-01`)
                    .lt('promo_start_date', `${maxYear + 1}-01-01`);
            }
        }

        // Apply channel filter using 'contains' for array columns
        if (!selectedChannels.includes('all') && selectedChannels.length > 0) {
            query = query.contains('channel_tags', selectedChannels);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Supabase fetchPromotionalItems error:', error.message);
            throw new Error('Failed to load promotional data from database.');
        }

        return data;
    } catch (error) {
        console.error('Error in fetchPromotionalItems:', error);
        return [];
    }
}

/**
 * Fetches display table data from Supabase.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of raw table data.
 */
export async function fetchDisplayTables() {
    try {
        const { data, error } = await supabase
            .from('promoTables_items')
            .select('*');

        if (error) {
            console.error('Supabase fetchDisplayTables error:', error.message);
            throw new Error('Failed to load table data from database.');
        }

        return data;
    } catch (error) {
        console.error('Error in fetchDisplayTables:', error);
        return [];
    }
}