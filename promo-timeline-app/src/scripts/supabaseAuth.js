// scripts/supabaseAuth.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration (replace with your actual URL and Key)
const SUPABASE_URL = 'https://wbvfmgyaudfkhridkhep.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmZtZ3lhdWRma2hyaWRraGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjM0ODQsImV4cCI6MjA2NTkzOTQ4NH0.ycacnokvGqBRAKCBAOaWJMjafiFGB3KuAp3gQYGJLrc'; 

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Signs up a new user with email and password.
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @returns {Promise<object>} Supabase auth response (user and session or error).
 */
export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });
    if (error) {
        console.error('Sign up error:', error.message);
    }
    return { data, error };
}

/**
 * Signs in an existing user with email and password.
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @returns {Promise<object>} Supabase auth response (user and session or error).
 */
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) {
        console.error('Sign in error:', error.message);
    }
    return { data, error };
}

/**
 * Signs out the current user.
 * @returns {Promise<object>} Supabase auth response (error if any).
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Sign out error:', error.message);
    }
    return { error };
}

/**
 * Sends a password reset email to the user.
 * @param {string} email - User's email.
 * @returns {Promise<object>} Supabase auth response (error if any).
 */
export async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // redirectTo: 'https://your-domain.com/update-password' // Optional: URL for password update page
    });
    if (error) {
        console.error('Password reset error:', error.message);
    }
    return { error };
}

/**
 * Gets the current authenticated user session.
 * @returns {Promise<object>} Supabase session object or null.
 */
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Get session error:', error.message);
    }
    return session;
}

/**
 * Gets the current authenticated user.
 * @returns {Promise<object>} Supabase user object or null.
 */
export async function getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Get user error:', error.message);
    }
    return user;
}

/**
 * Updates the current user's profile data and authentication details.
 * @param {object} profileUpdates - An object containing profile data like { username, avatar_url, phone }.
 * @returns {Promise<object>} Supabase response object { data, error }.
 */
export async function updateUserProfile(profileUpdates) {
    try {
        // --- This is the new, safer logic ---
        const updateData = {};
        const profileData = {};

        // Separate auth fields (like phone) from profile table fields (like username)
        if (profileUpdates.username) {
            profileData.username = profileUpdates.username;
        }
        if (profileUpdates.avatar_url) {
            profileData.avatar_url = profileUpdates.avatar_url;
        }

        // IMPORTANT: Only add the phone number to the auth update object
        // if it's a non-empty string.
        if (profileUpdates.phone && profileUpdates.phone.trim() !== '') {
            updateData.phone = profileUpdates.phone;
        }
        // --- End of new logic ---


        // First, update the user's authentication data (e.g., phone number)
        // This will only send the phone field if it was provided.
        const { data: authData, error: authError } = await supabase.auth.updateUser(updateData);

        if (authError) {
            // Re-throw the error to be caught by the calling function
            throw authError;
        }

        // Next, update the user's public profile in the 'profiles' table
        const user = authData.user;
        const { error: profileError } = await supabase
            .from('profiles') // Assuming your profile table is named 'profiles'
            .update(profileData)
            .eq('id', user.id);

        if (profileError) {
            throw profileError;
        }

        return { data: user, error: null };

    } catch (error) {
        console.error('Update user profile error:', error.message);
        return { data: null, error };
    }
}
