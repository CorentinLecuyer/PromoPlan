// scripts/signupApp.js

import { signUp } from './supabaseAuth.js';

document.addEventListener('DOMContentLoaded', () => {
    const signUpForm = document.getElementById('signUpForm');
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const countryInput = document.getElementById('country'); // Added
    const channelSelect = document.getElementById('channel'); // Added
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
        const firstName = firstNameInput.value;
        const lastName = lastNameInput.value;
        const country = countryInput.value; // Added
        const channel = channelSelect.value; // Added

        // Updated validation to check all required fields
        if (!email || !password || !firstName || !lastName || !country || !channel) {
            displayMessage('Please fill out all fields to sign up.', true);
            return;
        }

        displayMessage('Signing up...', false);

        // Pass all the collected data as metadata to the signUp function
        const { data, error } = await signUp(email, password, {
            first_name: firstName,
            last_name: lastName,
            country: country,
            channel: channel
        });

        if (error) {
            displayMessage(`Sign Up Failed: ${error.message}`, true);
            return;
        }

        if (data.user) {
            displayMessage('Sign Up Successful! Check your email for confirmation, then log in.', false);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        }
    });

    goToLoginButton.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
});
