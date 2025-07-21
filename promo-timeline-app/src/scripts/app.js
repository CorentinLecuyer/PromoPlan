// scripts/app.js

import { fetchPromotionalItems, fetchDisplayTables } from './supabaseClient.js';
import { appState, setTimelineItems, setTableData } from './state.js';
import { processTimelineItems, processDisplayTables } from './utils.js';
import { renderTimeline, renderTablesHomePage } from './renderers.js';
import { signOut, getSession } from './supabaseAuth.js';
import { initFilterModal, getSavedFilters } from './shared/filterModal.js'; // Import getSavedFilters

/**
 * Fetches data from Supabase based on saved filters, processes it, 
 * updates the global state, and triggers rendering.
 */
export async function updateAndRenderContent() {
    try {
        console.log('Updating and rendering content...');

        const filters = getSavedFilters(); // Get the filters first

        // Fetch all necessary data in parallel, passing filters to the relevant function
        const [rawTableData, rawTimelineData] = await Promise.all([
            fetchDisplayTables(),
            fetchPromotionalItems(filters) // Pass filters as an argument
        ]);
        
        console.log('Raw Table Data fetched:', rawTableData);
        const processedTableData = processDisplayTables(rawTableData);
        setTableData(processedTableData);
        console.log('Processed Table Data stored:', appState.allTableData);

        console.log('Raw Timeline Data fetched:', rawTimelineData);
        const processedTimelineData = processTimelineItems(rawTimelineData);
        setTimelineItems(processedTimelineData);
        console.log('Processed Timeline Data stored:', appState.allTimelineItems);

        // Render content based on which root element exists on the current page
        const timelineRoot = document.getElementById('timeline-root');
        const homePageRoot = document.getElementById('timeline-root-home-page');

        if (timelineRoot) {
            console.log('Rendering Timeline...');
            renderTimeline();
        }
        if (homePageRoot) {
            console.log('Rendering Homepage Tables...');
            renderTablesHomePage();
        }

    } catch (error) {
        console.error('Application Error:', error);
        const errorMessage = '<p style="color:red;">Failed to load data. Please check your internet connection or Supabase configuration.</p>';
        const rootElement = document.getElementById('timeline-root') || document.getElementById('timeline-root-home-page');
        if (rootElement) {
            rootElement.innerHTML = errorMessage;
        }
    }
}


const viewSwitcher = document.getElementById('viewSwitcher');
if (viewSwitcher) {
    viewSwitcher.addEventListener('change', () => {
        // Now, this will call the actual function to re-render the tables
        renderTablesHomePage();
    });
}

/**
 * Initializes the main application logic.
 */
async function initializeApp() {
    // Check user authentication status
    const session = await getSession();
    const logoutButton = document.getElementById('logoutButton');

    if (session) {
        if (logoutButton) logoutButton.style.display = 'inline-block';
        console.log('User is logged in:', session.user.email);
    } else {
        if (logoutButton) logoutButton.style.display = 'none';
        console.log('User is not logged in.');
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'login.html' && currentPage !== 'signup.html') {
             window.location.href = 'login.html';
        }
        return; // Stop initialization if not logged in
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            const { error } = await signOut();
            if (!error) {
                console.log('User signed out.');
                window.location.href = 'login.html';
            } else {
                console.error('Logout failed:', error.message);
            }
        });
    }

    // Initialize the filter modal
    await initFilterModal();

    // Listen for the custom event from the modal to re-render content
    document.addEventListener('filtersApplied', async () => {
        console.log('Filters applied event received, updating content.');
        await updateAndRenderContent();
    });

    // Initial render on page load
    await updateAndRenderContent();
}

// Start the app
document.addEventListener('DOMContentLoaded', initializeApp);
