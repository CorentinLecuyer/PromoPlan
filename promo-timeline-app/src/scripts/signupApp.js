// scripts/signupApp.js

import { signUp, supabase } from './supabaseAuth.js';

document.addEventListener('DOMContentLoaded', () => {
    const signUpForm = document.getElementById('signUpForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const countryInput = document.getElementById('country'); // Keep for now, but will be optional client-side
    const channelSelect = document.getElementById('channel'); // Keep for now, but will be optional client-side
    const submitSignUpButton = document.getElementById('submitSignUpButton');
    const goToLoginButton = document.getElementById('goToLoginButton');
    const authMessage = document.getElementById('authMessage');

    function displayMessage(message, isError = false) {
        authMessage.textContent = message;
        authMessage.style.color = isError ? 'red' : 'green';
    }

    signUpForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        // const country = countryInput.value; // REMOVE THIS
        // const channel = channelSelect.value; // REMOVE THIS

        if (!email || !password) { // Simplify initial check
            displayMessage('Please enter both email and password for sign up.', true);
            return;
        }

        displayMessage('Signing up...', false);

        const { data: authData, error: authError } = await signUp(email, password);

        if (authError) {
            displayMessage(`Sign Up Failed: ${authError.message}`, true);
            return;
        }

        if (authData.user) {
            // --- REMOVE THE profile creation code from here ---
            // The profile creation will now be handled by a Supabase Database Function
            // The country and channel data will be added later, perhaps on first login or a profile edit page.
            displayMessage('Sign Up Successful! Check your email for confirmation and then log in.', false);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        }
    });

    goToLoginButton.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
}); 