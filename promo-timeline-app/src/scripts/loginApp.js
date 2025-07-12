// scripts/loginApp.js

import { signIn, signUp, resetPassword, supabase } from './supabaseAuth.js'; // Import auth functions and supabase instance

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const signInButton = document.getElementById('signInButton');
    const signUpButton = document.getElementById('signUpButton');
    const resetPasswordButton = document.getElementById('resetPasswordButton');
    const authMessage = document.getElementById('authMessage');

    // Function to display messages to the user
    function displayMessage(message, isError = false) {
        authMessage.textContent = message;
        authMessage.style.color = isError ? 'red' : 'green';
    }

    // Handle Sign In
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission
        const email = emailInput.value;
        const password = passwordInput.value;

        displayMessage('Signing in...', false);
        const { data, error } = await signIn(email, password);

        if (error) {
            displayMessage(`Sign In Failed: ${error.message}`, true);
        } else if (data.user && data.session) {
            displayMessage('Sign In Successful! Redirecting...', false);
            // Optional: Redirect to a dashboard or main page after successful login
            window.location.href = 'CommandBoard.html'; 
        } else {
             displayMessage('Sign In Failed: Check your credentials.', true);
        }
    });

    // Handle Sign Up
    goToSignUpButton.addEventListener('click', () => {
        window.location.href = 'signup.html';
    });

    // Handle Password Reset
    resetPasswordButton.addEventListener('click', async () => {
        const email = emailInput.value;

        if (!email) {
            displayMessage('Please enter your email to reset password.', true);
            return;
        }

        displayMessage('Sending password reset email...', false);
        const { error } = await resetPassword(email);

        if (error) {
            displayMessage(`Password Reset Failed: ${error.message}`, true);
        } else {
            displayMessage('Password reset email sent! Check your inbox.', false);
        }
    });

    // Optional: Check session on load to see if user is already logged in
    async function checkSession() {
        const session = await supabase.auth.getSession();
        if (session && session.data.session) {
            displayMessage('Already logged in. Redirecting...', false);
            window.location.href = 'CommandBoard.html';
        }
    }
    checkSession();
});