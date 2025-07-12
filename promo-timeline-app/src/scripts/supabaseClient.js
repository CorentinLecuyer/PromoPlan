// scripts/supabaseClient.js

// Import the already initialized Supabase client from the auth module
import { supabase } from './supabaseAuth.js'; // NEW IMPORT PATH

// NOTE: SUPABASE_URL and SUPABASE_ANON_KEY are now defined in supabaseAuth.js
// You can remove their definitions from here if they were still present.

/**
 * Fetches promotional items based on selected years, channels, and statuses.
 * @param {Array<string>} selectedYears - Years to filter by.
 * @param {Array<string>} selectedChannels - Channels to filter by.
 * @param {Array<string>} selectedStatuses - Statuses to filter by.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of raw promotional items.
 */
export async function fetchPromotionalItems(selectedYears, selectedChannels, selectedStatuses) {
    try {
        let query = supabase.from('promo_items').select('*');

        if (!selectedStatuses.includes('all') && selectedStatuses.length > 0) {
            query = query.in('status', selectedStatuses);
        }

        if (!selectedYears.includes('all') && selectedYears.length > 0) {
            const numericYears = selectedYears.map(Number).filter(year => !isNaN(year));
            if (numericYears.length > 0) {
                const minYear = Math.min(...numericYears);
                const maxYear = Math.max(...numericYears); // CORRECTED: Changed Math.Max to Math.max
                query = query
                    .gte('promo_start_date', `${minYear}-01-01`)
                    .lt('promo_start_date', `${maxYear + 1}-01-01`);
            }
        }

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