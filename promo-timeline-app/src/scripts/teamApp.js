// scripts/teamApp.js (Corrected and Final Version)
import { supabase, signOut, getSession, getUser } from './supabaseAuth.js';
import {
    fetchAllUsers,
    fetchSubordinates,
    updateFullUserProfile,
    fetchCountries,
    fetchChannels,
    fetchPeers,
    fetchManagers
} from './supabaseClient.js';


function createUserCard(user, isClickable = false) {
    const avatar = user.avatar_emoji || '👤';
    const cardClass = isClickable ? 'user-card' : 'display-only-card'; // Use a different class for non-clickable cards
    const dataIdAttribute = isClickable ? `data-user-id="${user.id}"` : '';

    return `
        <div class="${cardClass}" ${dataIdAttribute}>
            <span class="avatar-emoji">${avatar}</span>
            <div class="user-card-details">
                <p>${user.first_name} ${user.last_name}</p>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', async () => {
    // --- Page Elements ---
    const subordinatesListDiv = document.getElementById('subordinates-list');
    const detailPanel = document.getElementById('detail-panel');
    const detailPanelContent = document.getElementById('detail-panel-content');
    const detailForm = document.getElementById('detail-form');
    const detailFormActions = document.getElementById('detail-form-actions');
    const detailUserIdInput = document.getElementById('detailUserId');
    const managementMessage = document.getElementById('managementMessage');
    const logoutButton = document.getElementById('logoutButton');
    const peersListDiv = document.getElementById('peers-list');
    const managersListDiv = document.getElementById('managers-list');



    // --- Authentication ---
    const session = await getSession();
    if (!session) { window.location.href = 'login.html'; return; }
    const currentUser = await getUser();
    if (!currentUser) { window.location.href = 'login.html'; return; }

    let allUsers = [];
    let allCountries = [];
    let allChannels = [];

    // --- RENDER FUNCTIONS ---
    function renderSubordinates(subordinates) {
        if (!subordinates || subordinates.length === 0) {
            subordinatesListDiv.innerHTML = `<p>You have no subordinates in your chain of command.</p>`;
            return;
        }
        subordinatesListDiv.innerHTML = subordinates.map(sub => createUserCard(sub, true)).join('');
    }

    function renderPeers(peers) {
        if (!peers || peers.length === 0) {
            peersListDiv.innerHTML = `<p>You have no peers to display.</p>`;
            return;
        }
        peersListDiv.innerHTML = peers.map(peer => createUserCard(peer, false)).join('');
    }

    function renderManagers(managers) {
        if (!managers || managers.length === 0) {
            managersListDiv.innerHTML = `<p>You have no managers in your chain of command.</p>`;
            return;
        }
        managersListDiv.innerHTML = managers.map(manager => createUserCard(manager, false)).join('');
    }

    // --- DETAIL FORM LOGIC ---
    function showUserDetailsInForm(userId) {
        const user = allUsers.find(u => u.id === userId);
        if (!user) return;

        detailUserIdInput.value = user.id;

        // Dynamically create the entire form content
        detailPanelContent.innerHTML = `
            <div class="profile-avatar-upload">
                <span id="profileEmojiAvatar" class="avatar-emoji">${user.avatar_emoji || '👤'}</span>
                <h2>${user.first_name} ${user.last_name}</h2>
            </div>
            <div class="form-grid-container">
                <div class="input-group"><label for="detailDisplayName">Display Name</label><input type="text" id="detailDisplayName" value="${user.display_name || ''}"></div>
                <div class="input-group"><label for="detailJobTitle">Job Title</label><input type="text" id="detailJobTitle" value="${user.job_title || ''}"></div>
                <div class="input-group"><label for="detailFirstName">First Name</label><input type="text" id="detailFirstName" value="${user.first_name || ''}"></div>
                <div class="input-group"><label for="detailLastName">Last Name</label><input type="text" id="detailLastName" value="${user.last_name || ''}"></div>
                <div class="input-group"><label for="detailEmployeeId">Employee ID</label><input type="text" id="detailEmployeeId" value="${user.employee_id || ''}"></div>
                <div class="input-group"><label for="detailAppRole">Application Role</label><select id="detailAppRole"><option value="user">User</option><option value="admin">Admin</option></select></div>
                <div class="input-group"><label for="detailCountry">Country</label><select id="detailCountry"></select></div>
                <div class="input-group"><label for="detailChannel">Channel</label><select id="detailChannel"></select></div>
                <div class="input-group full-width"><label for="detailManager">Manager</label><select id="detailManager"></select></div>
            </div>
        `;

        // Correctly populate all dropdowns after the HTML is created
        document.getElementById('detailAppRole').value = user.app_role || 'user';

        const countrySelect = document.getElementById('detailCountry');
        countrySelect.innerHTML = allCountries.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        countrySelect.value = user.country_id || '';

        const channelSelect = document.getElementById('detailChannel');
        channelSelect.innerHTML = allChannels.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        channelSelect.value = user.channel_id || '';

        const managerSelect = document.getElementById('detailManager');
        managerSelect.innerHTML = allUsers.map(u => `<option value="${u.id}">${u.first_name} ${u.last_name}</option>`).join('');
        managerSelect.insertAdjacentHTML('afterbegin', '<option value="">(Unassigned)</option>');
        managerSelect.value = user.manager_id || '';

        detailFormActions.innerHTML = `<button type="submit" class="updateButton" style="width: 100%; max-width:300px; margin-top: 20px;">Save All Changes</button>`;
        detailPanel.classList.remove('is-hidden');
    }

    // --- EVENT HANDLERS ---
    document.querySelector('.login-page-wrapper').addEventListener('click', (event) => {
        const userCard = event.target.closest('.user-card');
        if (userCard) {
            document.querySelectorAll('.user-card.is-active').forEach(card => card.classList.remove('is-active'));
            userCard.classList.add('is-active');
            showUserDetailsInForm(userCard.dataset.userId);
        }
    });

    detailForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = detailForm.querySelector('button[type="submit"]');
        button.textContent = 'Saving...';
        button.disabled = true;

        const userIdToUpdate = detailUserIdInput.value;

        // Collect data from all form fields, ensuring IDs are sent for country and channel
        const updates = {
            first_name: document.getElementById('detailFirstName').value,
            last_name: document.getElementById('detailLastName').value,
            country_id: parseInt(document.getElementById('detailCountry').value), // Use country_id
            channel_id: parseInt(document.getElementById('detailChannel').value), // Use channel_id
            manager_id: document.getElementById('detailManager').value || null,
            display_name: document.getElementById('detailDisplayName').value,
            avatar_emoji: allUsers.find(u => u.id === userIdToUpdate)?.avatar_emoji || '👤', // Use existing emoji
            employee_id: document.getElementById('detailEmployeeId').value,
            job_title: document.getElementById('detailJobTitle').value,
            app_role: document.getElementById('detailAppRole').value
        };

        const { error } = await updateFullUserProfile(userIdToUpdate, updates);

        if (error) {
            managementMessage.textContent = `Error updating profile: ${error.message}`;
            managementMessage.style.color = 'red';
        } else {
            managementMessage.textContent = 'Profile updated successfully!';
            managementMessage.style.color = 'green';
            setTimeout(() => { managementMessage.textContent = '' }, 3000);
            loadDashboard(); // Reload data to reflect changes
        }
        button.textContent = 'Save All Changes';
        button.disabled = false;
    });

    // --- MAIN LOAD FUNCTION ---
    async function loadDashboard() {
        // Fetch everything in parallel, including countries and channels
        const [allUsersRes, subordinatesRes, managersRes, countriesRes, channelsRes] = await Promise.all([
            fetchAllUsers(),
            fetchSubordinates(currentUser.id),
            fetchManagers(currentUser.id),
            fetchCountries(),
            fetchChannels(),
        ]);

        // Assign fetched data to the cache variables
        allUsers = allUsersRes.data || [];
        allCountries = countriesRes.data || [];
        allChannels = channelsRes.data || [];

        // CRITICAL FIX: Find the current user's profile to get their manager_id
        const currentUserProfile = allUsers.find(u => u.id === currentUser.id);

        let peers = [];
        // Only fetch peers if we successfully found the user's profile and they have a manager
        if (currentUserProfile && currentUserProfile.manager_id) {
            const peersRes = await fetchPeers(currentUser.id, currentUserProfile.manager_id);
            peers = peersRes.data || [];
        }

        // Render all the sections with the correct data
        renderSubordinates(subordinatesRes.data);
        renderManagers(managersRes.data);
        renderPeers(peers);
    }

    // --- INITIALIZATION ---
    logoutButton.addEventListener('click', () => { signOut(); window.location.href = 'login.html'; });
    loadDashboard();
});