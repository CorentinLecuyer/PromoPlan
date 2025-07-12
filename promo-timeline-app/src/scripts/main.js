// scripts/app.js

import { fetchPromotionalItems, fetchDisplayTables } from './supabaseClient.js';
import { appState, setSelectedChannels, setSelectedYears, setTimelineItems, setTableData } from './state.js';
import { processTimelineItems, processDisplayTables } from './utils.js';
import { renderTimeline, renderTablesHomePage } from './renderers.js';
import { initFilterEventListeners, updateCheckboxesFromState, updateSelectedYearText } from './uiHandlers.js'; // Import updateSelectedYearText to ensure initial text is set

/**
 * Loads filter selections from the URL query parameters and updates the appState.
 */
function loadFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);

    const yearsParam = params.get('years');
    if (yearsParam) {
        const years = yearsParam.split(',').filter(year => year.trim() !== '');
        setSelectedYears(years.length === 0 ? ['all'] : years);
    } else {
        // Default to '2026' if no year parameter is in the URL
        setSelectedYears(['2026']);
    }

    const channelsParam = params.get('channels'); // Assuming you might add channel filter to URL later
    if (channelsParam) {
        const channels = channelsParam.split(',').filter(channel => channel.trim() !== '');
        setSelectedChannels(channels.length === 0 ? ['all'] : channels);
    } else {
        setSelectedChannels(['all']); // Default
    }
}

/**
 * Saves current filter selections from the appState to the URL query parameters.
 */
export function saveFiltersToURL() {
    const params = new URLSearchParams();

    if (!appState.selectedYears.includes('all') && appState.selectedYears.length > 0) {
        params.set('years', appState.selectedYears.join(','));
    }
    if (!appState.selectedChannels.includes('all') && appState.selectedChannels.length > 0) {
        params.set('channels', appState.selectedChannels.join(','));
    }

    const newURL = params.toString() ?
        `${window.location.pathname}?${params.toString()}` :
        window.location.pathname;

    window.history.replaceState({}, '', newURL);
}

/**
 * Fetches data from Supabase, processes it, updates the global state, and triggers rendering.
 * This is the core function called when filters change or on initial load.
 */
export async function updateAndRenderContent() {
    try {
        // Fetch and process table data (needed for timeline rendering)
        const rawTableData = await fetchDisplayTables();
        const processedTableData = processDisplayTables(rawTableData);
        setTableData(processedTableData);

        // Fetch and process timeline data based on current filters
        const rawTimelineData = await fetchPromotionalItems(
            appState.selectedYears,
            appState.selectedChannels
        );
        const processedTimelineData = processTimelineItems(rawTimelineData);
        setTimelineItems(processedTimelineData);

        // Render content based on which root element exists on the current page
        const timelineRoot = document.getElementById('timeline-root');
        const homePageRoot = document.getElementById('timeline-root-home-page');

        if (timelineRoot) {
            renderTimeline(); // Render timeline view using data from appState
        }
        if (homePageRoot) {
            renderTablesHomePage(); // Render calendar view using data from appState
        }

    } catch (error) {
        console.error('Application Error:', error);
        const errorMessage = '<p style="color:red;">Failed to load data. Please check your internet connection or Supabase configuration.</p>';

        const timelineRootElement = document.getElementById('timeline-root');
        if (timelineRootElement) {
            timelineRootElement.innerHTML = errorMessage;
        }

        const homePageRootElement = document.getElementById('timeline-root-home-page');
        if (homePageRootElement) {
            homePageRootElement.innerHTML = errorMessage;
        }
    }
}

/**
 * Initializes the entire application when the DOM is ready.
 */
async function initializeApp() {
    loadFiltersFromURL();         // Load initial filters from URL
    updateCheckboxesFromState();  // Set filter UI based on loaded filters
    initFilterEventListeners();   // Set up all filter-related event listeners

    await updateAndRenderContent(); // Perform initial data fetch and render
}

// Attach the initialization function to the DOMContentLoaded event
document.addEventListener('DOMContentLoaded', initializeApp);