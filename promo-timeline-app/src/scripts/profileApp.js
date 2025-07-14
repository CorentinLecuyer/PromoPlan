// scripts/profileApp.js

import { supabase, signOut, getSession, getUser, updateUserProfile as updateAuthUserProfile } from './supabaseAuth.js';
import { processTimelineItems } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const profileEmojiAvatar = document.getElementById('profileEmojiAvatar');
    const openEmojiPickerButton = document.getElementById('openEmojiPickerButton');
    const emojiPickerContainer = document.getElementById('emojiPickerContainer');
    let selectedEmoji = null;

    const profileUpdateForm = document.getElementById('profileUpdateForm');
    const displayNameInput = document.getElementById('displayName');
    const profileEmailInput = document.getElementById('profileEmail');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const profileCountryInput = document.getElementById('profileCountry');
    const profileChannelInput = document.getElementById('profileChannel');
    const saveProfileButton = document.getElementById('saveProfileButton');
    const profileMessage = document.getElementById('profileMessage');
    const logoutButton = document.getElementById('logoutButton');
    const userPromosTableBody = document.querySelector('#userPromosTable tbody');
    const noPromosMessage = document.getElementById('noPromosMessage');
    const promosMessage = document.getElementById('promosMessage');


    let currentUser = null;

    function displayMessage(message, isError = false, targetElement = profileMessage) {
        targetElement.textContent = message;
        targetElement.style.color = isError ? 'red' : 'green';
    }

    async function checkUserSession() {
        const session = await getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = await getUser();
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        await loadUserProfileData(currentUser.id);
        await loadUserPromotions(currentUser.id);
    }

    async function loadUserProfileData(userId) {
        try {
            profileEmailInput.value = currentUser.email || '';
            displayNameInput.value = currentUser.user_metadata.display_name || '';
            phoneNumberInput.value = currentUser.phone || '';

            selectedEmoji = currentUser.user_metadata.avatar_emoji || '👤';
            profileEmojiAvatar.textContent = selectedEmoji;

            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('country, channel')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('Error fetching user profile:', profileError.message);
                displayMessage('Error loading profile data.', true);
            } else if (profileData) {
                profileCountryInput.value = profileData.country || '';
                profileChannelInput.value = profileData.channel || '';
            }

        } catch (error) {
            console.error('Failed to load user profile data:', error);
            displayMessage('Failed to load profile data.', true);
        }
    }

    let picker = null;

    openEmojiPickerButton.addEventListener('click', () => {
        if (!picker) {
            if (window.EmojiMart && window.EmojiMart.Picker) { // Check for Picker after init()
                picker = new window.EmojiMart.Picker({
                    // No 'data' or 'set' needed here if init() handles it, but providing them as a fallback
                    // if init() just sets defaults and Picker still needs them.
                    // Keep 'onEmojiSelect' and 'theme' here.
                    onEmojiSelect: (emoji) => {
                        selectedEmoji = emoji.native;
                        profileEmojiAvatar.textContent = selectedEmoji;
                        emojiPickerContainer.style.display = 'none';
                        displayMessage('Emoji selected!', false, promosMessage);
                    },
                    theme: 'light',
                    // The 'set' is implicitly handled by init() if passed there,
                    // but providing it here too doesn't hurt and acts as a fallback.
                    set: 'google',
                });
                emojiPickerContainer.appendChild(picker);
                console.log('EmojiMart Picker initialized and appended.');
            } else {
                displayMessage('Emoji picker library or data not loaded. Check console.', true, promosMessage);
                console.error('window.EmojiMart:', window.EmojiMart);
                console.error('window.EmojiMart.Picker:', window.EmojiMart ? window.EmojiMart.Picker : 'Not available');
                return;
            }
        }
        emojiPickerContainer.style.display = emojiPickerContainer.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', (event) => {
        if (picker && emojiPickerContainer.style.display === 'block' &&
            !openEmojiPickerButton.contains(event.target) && !emojiPickerContainer.contains(event.target)) {
            emojiPickerContainer.style.display = 'none';
        }
    });


    profileUpdateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        saveProfileButton.disabled = true;
        displayMessage('Saving changes...', false);

        const newDisplayName = displayNameInput.value;
        const newPhoneNumber = phoneNumberInput.value;
        const emojiToSave = selectedEmoji;

        try {
            const { error: authUpdateError } = await updateAuthUserProfile({
                data: {
                    display_name: newDisplayName,
                    avatar_emoji: emojiToSave
                },
                phone: newPhoneNumber
            });

            if (authUpdateError) {
                throw authUpdateError;
            }

            profileEmojiAvatar.textContent = emojiToSave || '👤';

            displayMessage('Profile updated successfully!', false);
        } catch (error) {
            console.error('Profile update failed:', error.message);
            displayMessage(`Profile update failed: ${error.message}`, true);
        } finally {
            saveProfileButton.disabled = false;
        }
    });


    async function loadUserPromotions(userId) {
        try {
            const { data: userPromos, error: promosError } = await supabase
                .from('promo_items')
                .select('country, promo_title, promo_type, channel_tags, icon, owner, user_id, status, id, promo_start_date, promo_end_date')
                .eq('user_id', userId)
                .order('promo_start_date', { descending: false });

            if (promosError) {
                console.error('Error fetching user promotions:', promosError.message);
                promosMessage.textContent = 'Error loading your promotions.';
                promosMessage.style.color = 'red';
                return;
            }

            userPromosTableBody.innerHTML = '';
            if (userPromos.length === 0) {
                noPromosMessage.style.display = 'block';
                return;
            } else {
                noPromosMessage.style.display = 'none';
            }

            userPromos.forEach(promo => {
                const row = userPromosTableBody.insertRow();
                row.insertCell(0).textContent = promo.country || 'N/A';
                row.insertCell(1).textContent = promo.promo_title || 'N/A';
                row.insertCell(2).textContent = promo.promo_type || 'N/A';
                row.insertCell(3).textContent = (promo.channel_tags && promo.channel_tags.join(', ')) || 'N/A';
                row.insertCell(4).textContent = promo.icon || '';
                row.insertCell(5).textContent = promo.owner || 'N/A';
                row.insertCell(6).textContent = promo.promo_start_date ? new Date(promo.promo_start_date).toLocaleDateString() : 'N/A';
                row.insertCell(7).textContent = promo.promo_end_date ? new Date(promo.promo_end_date).toLocaleDateString() : 'N/A'
                row.insertCell(8).textContent = promo.user_id === userId ? 'Me' : 'Other';
                row.insertCell(9).textContent = promo.status || 'N/A';

                const actionCell = row.insertCell(8);
                const editLink = document.createElement('a');
                editLink.href = `promo-detail.html?id=${promo.id}`;
                editLink.textContent = 'Edit';
                editLink.classList.add('action-link');
                actionCell.appendChild(editLink);
            });

        } catch (error) {
            console.error('Failed to load user promotions:', error);
            promosMessage.textContent = 'Failed to load your promotions.';
            promosMessage.style.color = 'red';
        }
    }


    // Handle Logout
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            const { error } = await signOut();
            if (!error) {
                window.location.href = 'login.html';
            } else {
                console.error('Logout failed:', error.message);
            }
        });
    }

    checkUserSession();
});