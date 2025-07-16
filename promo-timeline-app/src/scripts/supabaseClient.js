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


/**
 * Creates a new promotional item in the database.
 * @param {object} promoData - An object containing the new promotion's details.
 * @returns {Promise<object>} Supabase response object { data, error }.
 */
export async function createPromo(promoData) {
    // Remove the 'id' field as the database will generate it automatically
    const { id, ...newPromoData } = promoData;

    const { data, error } = await supabase
        .from('promo_items')
        .insert([newPromoData])
        .select() // Use .select() to return the newly created row, including its new ID
        .single(); // Expect a single object back

    if (error) {
        console.error('Supabase createPromo error:', error.message);
    }
    return { data, error };
}



/**
 * Fetches a single promotional item by its ID.
 * @param {string} promoId - The ID of the promotion to fetch.
 * @returns {Promise<object>} A promise that resolves to the promo object or null if not found/no access.
 */
export async function fetchPromoById(promoId) {
    try {
        const { data, error } = await supabase
            .from('promo_items')
            .select('*')
            .eq('id', promoId)
            .single(); // Use .single() to expect one row

        if (error) {
            // RLS might return no data with a null error if user doesn't have access
            // Or a specific error if the query itself is malformed.
            if (error.code === 'PGRST116') { // No rows found for .single()
                return { data: null, error: null }; // Return null data, no error
            }
            console.error('Supabase fetchPromoById error:', error.message);
            return { data: null, error: error };
        }
        return { data, error: null };
    } catch (error) {
        console.error('Error in fetchPromoById:', error);
        return { data: null, error: error };
    }
}



/**
 * Updates an existing promotional item.
 * @param {string} promoId - The ID of the promotion to update.
 * @param {object} updates - An object containing the fields to update.
 * @returns {Promise<object>} Supabase response (data/error).
 */
export async function updatePromo(promoId, updates) {
    try {
        // When updating, ensure you only send fields that are allowed/expected by your RLS
        // and that the user has permission to update.
        const { data, error } = await supabase
            .from('promo_items')
            .update(updates)
            .eq('id', promoId)
            .select(); // Select the updated row to confirm

        if (error) {
            console.error('Supabase updatePromo error:', error.message);
        }
        return { data, error };
    } catch (error) {
        console.error('Error in updatePromo:', error);
        return { data: null, error: error };
    }
}

/**
 * Deletes a promotional item.
 * @param {string} promoId - The ID of the promotion to delete.
 * @returns {Promise<object>} Supabase response (data/error).
 */
export async function deletePromo(promoId) {
    try {
        const { error } = await supabase
            .from('promo_items')
            .delete()
            .eq('id', promoId);

        if (error) {
            console.error('Supabase deletePromo error:', error.message);
        }
        return { error };
    } catch (error) {
        console.error('Error in deletePromo:', error);
        return { error: error };
    }
}

export async function fetchAllTableData() { // <--- ADD 'export' HERE
    const { data, error } = await supabase
        .from('promoTables_items') // **IMPORTANT: Replace with your actual Supabase table name that stores table definitions**
        .select('*');

    return { data, error };
}

export async function createPromoTableItem(tableData) {
    const { data, error } = await supabase
        .from('promoTables_items')
        .insert([tableData])
        .select(); // Use .select() to return the inserted data, including its ID
    return { data, error };
}

/**
 * Updates an existing item in the promoTables_items table.
 * @param {number} tableId - The ID of the table to update.
 * @param {object} updates - An object with the data to update (e.g., table_name, style, th, tr).
 * @returns {Promise<object>} Supabase response object { data, error }.
 */
export async function updatePromoTableItem(tableId, updates) {
    const { data, error } = await supabase
        .from('promoTables_items')
        .update(updates)
        .eq('id', tableId)
        .select(); // Return the updated row

    if (error) {
        console.error('Supabase updatePromoTableItem error:', error);
    }

    return { data, error };
}

/**
 * Deletes an item from the promoTables_items table.
 * @param {number} tableId - The ID of the table to delete.
 * @returns {Promise<object>} Supabase response object { error }.
 */
export async function deletePromoTableItem(tableId) {
    const { error } = await supabase
        .from('promoTables_items')
        .delete()
        .eq('id', tableId);

    if (error) {
        console.error('Supabase deletePromoTableItem error:', error);
    }

    return { error };
}

export async function createPromoTableWithFunction(tableData) {
  // The RPC call now uses the correct 'p_' prefixed parameter names
  const { data, error } = await supabase.rpc('create_new_table', {
    p_name: tableData.table_name,
    p_style: tableData.style,
    p_headers: tableData.th,
    p_rows: tableData.tr
  });
  return { data, error };
}
