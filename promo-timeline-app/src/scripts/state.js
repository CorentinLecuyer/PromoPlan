    // scripts/state.js

// Centralized state for filters and fetched data
export const appState = {
    allTimelineItems: [], // Processed timeline data
    allTableData: [],  
    tempTables: [], 
    catalogData: { 
            brands: [],
            subBrands: [],
            products: []
        },    
    selectedChannels: ['all'], 
    selectedYears: ['2026'],
    selectedStatuses: ['public']   
};

/**
 * Sets the selected channels in the application state.
 * @param {Array<string>} channels - An array of selected channel tags.
 */
export function setSelectedChannels(channels) {
    appState.selectedChannels = channels;
}

/**
 * Sets the selected years in the application state.
 * @param {Array<string>} years - An array of selected year strings.
 */
export function setSelectedYears(years) {
    appState.selectedYears = years;
}

/**
 * Updates the stored timeline items in the application state.
 * @param {Array<object>} items - The processed timeline items.
 */
export function setTimelineItems(items) {
    appState.allTimelineItems = items;
}

/**
 * Updates the stored table data in the application state.
 * @param {Array<object>} tables - The processed table data.
 */
export function setTableData(tables) {
    appState.allTableData = tables;
}

/**
 * Sets the selected statuses in the application state.
 * @param {Array<string>} statuses - An array of selected status tags.
 */
export function setSelectedStatuses(statuses) {
    appState.selectedStatuses = statuses;
}

export function setCatalogData(data) { // <-- ADD THIS FUNCTION 
    appState.catalogData = data;
    }