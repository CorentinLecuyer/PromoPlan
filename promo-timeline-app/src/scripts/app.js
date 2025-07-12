// scripts/app.js

import { fetchPromotionalItems, fetchDisplayTables } from './supabaseClient.js'; // Will revert to single fetchPromotionalItems
import { appState, setSelectedChannels, setSelectedYears, setSelectedStatuses, setTimelineItems, setTableData } from './state.js'; // NEW IMPORT
import { processTimelineItems, processDisplayTables } from './utils.js';
import { renderTimeline, renderTablesHomePage } from './renderers.js';
import { initFilterEventListeners, updateCheckboxesFromState, updateSelectedYearText } from './uiHandlers.js';

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
        setSelectedYears(['2026']);
    }

    const channelsParam = params.get('channels');
    if (channelsParam) {
        const channels = channelsParam.split(',').filter(channel => channel.trim() !== '');
        setSelectedChannels(channels.length === 0 ? ['all'] : channels);
    } else {
        setSelectedChannels(['all']);
    }

    // NEW: Load statuses from URL
    const statusesParam = params.get('statuses');
    if (statusesParam) {
        const statuses = statusesParam.split(',').filter(status => status.trim() !== '');
        setSelectedStatuses(statuses.length === 0 ? ['public'] : statuses); // Default to 'public' if empty
    } else {
        setSelectedStatuses(['public']); // Default to 'public' if no param
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
    // NEW: Save statuses to URL
    if (!appState.selectedStatuses.includes('public') || appState.selectedStatuses.length > 1 || appState.selectedStatuses.includes('all')) {
        params.set('statuses', appState.selectedStatuses.join(','));
    } else {
        params.delete('statuses'); // Remove if default 'public' to keep URL clean
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
        console.log('App State (before fetch):', appState);

        const rawTableData = await fetchDisplayTables();
        console.log('Raw Table Data fetched:', rawTableData);
        const processedTableData = processDisplayTables(rawTableData);
        setTableData(processedTableData);
        console.log('Processed Table Data stored:', appState.allTableData);

        // NEW: Pass selectedStatuses to fetchPromotionalItems
        const rawTimelineData = await fetchPromotionalItems(
            appState.selectedYears,
            appState.selectedChannels,
            appState.selectedStatuses // NEW PARAMETER
        );
        console.log('Raw Timeline Data fetched:', rawTimelineData);
        const processedTimelineData = processTimelineItems(rawTimelineData);
        setTimelineItems(processedTimelineData);
        console.log('Processed Timeline Data stored:', appState.allTimelineItems);

        // ... (rest of updateAndRenderContent remains the same)
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
async function initializeApp() {
    loadFiltersFromURL();
    updateCheckboxesFromState();
    initFilterEventListeners();

    // Ensure the year text is updated on initial load even if no filters change
    updateSelectedYearText(); // Ensure initial display is correct

    await updateAndRenderContent();
}

document.addEventListener('DOMContentLoaded', initializeApp);