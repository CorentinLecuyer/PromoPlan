// scripts/loginApp.js

import { signIn, resetPassword, supabase } from './supabaseAuth.js'; // Import auth functions and supabase instance
import { showToast } from './shared/toast.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const signInButton = document.getElementById('signInButton');
    const resetPasswordButton = document.getElementById('resetPasswordButton');
    const authMessage = document.getElementById('authMessage');

    // Handle Sign In
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission
        const email = emailInput.value;
        const password = passwordInput.value;

        showToast('Signing in...', 'info');
        const { data, error } = await signIn(email, password);

        if (error) {
            showToast(`Sign In Failed: ${error.message}`, 'error');
        } else if (data.user && data.session) {
            showToast('Sign In Successful! Redirecting...', 'success');
            window.location.href = 'profile.html';
        } else {
            showToast('Sign In Failed: Check your credentials.', 'error');
        }
    });



    // Handle Password Reset
    resetPasswordButton.addEventListener('click', async () => {
        const email = prompt("Please enter your email address to receive a password reset code:");
        if (email) {
            authMessage.textContent = 'Sending reset code...';
            authMessage.style.color = '#333';
            const { error } = await resetPassword(email);
            if (error) {
                authMessage.textContent = error.message;
                authMessage.style.color = 'red';
            } else {
                authMessage.textContent = 'Reset code sent! Please check your email and go to the reset password page.';
                authMessage.style.color = 'green';
                // Optionally redirect them to the page where they'll enter the code
                window.location.href = 'set-password.html';
            }
        }
    });

    // Optional: Check session on load to see if user is already logged in
    async function checkSession() {
        const session = await supabase.auth.getSession();
        if (session && session.data.session) {
            showToast('Already logged in. Redirecting...', 'info');
            window.location.href = 'CommandBoard.html';
        }
    }
    checkSession();
});