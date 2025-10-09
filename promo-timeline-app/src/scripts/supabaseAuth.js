// scripts/supabaseAuth.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration (replace with your actual URL and Key)
const SUPABASE_URL = 'https://wbvfmgyaudfkhridkhep.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmZtZ3lhdWRma2hyaWRraGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjM0ODQsImV4cCI6MjA2NTkzOTQ4NH0.ycacnokvGqBRAKCBAOaWJMjafiFGB3KuAp3gQYGJLrc';

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Signs up a new user with email and metadata, then sends a setup password link.
 * @param {string} email - User's email.
 * @param {object} metadata - An object containing data like { first_name, last_name }.
 * @returns {Promise<object>} Supabase auth response.
 */
export async function signUp(email, metadata) {
    // Step 1: Sign up the user WITHOUT a password.
    // This creates the user in auth.users but does not log them in.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        options: {
            data: metadata
        }
    });

    if (signUpError) {
        console.error('Sign up error:', signUpError.message);
        return { data: null, error: signUpError };
    }

    // Check if a user was actually created and needs a password setup link
    if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        // This indicates a real new user was created who doesn't have any providers yet.
        // We can skip sending the email if the user already exists.
        console.log(`User ${email} already exists. Skipping password setup email.`);
        // You might want to return a specific message to the UI here.
        return { data: signUpData, error: { message: "User already exists." } };
    }

    // Step 2: Immediately send a "reset password" email.
    // This will serve as the user's setup/invitation link.
    const { error: resetError } = await resetPassword(email);

    if (resetError) {
        console.error('Error sending password setup email:', resetError.message);
        // Even if the email fails, the user was created. You might need manual intervention.
        return { data: null, error: resetError };
    }

    console.log('User created and password setup email sent.');
    return { data: signUpData, error: null };
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


export async function resetPassword(email) {
    console.log('Attempting to send password reset code...');

    const { data, error } = await supabase.auth.resetPasswordForEmail(email); // redirectTo removed

    if (error) {
        console.error('Password reset API call failed:', error.message);
    } else {
        console.log('Password reset API call succeeded. Check your email for the code.');
    }
    return { data, error };
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
 * @param {object} profileUpdates - An object containing profile data like { data: { display_name, avatar_emoji }, first_name, etc. }.
 * @returns {Promise<object>} Supabase response object { data, error }.
 */
export async function updateUserProfile(profileUpdates) {
    try {
        // This will be the final payload for supabase.auth.updateUser()
        const authUpdatePayload = {};
        // This will be the final payload for the 'user_profiles' table
        const profileTablePayload = {};

        // --- Correctly map the incoming data ---

        // 1. Handle metadata fields, which are passed inside a 'data' object.
        if (profileUpdates.data) {
            authUpdatePayload.data = profileUpdates.data;
        }

        // 2. Handle fields for the custom 'user_profiles' table
        if (profileUpdates.first_name) {
            profileTablePayload.first_name = profileUpdates.first_name;
        }
        if (profileUpdates.last_name) {
            profileTablePayload.last_name = profileUpdates.last_name;
        }
        if (profileUpdates.country) {
            profileTablePayload.country = profileUpdates.country;
        }
        if (profileUpdates.channel) {
            profileTablePayload.channel = profileUpdates.channel;
        }

        // --- Perform the updates ---

        // Get the current user to know their ID for the profile table update
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw userError || new Error("User not found and is required for updates.");
        }

        // A. Update the auth user's data (metadata)
        // Only call the update function if there's something to update.
        if (Object.keys(authUpdatePayload).length > 0) {
            const { error: authError } = await supabase.auth.updateUser(authUpdatePayload);
            if (authError) throw authError;
        }

        // B. Update the separate user_profiles table
        // Only call the update function if there's something to update.
        if (Object.keys(profileTablePayload).length > 0) {
            const { error: profileError } = await supabase
                .from('user_profiles')
                .update(profileTablePayload)
                .eq('id', user.id);
            if (profileError) throw profileError;
        }

        // If we reach here, the operations were successful.
        // Return the latest user data.
        return { data: user, error: null };

    } catch (error) {
        console.error('Update user profile error:', error.message);
        return { data: null, error };
    }
}

