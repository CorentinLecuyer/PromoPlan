// scripts/teamApp.js (Refactored for Detail Form)

import { supabase, signOut, getSession, getUser } from './supabaseAuth.js';
import { 
    fetchAllUsers, 
    fetchSubordinates, 
    fetchManagers,
    fetchPeers,
    updateUserSingleField as updateUserProfileFields // Renamed for clarity
} from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Page Elements ---
    const managersListDiv = document.getElementById('managers-list');
    const subordinatesListDiv = document.getElementById('subordinates-list');
    const peersListDiv = document.getElementById('peers-list');
    const detailPanel = document.getElementById('detail-panel');
    const detailPanelContent = document.getElementById('detail-panel-content');
    const detailForm = document.getElementById('detail-form');
    const detailFormActions = document.getElementById('detail-form-actions');
    const detailUserIdInput = document.getElementById('detailUserId');
    const managementMessage = document.getElementById('managementMessage');
    const logoutButton = document.getElementById('logoutButton');

    // --- Authentication ---
    const session = await getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    const currentUser = await getUser();

    let allUsers = []; // Cache for all users

    // --- RENDER FUNCTIONS ---
    
    // Renders simple, non-interactive lists (Managers, Peers)
    function renderSimpleList(container, users, message) {
        if (!users || users.length === 0) {
            container.innerHTML = `<p>${message}</p>`;
            return;
        }
        container.innerHTML = users.map(user => `
            <div class="user-card" data-user-id="${user.id}">
                <span class="avatar-emoji">${user.avatar_emoji || '👤'}</span>
                <div class="user-card-details">
                    <p>${user.first_name} ${user.last_name}</p>
                </div>
            </div>
        `).join('');
    }

    // Renders the list of subordinates (for selection only)
    function renderSubordinates(subordinates) {
        if (!subordinates || subordinates.length === 0) {
            subordinatesListDiv.innerHTML = `<p>You have no subordinates in your chain of command.</p>`;
            return;
        }
        subordinatesListDiv.innerHTML = subordinates.map(sub => `
            <div class="user-card" data-user-id="${sub.id}">
                <span class="avatar-emoji">${sub.avatar_emoji || '👤'}</span>
                <div class="user-card-details">
                    <p>${sub.first_name} ${sub.last_name}</p>
                </div>
            </div>
        `).join('');
    }

    // --- NEW: Detail Form Logic ---

    // Populates the detail form with the selected user's data
    function showUserDetailsInForm(userId) {
        const user = allUsers.find(u => u.id === userId);
        if (!user) return;

        // Store the user ID in the hidden input
        detailUserIdInput.value = user.id;

        // Generate the form fields HTML
        detailPanelContent.innerHTML = `
            <h2><span class="avatar-emoji">${user.avatar_emoji || '👤'}</span>Editing User</h2>
            <div class="form-grid-container">
                <div class="input-group">
                    <label for="detailFirstName">First Name</label>
                    <input type="text" id="detailFirstName" value="${user.first_name || ''}">
                </div>
                <div class="input-group">
                    <label for="detailLastName">Last Name</label>
                    <input type="text" id="detailLastName" value="${user.last_name || ''}">
                </div>
                <div class="input-group">
                    <label for="detailCountry">Country</label>
                    <input type="text" id="detailCountry" value="${user.country || ''}">
                </div>
                <div class="input-group">
                    <label for="detailChannel">Channel</label>
                    <input type="text" id="detailChannel" value="${user.channel || ''}">
                </div>
                <div class="input-group full-width">
                    <label for="detailManager">Manager</label>
                    <select id="detailManager">
                        <option value="">(Unassigned)</option>
                        ${allUsers.map(u => `<option value="${u.id}" ${u.id === user.manager_id ? 'selected' : ''}>${u.first_name} ${u.last_name}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
        
        // Add the save button to the actions container
        detailFormActions.innerHTML = `<button type="submit" class="updateButton" style="width: 100%; margin-top: 20px;">Save Changes</button>`;

        // Make the panel visible
        detailPanel.classList.remove('is-hidden');
    }

    // --- EVENT HANDLERS ---
    
    // Listen for clicks on the main container
    document.querySelector('.login-page-wrapper').addEventListener('click', (event) => {
        const userCard = event.target.closest('.user-card');
        if (userCard) {
            document.querySelectorAll('.user-card.is-active').forEach(card => card.classList.remove('is-active'));
            userCard.classList.add('is-active');
            const userId = userCard.dataset.userId;
            showUserDetailsInForm(userId);
        }
    });

    // Listen for the form submission
    detailForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission
        
        const button = detailForm.querySelector('button[type="submit"]');
        button.textContent = 'Saving...';
        button.disabled = true;

        const userIdToUpdate = detailUserIdInput.value;

        // Collect all the updated data from the form
        const updates = {
            first_name: document.getElementById('detailFirstName').value,
            last_name: document.getElementById('detailLastName').value,
            country: document.getElementById('detailCountry').value,
            channel: document.getElementById('detailChannel').value,
            manager_id: document.getElementById('detailManager').value || null,
        };

        const { error } = await updateUserProfileFields(userIdToUpdate, updates);

        if (error) {
            managementMessage.textContent = `Error updating profile: ${error.message}`;
            managementMessage.style.color = 'red';
            button.textContent = 'Save Changes';
            button.disabled = false;
        } else {
            managementMessage.textContent = 'Profile updated successfully!';
            managementMessage.style.color = 'green';
            setTimeout(() => { managementMessage.textContent = '' }, 3000);
            
            button.textContent = 'Save Changes';
            button.disabled = false;
            
            // Reload all data to reflect the changes everywhere on the page
            loadDashboard();
        }
    });

    // --- MAIN LOAD FUNCTION ---

    async function loadDashboard() {
        const { data: userProfile } = await supabase.from('user_profiles').select('id, manager_id').eq('id', currentUser.id).single();
        if (!userProfile) return;

        const [
            allUsersRes,
            subordinatesRes, 
            managersRes,
            peersRes
        ] = await Promise.all([
            fetchAllUsers(),
            fetchSubordinates(currentUser.id),
            fetchManagers(currentUser.id),
            fetchPeers(currentUser.id, userProfile.manager_id),
        ]);

        allUsers = allUsersRes.data || [];

        renderSimpleList(managersListDiv, managersRes.data, 'You have no managers.');
        renderSimpleList(peersListDiv, peersRes.data, 'You have no peers.');
        renderSubordinates(subordinatesRes.data);
    }

    // --- INITIALIZATION ---
    logoutButton.addEventListener('click', async () => {
        await signOut();
        window.location.href = 'login.html';
    });

    loadDashboard();
});