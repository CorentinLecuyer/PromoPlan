// In scripts/teamManagement.js - CORRECTED VERSION

import { supabase } from './supabaseAuth.js';
import { fetchCountries, fetchChannels, fetchTeams } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const createForm = document.getElementById('createSubordinateForm');
    const countrySelect = document.getElementById('newCountry');
    const channelSelect = document.getElementById('newChannel');
    const teamSelect = document.getElementById('newTeam');
    const createMessage = document.getElementById('createMessage');

    // This function populates the initial dropdowns
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

        teamSelect.innerHTML = '<option value="">Select a channel first</option>';
        teamSelect.disabled = true;
    }

    // This function populates the teams dropdown when a channel is selected
    channelSelect.addEventListener('change', async () => {
        const selectedChannelId = channelSelect.value;

        if (selectedChannelId) {
            teamSelect.disabled = false;
            teamSelect.innerHTML = '<option value="">Loading teams...</option>';
            const { data: teams } = await fetchTeams(selectedChannelId);

            teamSelect.innerHTML = '<option value="">Select a team</option>';
            if (teams && teams.length > 0) {
                teams.forEach(t => teamSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`);
            } else {
                teamSelect.innerHTML = '<option value="">No teams found</option>';
            }
        } else {
            teamSelect.innerHTML = '<option value="">Select a channel first</option>';
            teamSelect.disabled = true;
        }
    });

    // This handles the form submission with the corrected logic
    createForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const createButton = document.getElementById('createSubordinateButton');
        createMessage.textContent = '';
        createButton.disabled = true;

        // --- THIS IS THE FIX ---
        // We get the raw string value for the UUID, not parseInt()
        const countryId = countrySelect.value;
        const channelId = channelSelect.value;
        const teamId = teamSelect.value; // teamId is a UUID string

        // Corrected validation: just check if a value was selected
        if (!countryId || !channelId || !teamId) {
            createMessage.textContent = 'Please select a valid Country, Channel, and Team.';
            createMessage.style.color = 'red';
            createButton.disabled = false;
            return;
        }
        // --- END OF FIX ---

        const newUserPayload = {
            email: document.getElementById('newEmail').value,
            first_name: document.getElementById('newFirstName').value,
            last_name: document.getElementById('newLastName').value,
            job_title: document.getElementById('newJobTitle').value,
            employee_id: document.getElementById('newEmployeeId').value,
            country_id: parseInt(countryId), // countryId is an integer, so parseInt is correct here
            channel_id: parseInt(channelId), // channelId is an integer, so parseInt is correct here
            team_id: teamId // Pass the correct UUID string
        };

        const { data, error } = await supabase.functions.invoke('create-subordinate-user', {
            body: { newUser: newUserPayload },
        });

        if (error) {
            createMessage.textContent = `Error: ${error.message}`;
        } else {
            createMessage.textContent = data.message;
            createForm.reset();
            window.location.href = '../profile.html'; // Redirect after successful creation    

        }
        createButton.disabled = false;
    });

    await populateInitialDropdowns();
});