// In scripts/teamManagement.js

import { supabase } from './supabaseAuth.js';
// We now need fetchTeams with its new functionality
import { fetchCountries, fetchChannels, fetchTeams } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const createForm = document.getElementById('createSubordinateForm');
    const countrySelect = document.getElementById('newCountry');
    const channelSelect = document.getElementById('newChannel');
    const teamSelect = document.getElementById('newTeam');
    const createMessage = document.getElementById('createMessage');

    // --- Step 1: Initial Population & Disabling Team Select ---
    async function populateInitialDropdowns() {
        const [{ data: countries }, { data: channels }] = await Promise.all([
            fetchCountries(),
            fetchChannels()
        ]);

        if (countries) {
            countrySelect.innerHTML = '<option value="">Select a country</option>';
            countries.forEach(c => countrySelect.innerHTML += `<option value="${c.id}">${c.name}</option>`);
        }
        if (channels) {
            channelSelect.innerHTML = '<option value="">Select a channel</option>';
            channels.forEach(ch => channelSelect.innerHTML += `<option value="${ch.id}">${ch.name}</option>`);
        }
        
        // Initially, the team dropdown is disabled.
        teamSelect.innerHTML = '<option value="">Select a channel first</option>';
        teamSelect.disabled = true;
    }

    // --- Step 2: Event Listener for Channel Selection ---
    channelSelect.addEventListener('change', async () => {
        const selectedChannelId = channelSelect.value;

        // If a valid channel is selected...
        if (selectedChannelId) {
            teamSelect.disabled = false;
            teamSelect.innerHTML = '<option value="">Loading teams...</option>';
            
            // Fetch only the teams for the selected channel
            const { data: teams } = await fetchTeams(selectedChannelId);
            
            teamSelect.innerHTML = '<option value="">Select a team</option>';
            if (teams && teams.length > 0) {
                teams.forEach(t => {
                    teamSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
                });
            } else {
                teamSelect.innerHTML = '<option value="">No teams found for this channel</option>';
            }
        } else {
            // If no channel is selected, disable the team dropdown
            teamSelect.innerHTML = '<option value="">Select a channel first</option>';
            teamSelect.disabled = true;
        }
    });
    
    // --- Step 3: Form Submission (your existing code is fine) ---
    createForm.addEventListener('submit', async (event) => {
        // This part remains the same as your current code
        event.preventDefault();
        const createButton = document.getElementById('createSubordinateButton');
        createMessage.textContent = '';
        createButton.disabled = true;

        const countryId = parseInt(countrySelect.value);
        const channelId = parseInt(channelSelect.value);
        const teamId = parseInt(teamSelect.value);

        if (isNaN(countryId) || isNaN(channelId) || isNaN(teamId) || countryId <= 0 || channelId <= 0 || teamId <= 0) {
            createMessage.textContent = 'Please select a valid Country, Channel, and Team.';
            createMessage.style.color = 'red';
            createButton.disabled = false;
            return;
        }

        const newUserPayload = {
            email: document.getElementById('newEmail').value,
            first_name: document.getElementById('newFirstName').value,
            last_name: document.getElementById('newLastName').value,
            job_title: document.getElementById('newJobTitle').value,
            employee_id: document.getElementById('newEmployeeId').value,
            country_id: countryId,
            channel_id: channelId,
            team_id: teamId
        };

        const { data, error } = await supabase.functions.invoke('create-subordinate-user', {
            body: { newUser: newUserPayload },
        });

        if (error) {
            createMessage.textContent = `Error: ${error.message}`;
        } else {
            createMessage.textContent = data.message;
            createForm.reset();
        }
        createButton.disabled = false;
    });
    
    // --- Initialize ---
    await populateInitialDropdowns();
});