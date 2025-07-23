import { supabase, signOut, getSession, getUser, updateUserProfile as updateAuthUserProfile } from './supabaseAuth.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Page Elements ---
    const profileEmojiAvatar = document.getElementById('profileEmojiAvatar');
    const openEmojiPickerButton = document.getElementById('openEmojiPickerButton');
    const emojiPickerContainer = document.getElementById('emojiPickerContainer');
    const displayNameInput = document.getElementById('displayName');

    const displayRoleInput = document.getElementById('displayRole');
    const displayTeamInput = document.getElementById('displayTeam');

    const profileEmailInput = document.getElementById('profileEmail');
    const profileCountryInput = document.getElementById('profileCountry');
    const profileChannelInput = document.getElementById('profileChannel');
    const saveProfileButton = document.getElementById('saveProfileButton');
    const profileMessage = document.getElementById('profileMessage');
    const logoutButton = document.getElementById('logoutButton');
    const userPromosTableBody = document.querySelector('#userPromosTable tbody');
    const noPromosMessage = document.getElementById('noPromosMessage');
    const promosMessage = document.getElementById('promosMessage');

    let picker;
    let selectedEmoji = '👤';
    let allUserPromos = []; // Cache for all fetched promotions

    // --- Authentication ---
    const session = await getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    const currentUser = await getUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // --- Main Logic ---

    // Renders the table with a given set of promotions
    function renderPromosTable(promos) {
        userPromosTableBody.innerHTML = '';
        if (!promos || promos.length === 0) {
            // If there are active filters, show a different message
            const hasActiveFilters = document.querySelectorAll('.column-filter').some(input => input.value.trim() !== '');
            noPromosMessage.textContent = hasActiveFilters ? 'No promotions match your current filter.' : "You haven't created any promotions yet.";
            noPromosMessage.style.display = 'block';
            return;
        }

        noPromosMessage.style.display = 'none';
        promos.forEach(promo => {
            const row = userPromosTableBody.insertRow();
            row.insertCell(0).textContent = promo.country || 'N/A';
            row.insertCell(1).textContent = promo.promo_title || 'N/A';
            row.insertCell(2).textContent = promo.promo_type || 'N/A';
            row.insertCell(3).textContent = (promo.channel_tags || []).join(', ');
            row.insertCell(4).textContent = promo.icon || '';
            row.insertCell(5).textContent = promo.author || 'N/A';
            row.insertCell(6).textContent = promo.promo_start_date ? new Date(promo.promo_start_date).toLocaleDateString() : 'N/A';
            row.insertCell(7).textContent = promo.promo_end_date ? new Date(promo.promo_end_date).toLocaleDateString() : 'N/A';

            const actionCell = row.insertCell(8);
            const editLink = document.createElement('a');
            editLink.href = `promo-detail.html?id=${promo.id}`;
            editLink.textContent = 'Edit';
            editLink.classList.add('action-link');
            actionCell.appendChild(editLink);

            row.insertCell(9).textContent = promo.owner || 'N/A';
            row.insertCell(10).textContent = promo.status || 'N/A';
        });
    }

    // Applies column filters and re-renders the table
    function applyTableFiltersAndRender() {
        const filterInputs = document.querySelectorAll('.column-filter');
        const filterValues = {};
        filterInputs.forEach(input => {
            const columnIndex = input.dataset.columnIndex;
            if (input.value.trim() !== '') {
                filterValues[columnIndex] = input.value.trim().toLowerCase();
            }
        });

        const filteredPromos = allUserPromos.filter(promo => {
            return Object.keys(filterValues).every(columnIndex => {
                let cellValue = '';
                // Map columnIndex to the corresponding promo property
                switch (parseInt(columnIndex)) {
                    case 0: cellValue = promo.country || ''; break;
                    case 1: cellValue = promo.promo_title || ''; break;
                    case 2: cellValue = promo.promo_type || ''; break;
                    case 3: cellValue = (promo.channel_tags || []).join(', '); break;
                    case 4: cellValue = promo.icon || ''; break;
                    case 5: cellValue = promo.author || ''; break;
                    case 6: cellValue = promo.promo_start_date ? new Date(promo.promo_start_date).toLocaleDateString() : ''; break;
                    case 7: cellValue = promo.promo_end_date ? new Date(promo.promo_end_date).toLocaleDateString() : ''; break;
                    case 9: cellValue = promo.owner || ''; break;
                    case 10: cellValue = promo.status || ''; break;
                }
                return cellValue.toLowerCase().includes(filterValues[columnIndex]);
            });
        });

        renderPromosTable(filteredPromos);
    }

    // Fetches all promotions for the user from the database
    async function loadUserPromotions(userId) {
        try {
            const { data: userPromos, error: promosError } = await supabase
                .from('promo_items')
                .select('id, country, promo_title, promo_type, channel_tags, icon, author, owner, status, promo_start_date, promo_end_date')
                .eq('user_id', userId)
                .order('promo_start_date', { descending: false });

            if (promosError) {
                promosMessage.textContent = 'Error loading your promotions.';
                promosMessage.style.color = 'red';
                return;
            }

            allUserPromos = userPromos || []; // Cache the full list
            applyTableFiltersAndRender(); // Render the table with the full list initially

        } catch (error) {
            promosMessage.textContent = 'Failed to load your promotions.';
            promosMessage.style.color = 'red';
        }
    }

    // Loads the user's profile data into the form
    async function loadUserProfileData(userId) {
        profileEmailInput.value = currentUser.email || '';
        displayNameInput.value = currentUser.user_metadata.display_name || '';
        selectedEmoji = currentUser.user_metadata.avatar_emoji || '👤';
        profileEmojiAvatar.textContent = selectedEmoji;

        const { data, error } = await supabase
            .from('user_profiles')
            .select(`
            country,
            channel,
            team_members (
                role,
                teams (
                    name,
                    created_at
                )
            )
        `)
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error loading user profile:', error);
            return;
        }

        if (data) {
            // Set profile data
            profileCountryInput.value = data.country || '';
            profileChannelInput.value = data.channel || '';

            // The 'team_members' property is now an array,
            // as a user can be on multiple teams.
            console.log(data.team_members);

            // Example: Display the first team the user belongs to
            if (data.team_members && data.team_members.length > 0) {
                const firstTeamMembership = data.team_members[0];
                displayRoleInput.value = firstTeamMembership.role || '';
                // Note the nested structure to get the team name
                displayTeamInput.value = firstTeamMembership.teams.name || '';
            } else {
                // Handle case where user is not on any team
                displayRoleInput.value = 'No role';
                displayTeamInput.value = 'No team';
            }
        }
    }

    // --- Event Listeners ---

    openEmojiPickerButton.addEventListener('click', () => {
        // Toggle the visibility of the emoji picker container
        const isVisible = emojiPickerContainer.style.display !== 'none';
        emojiPickerContainer.style.display = isVisible ? 'none' : 'block';

        // Initialize the picker only once to avoid re-creating it on every click
        if (!picker) {
            picker = new EmojiMart.Picker({
                data: async () => {
                    const response = await fetch(
                        'https://cdn.jsdelivr.net/npm/@emoji-mart/data'
                    );
                    return response.json();
                },
                parent: emojiPickerContainer, // Render the picker inside this container
                onEmojiSelect: (emoji) => {
                    // When an emoji is selected, update the UI and hide the picker
                    selectedEmoji = emoji.native;
                    profileEmojiAvatar.textContent = selectedEmoji;
                    emojiPickerContainer.style.display = 'none';
                }
            });
        }
    });

    logoutButton.addEventListener('click', async () => {
        await signOut();
        window.location.href = 'login.html';
    });

    saveProfileButton.addEventListener('click', async (event) => {
        event.preventDefault();
        saveProfileButton.disabled = true;
        profileMessage.textContent = 'Saving...';

        const { error } = await updateAuthUserProfile({
            data: {
                display_name: displayNameInput.value,
                avatar_emoji: selectedEmoji
            },
        });

        if (error) {
            profileMessage.textContent = `Update failed: ${error.message}`;
            profileMessage.style.color = 'red';
        } else {
            profileMessage.textContent = 'Profile updated successfully!';
            profileMessage.style.color = 'green';
        }
        saveProfileButton.disabled = false;
    });

    // Setup for in-table filtering
    document.querySelectorAll('.filter-icon').forEach(icon => {
        icon.addEventListener('click', () => {
            const filterRow = document.querySelector('.filter-row');
            if (filterRow) {
                const isVisible = filterRow.style.display !== 'none';
                filterRow.style.display = isVisible ? 'none' : 'table-row';
            }
        });
    });

    document.querySelectorAll('.column-filter').forEach(input => {
        input.addEventListener('keyup', applyTableFiltersAndRender);
    });

    // --- Initialization ---
    await loadUserProfileData(currentUser.id);
    await loadUserPromotions(currentUser.id);
});
