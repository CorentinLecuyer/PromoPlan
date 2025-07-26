import { supabase, getUser } from './supabaseAuth.js';

/**
 * Ensures the provided value is an array. Handles null, undefined, and single values.
 * @param {*} value - The value to check.
 * @returns {Array} An array, guaranteed.
 */
function ensureArray(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (value) {
        return [value];
    }
    return [];
}

/**
 * Fetches promotional items by chaining Supabase filter methods.
 * This is the correct and robust way to handle multiple, complex filters.
 * @param {object} filters - An object containing arrays of filter criteria.
 * @param {object} [options={}] - Additional options like ownPromosOnly.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of raw promotional items.
 */
export async function fetchPromotionalItems(filters = {}, options = {}) {
    const user = await getUser();
    // Start the query chain. We will add filters to this.
    let query = supabase.from('promo_items').select('*');

    try {
        const safeFilters = {
            year: ensureArray(filters.year),
            status: ensureArray(filters.status),
            promo_type: ensureArray(filters.promo_type),
            country: ensureArray(filters.country),
            author: ensureArray(filters.author),
            owner: ensureArray(filters.owner),
            promo_budget_type: ensureArray(filters.promo_budget_type),
            channel_tags: ensureArray(filters.channel_tags),
        };

        // --- Chain all filters sequentially ---

        // Filter by user ID if requested (for Profile page)
        if (options.ownPromosOnly && user) {
            query = query.eq('user_id', user.id);
        }

        // Year Filter
        if (safeFilters.year.length > 0) {
            const yearConditions = safeFilters.year.map(y =>
                `and(promo_start_date.gte.${y}-01-01,promo_start_date.lt.${parseInt(y) + 1}-01-01)`
            ).join(',');
            query = query.or(yearConditions);
        }

        // Status Filter
        if (safeFilters.status.length > 0) {
            query = query.in('status', safeFilters.status);
        }

        // Promo Type Filter
        if (safeFilters.promo_type.length > 0) {
            query = query.in('promo_type', safeFilters.promo_type);
        }

        // Country Filter
        if (safeFilters.country.length > 0) {
            query = query.in('country', safeFilters.country);
        }

        // Author Filter
        if (safeFilters.author.length > 0) {
            query = query.in('author', safeFilters.author);
        }

        // Owner Filter
        if (safeFilters.owner.length > 0) {
            query = query.in('owner', safeFilters.owner);
        }

        // Budget Type Filter (for array columns)
        if (safeFilters.promo_budget_type.length > 0) {
            // FIX: Use the .filter() method for the 'contains' operator.
            // The value needs to be in the format '{item1,item2}'
            const budgetTypesString = `{${safeFilters.promo_budget_type.join(',')}}`;
            query = query.filter('promo_budget_type', 'cs', budgetTypesString);
        }

        // Channel Tags Filter (handles 'mine' logic)
        const channelTags = safeFilters.channel_tags;
        const hasMine = channelTags.includes('mine');
        const otherChannels = channelTags.filter(c => c !== 'mine');

        if (hasMine && user) {
            if (otherChannels.length > 0) {
                // This .or() string already uses the correct syntax for 'cs'
                query = query.or(`owner.eq.${user.id},channel_tags.cs.{${otherChannels.join(',')}}`);
            } else {
                query = query.eq('owner', user.id);
            }
        } else if (otherChannels.length > 0) {
            // FIX: Use the .filter() method here as well.
            const channelsString = `{${otherChannels.join(',')}}`;
            query = query.filter('channel_tags', 'cs', channelsString);
        }

        // --- Execute the final query ---
        const { data, error } = await query;

        if (error) {
            console.error('Supabase fetchPromotionalItems error:', error);
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


// ===================================================================
// Team Management Functions
// ===================================================================

export async function fetchAllUsers() {
        const { data, error } = await supabase
        .from('user_profiles')
        .select(`
            *,
            team_members (
                role,
                teams (id, name)
            )
        `)


    if (error) {
        console.error('Error fetching all user profiles:', error);
    }
    return { data, error };
}

// This version now also fetches team data for each subordinate.
export async function fetchSubordinates(managerId) {
    const { data, error } = await supabase
        .from('user_profiles')
        .select(`
            *,
            team_members (
                role,
                teams (id, name)
            ),
            channel:channels (name)
        `)
        .eq('manager_id', managerId);
    
    if (error) console.error('Error fetching subordinates:', error);
    return { data, error };
}

/**
 * Fetches the entire management chain above a given user.
 * This version is self-contained and more efficient.
 */
export async function fetchManagers(userId) {
    const { data: managerIds, error: rpcError } = await supabase.rpc('get_all_managers', {
        user_id_input: userId
    });

    if (rpcError || !managerIds || managerIds.length === 0) {
        return { data: [], error: rpcError };
    }

    const idsToFetch = managerIds.map(m => m.manager_id);
    if (idsToFetch.length === 0) {
        return { data: [], error: null };
    }

    const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
            *,
            team_members (
                role,
                teams (id, name)
            ),
            channel:channels (name)
        `)
        .in('id', idsToFetch);

    // Sort the full profiles based on the level from the RPC call
    const sortedData = managerIds
        .sort((a, b) => a.level - b.level)
        .map(m => profiles.find(p => p.id === m.manager_id))
        .filter(Boolean);

    return { data: sortedData, error: profileError };
}

/**
 * Finds peers from a pre-fetched list of all users. This is very efficient.
 */
export async function fetchPeers(userId, managerId) {
    // A user needs a manager to have peers.
    if (!managerId) {
        return { data: [], error: null };
    }

    const { data, error } = await supabase
        .from('user_profiles')
        .select(`
            *,
            team_members (
                role,
                teams (id, name)
            ),
            channel:channels (name)
        `)
        // Find users with the same manager...
        .eq('manager_id', managerId)
        // ...but exclude the user themselves from the list.
        .neq('id', userId);

    if (error) console.error('Error fetching peers:', error);

    return { data, error };
}

/**
 * Updates or creates a user's team membership.
 */
export async function updateUserTeamMembership(userId, teamId, role) {
    const { data, error } = await supabase
        .from('team_members')
        .upsert({
            user_id: userId,
            team_id: teamId,
            role: role
        }, { onConflict: 'user_id' })
        .select();
    
    if (error) console.error('Error updating team membership:', error);
    return { data, error };
}

export async function updateUserProfileFields(userId, updates) {
    const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select();

    if (error) console.error('Error updating user profile fields:', error);
    return { data, error };
}


export async function fetchCountries() {
    const { data, error } = await supabase.from('countries').select('id, name, bu');
    if (error) console.error('Error fetching countries:', error);
    return { data, error };
}

export async function fetchChannels() {
    const { data, error } = await supabase.from('channels').select('id, name');
    if (error) console.error('Error fetching channels:', error);
    return { data, error };
}

/**
 * Calls a secure Edge Function to update a user's full profile.
 * @param {string} userId - The ID of the user to update.
 * @param {object} updates - An object containing all fields to update.
 * @returns {Promise<object>} An object containing { error }.
 */
export async function updateFullUserProfile(userId, updates) {
    const { error } = await supabase.rpc('update_user_details', {
        user_id_to_update: userId,
        new_first_name: updates.first_name,
        new_last_name: updates.last_name,
        new_country_id: updates.country_id, // Changed from country
        new_channel_id: updates.channel_id, // Changed from channel
        new_manager_id: updates.manager_id,
        new_display_name: updates.display_name,
        new_avatar_emoji: updates.avatar_emoji,
        new_employee_id: updates.employee_id,
        new_job_title: updates.job_title,
        new_app_role: updates.app_role
    });

    if (error) console.error('Error updating full user profile:', error);
    return { error };
}

export async function fetchTeams(channelId) {
    // If no channelId is provided, return an empty array.
    if (!channelId) {
        return { data: [], error: null };
    }

    // Fetch teams where the 'channel_id' column matches the selected channel.
    const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('channel_id', channelId); // This .eq() is the filter

    if (error) console.error('Error fetching teams:', error);
    return { data, error };
}



