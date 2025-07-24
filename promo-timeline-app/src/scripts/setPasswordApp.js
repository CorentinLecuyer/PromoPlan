// scripts/setPasswordApp.js
import { supabase } from './supabaseAuth.js';

document.addEventListener('DOMContentLoaded', () => {
    const setPasswordForm = document.getElementById('setPasswordForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordError = document.getElementById('passwordError');
    const authMessage = document.getElementById('authMessage');

    // Supabase handles the session from the URL fragment automatically
    // when the client is initialized. We just need to capture the update event.

    setPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Basic password validation
        if (passwordInput.value !== confirmPasswordInput.value) {
            passwordError.textContent = "Passwords do not match.";
            passwordError.style.display = 'block';
            return;
        }
        if (passwordInput.value.length < 8) {
             passwordError.textContent = "Password must be at least 8 characters.";
             passwordError.style.display = 'block';
             return;
        }
        passwordError.style.display = 'none';

        // Update the user's password
        const { error } = await supabase.auth.updateUser({
            password: passwordInput.value
        });

        if (error) {
            authMessage.textContent = `Error setting password: ${error.message}`;
            authMessage.style.color = 'red';
        } else {
            authMessage.textContent = 'Password successfully set! Redirecting you to login...';
            authMessage.style.color = 'green';
            setTimeout(() => {
                window.location.href = 'login.html'; // Redirect to the login page
            }, 2000);
        }
    });
});