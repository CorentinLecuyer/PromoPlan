import { supabase } from './supabaseAuth.js';

document.addEventListener('DOMContentLoaded', () => {
    const setPasswordForm = document.getElementById('setPasswordForm');
    const emailInput = document.getElementById('email');
    const otpInput = document.getElementById('otp');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordError = document.getElementById('passwordError');
    const authMessage = document.getElementById('authMessage');

    setPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        authMessage.textContent = '';
        passwordError.style.display = 'none';

        // 1. Get all form values
        const email = emailInput.value;
        const token = otpInput.value;
        const password = passwordInput.value;

        // 2. Basic password validation
        if (password !== confirmPasswordInput.value) {
            passwordError.textContent = "Passwords do not match.";
            passwordError.style.display = 'block';
            return;
        }
        if (password.length < 8) {
             passwordError.textContent = "Password must be at least 8 characters.";
             passwordError.style.display = 'block';
             return;
        }

        // 3. Verify the OTP
        const { error: verifyError } = await supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'recovery', // This type is crucial for password resets
        });

        if (verifyError) {
            authMessage.textContent = `Error: Invalid code or email. ${verifyError.message}`;
            authMessage.style.color = 'red';
            return;
        }

        // 4. If OTP is valid, update the user's password
        const { error: updateError } = await supabase.auth.updateUser({
            password: password
        });

        if (updateError) {
            authMessage.textContent = `Error setting password: ${updateError.message}`;
            authMessage.style.color = 'red';
        } else {
            authMessage.textContent = 'Password successfully reset! Redirecting you to login...';
            authMessage.style.color = 'green';
            setTimeout(() => {
                window.location.href = 'login.html'; // Redirect to the login page
            }, 3000);
        }
    });
});