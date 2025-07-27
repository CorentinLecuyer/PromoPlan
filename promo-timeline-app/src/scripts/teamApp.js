// scripts/teamApp.js (Corrected and Final Version)
import { supabase, signOut, getUser } from './supabaseAuth.js';
import {
    fetchAllUsers,
    fetchSubordinates,
    updateFullUserProfile,
    fetchCountries,
    fetchChannels,
    fetchTeams,
    fetchPeers,
    fetchManagers,
    updateUserTeamMembership
} from './supabaseClient.js';


function createUserCard(user, isClickable = false) {

    const avatar = user.avatar_emoji || '👤';
    const cardClass = isClickable ? 'user-card' : 'display-only-card';
    const dataIdAttribute = isClickable ? `data-user-id="${user.id}"` : '';
    const teamInfo = user.team_members;
    const teamName = teamInfo ? teamInfo.teams.name : 'No Team';
    const channelInfo = user.channel;
    const channelName = channelInfo ? channelInfo.name : 'No Team';

    return `
        <div class="${cardClass}" ${dataIdAttribute}>
            <span class="avatar-emoji">${avatar}</span>

            <div style="display:flex;text-align:start;">
                <div class="user-card-details">
                    <p class="user-card-name" style="text-transform: uppercase;text-decoration: underline; margin-bottom:6px">${user.first_name} </p>
                    <p class="user-card-name">${channelName} </p>
                    <p class="user-card-team">${teamName}</p>
                    <p class="user-card-role">${user.job_title}</p>
                </div>

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
    const currentUser = await getUser();
    if (!currentUser) { window.location.href = 'login.html'; return; }

    let allUsers = [];
    let allCountries = [];
    let allChannels = [];
    let currentUserProfile = null;



    // --- RENDER FUNCTIONS ---
    function renderSubordinates(subordinates) {
        if (!subordinates || subordinates.length === 0) {
            subordinatesListDiv.innerHTML = `<p>You have no subordinates in your chain of command.</p>`;
        } else {
            subordinatesListDiv.innerHTML = subordinates.map(sub => createUserCard(sub, true)).join('');
        }
    }

    function renderPeers(peers) {
        if (!peers || peers.length === 0) {
            peersListDiv.innerHTML = `<p>You have no peers to display.</p>`;
        } else {
            peersListDiv.innerHTML = peers.map(peer => createUserCard(peer, false)).join('');
        }
    }

    function renderManagers(managers) {
        if (!managers || managers.length === 0) {
            managersListDiv.innerHTML = `<p>You have no managers in your chain of command.</p>`;
        } else {
            managersListDiv.innerHTML = managers.map(manager => createUserCard(manager, false)).join('');
        }
    }

    // --- DETAIL FORM LOGIC ---
    async function showUserDetailsInForm(userId) {
        const user = allUsers.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('detailUserId').value = user.id;

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
                <div class="input-group"><label for="detailCountry">Country</label><select id="detailCountry"></select></div>
                <div class="input-group"><label for="detailChannel">Channel</label><select id="detailChannel"></select></div>
                <div class="input-group"><label for="detailTeam">Team</label><select id="detailTeam"></select></div>
                <div class="input-group"><label for="detailTeamRole">Team Role</label>
                    <select id="detailTeamRole">
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="input-group checkbox-group" id="catalogManagementPermissionGroup" style="display: none;">
                    <input type="checkbox" id="detailCanManageCatalog">
                    <label for="detailCanManageCatalog">Can Manage Catalog (Brands/Products)</label>
                </div>
                <div class="input-group full-width"><label for="detailManager">Manager</label><select id="detailManager"></select></div>
            </div>
        `;

        // Populate and set static dropdowns
        const countrySelect = document.getElementById('detailCountry');
        const managerSelect = document.getElementById('detailManager');
        const channelSelect = document.getElementById('detailChannel');
        const teamSelect = document.getElementById('detailTeam');
        const teamRoleSelect = document.getElementById('detailTeamRole')



        countrySelect.innerHTML = allCountries.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        managerSelect.innerHTML = allUsers.map(u => `<option value="${u.id}">${u.first_name} ${u.last_name}</option>`).join('');
        managerSelect.insertAdjacentHTML('afterbegin', '<option value="">(Unassigned)</option>');
        countrySelect.value = user.country_id || '';
        managerSelect.value = user.manager_id || '';
        channelSelect.innerHTML = allChannels.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        channelSelect.value = user.channel_id || '';

        // 1. Get the user's current team and role from the data we already fetched

        const membership = user.team_members; // FIX: It's now a direct object or null
        const currentTeamId = membership ? membership.teams?.id : null;
        const currentTeamRole = membership ? membership.role : 'member';

        const updateTeamDropdown = async () => {
            const selectedChannelId = channelSelect.value;
            if (selectedChannelId) {
                teamSelect.disabled = false;
                const { data: teams } = await fetchTeams(selectedChannelId);
                teamSelect.innerHTML = '<option value="">Select a team</option>';
                if (teams && teams.length > 0) {
                    teams.forEach(t => teamSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`);
                }
                // AFTER populating, set the value
                teamSelect.value = currentTeamId;
            } else {
                teamSelect.innerHTML = '<option value="">Select a channel first</option>';
                teamSelect.disabled = true;
            }
        };

        const currentUserProfile = allUsers.find(u => u.id === currentUser.id);
        if (currentUserProfile && currentUserProfile.app_role === 'admin') {
            const permissionGroup = document.getElementById('catalogManagementPermissionGroup');
            const permissionCheckbox = document.getElementById('detailCanManageCatalog');
            permissionGroup.style = 'display: flex;flex-direction: column-reverse;align-items: center;flex-wrap: wrap;';
            permissionCheckbox.checked = user.can_manage_catalog === true;
        }

        // 3. Attach the event listener for future clicks
        channelSelect.addEventListener('change', updateTeamDropdown);
        await updateTeamDropdown();

        // 5. Set the role dropdown's value
        teamSelect.value = currentTeamId;
        teamRoleSelect.value = currentTeamRole;

        document.getElementById('detail-form-actions').innerHTML = `<button type="submit" class="updateButton">Save All Changes</button>`;
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
        const button = event.target.querySelector('button');
        button.textContent = 'Saving...';
        button.disabled = true;

        const currentUserProfile = allUsers.find(u => u.id === currentUser.id);
        const userIdToUpdate = detailUserIdInput.value;
        const teamId = document.getElementById('detailTeam').value;
        const teamRole = document.getElementById('detailTeamRole').value;

        // First, update the team membership
        const { error: teamError } = await updateUserTeamMembership(userIdToUpdate, teamId, teamRole);

        if (teamError) {
            managementMessage.textContent = `Error updating team: ${teamError.message}`;
            managementMessage.style.color = 'red';
            button.textContent = 'Save All Changes';
            button.disabled = false;
            return;
        }

        const userToUpdate = allUsers.find(u => u.id === userIdToUpdate);

        // Then, update the rest of the user's profile info
        const profileUpdates = {
            first_name: document.getElementById('detailFirstName').value,
            last_name: document.getElementById('detailLastName').value,
            country_id: parseInt(document.getElementById('detailCountry').value),
            channel_id: parseInt(document.getElementById('detailChannel').value),
            manager_id: document.getElementById('detailManager').value || null,
            display_name: document.getElementById('detailDisplayName').value,
            employee_id: document.getElementById('detailEmployeeId').value,
            job_title: document.getElementById('detailJobTitle').value,
            app_role: userToUpdate.app_role,
            avatar_emoji: userToUpdate.avatar_emoji
            
 

      };

        console.log("--- Starting Profile Update ---");
        console.log("User to update:", userToUpdate);
        console.log("Current admin profile:", currentUserProfile);
        
        let canManageCatalogValue = userToUpdate.can_manage_catalog;
        console.log("Original can_manage_catalog value:", canManageCatalogValue);

        if (currentUserProfile && currentUserProfile.app_role === 'admin') {
            const permissionCheckbox = document.getElementById('detailCanManageCatalog');
            console.log("Current user is an admin.");
            if (permissionCheckbox) {
                canManageCatalogValue = permissionCheckbox.checked;
                console.log("Checkbox found. New value is:", canManageCatalogValue);
            } else {
                console.warn("Permission checkbox element was not found in the DOM.");
            }
        } else {
             console.log("Current user is NOT an admin. Using original value.");
        }
        
        profileUpdates.can_manage_catalog = canManageCatalogValue;
        console.log("Final payload to be sent:", profileUpdates);


        const { error: profileError } = await updateFullUserProfile(userIdToUpdate, profileUpdates);

        if (profileError) {
            managementMessage.textContent = `Error updating profile: ${profileError.message}`;
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
        const [allUsersRes, subordinatesRes, managersRes, countriesRes, channelsRes] = await Promise.all([
            fetchAllUsers(),
            fetchSubordinates(currentUser.id),
            fetchManagers(currentUser.id),
            fetchCountries(),
            fetchChannels(),
        ]);

        allUsers = allUsersRes.data || [];
        allCountries = countriesRes.data || [];
        allChannels = channelsRes.data || [];

        const currentUserProfile = allUsers.find(u => u.id === currentUser.id);
        let peers = [];
        // Only fetch peers if we successfully found the user's profile and they have a manager
        if (currentUserProfile && currentUserProfile.manager_id) {
            // Pass the allUsers cache to the function for efficiency
            const peersRes = await fetchPeers(currentUser.id, currentUserProfile.manager_id, allUsers);
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