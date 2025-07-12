// scripts/uiHandlers.js

import { appState, setSelectedChannels, setSelectedYears, setSelectedStatuses } from './state.js';
import { updateAndRenderContent } from './app.js';
import { saveFiltersToURL } from './app.js';

/**
 * Toggles the visibility of a given dropdown and rotates its arrow.
 * @param {HTMLElement} dropdownElement - The dropdown container element.
 * @param {HTMLElement} arrowElement - The arrow icon element.
 */
function toggleDropdown(dropdownElement, arrowElement) {
    dropdownElement?.classList.toggle('show');
    arrowElement?.classList.toggle('rotated');
}

/**
 * Handles changes to filter checkboxes (channel, year, and status).
 * @param {HTMLInputElement} checkbox - The checkbox that triggered the change.
 * @param {string} filterType - 'channel', 'year', or 'status'.
 */
async function handleFilterOptionChange(checkbox, filterType) {
    const isAllCheckbox = checkbox.value === 'all';
    const allCheckboxId = `${filterType}_all`;
    const dropdownId = `${filterType}Dropdown`;

    let stateArray;
    let setStateFunction;
    let updateTextFunction;

    if (filterType === 'channel') {
        stateArray = appState.selectedChannels;
        setStateFunction = setSelectedChannels;
        updateTextFunction = updateSelectedChannelText;
    } else if (filterType === 'year') {
        stateArray = appState.selectedYears;
        setStateFunction = setSelectedYears;
        updateTextFunction = updateSelectedYearText;
    } else if (filterType === 'status') {
        stateArray = appState.selectedStatuses;
        setStateFunction = setSelectedStatuses;
        updateTextFunction = updateSelectedStatusText;
    }

    if (isAllCheckbox) {
        if (checkbox.checked) {
            setStateFunction(['all']);
            document.querySelectorAll(`#${dropdownId} input[type="checkbox"]`).forEach(cb => {
                cb.checked = cb.value === 'all';
            });
        } else {
            setStateFunction([]);
        }
    } else {
        const allCheckbox = document.getElementById(allCheckboxId);
        if (allCheckbox) allCheckbox.checked = false;

        let newState = stateArray.filter(val => val !== 'all');

        if (checkbox.checked) {
            if (!newState.includes(checkbox.value)) {
                newState.push(checkbox.value);
            }
        } else {
            newState = newState.filter(val => val !== checkbox.value);
            if (newState.length === 0) {
                if (filterType === 'status') {
                    setStateFunction(['public']);
                    const publicCheckbox = document.getElementById('status_public');
                    if (publicCheckbox) publicCheckbox.checked = true;
                } else {
                    setStateFunction(['all']);
                    if (allCheckbox) allCheckbox.checked = true;
                }
            }
        }
        setStateFunction(newState);
    } // Ensure handleFilterOptionChange has its closing brace before this point

    updateTextFunction();
    saveFiltersToURL();
    await updateAndRenderContent();
} // Make sure this is the correct closing brace for handleFilterOptionChange

/**
 * Updates the text displayed on the channel filter button.
 */
export function updateSelectedChannelText() {
    const selectedText = document.getElementById('selectedText');
    if (!selectedText) return;

    if (appState.selectedChannels.includes('all') || appState.selectedChannels.length === 0) {
        selectedText.textContent = 'All Channels';
    } else if (appState.selectedChannels.length === 1) {
        selectedText.textContent = appState.selectedChannels[0];
    } else {
        selectedText.innerHTML = `${appState.selectedChannels.length} Channels <span class="selected-count">${appState.selectedChannels.length}</span>`;
    }
}

/**
 * Updates the text displayed on the year filter button.
 */
export function updateSelectedYearText() {
    const selectedText = document.getElementById('selectedYearText');
    if (!selectedText) return;

    if (appState.selectedYears.includes('all') || appState.selectedYears.length === 0) {
        selectedText.textContent = 'All Years';
    } else if (appState.selectedYears.length === 1) {
        selectedText.textContent = appState.selectedYears[0];
    } else {
        selectedText.innerHTML = `${appState.selectedYears.length} Years <span class="selected-count">${appState.selectedYears.length}</span>`;
    }
}

/**
 * Updates the text displayed on the status filter button.
 */
export function updateSelectedStatusText() {
    const selectedText = document.getElementById('selectedStatusText');
    if (!selectedText) return;

    if (appState.selectedStatuses.includes('all') || appState.selectedStatuses.length === 0) {
        selectedText.textContent = 'All Statuses';
    } else if (appState.selectedStatuses.length === 1) {
        selectedText.textContent = appState.selectedStatuses[0].charAt(0).toUpperCase() + appState.selectedStatuses[0].slice(1);
    } else {
        selectedText.innerHTML = `${appState.selectedStatuses.length} Statuses <span class="selected-count">${appState.selectedStatuses.length}</span>`;
    }
}

/**
 * Updates the filter checkboxes in the UI to reflect the current appState.
 */
export function updateCheckboxesFromState() {
    // Update year checkboxes
    document.querySelectorAll('#yearDropdown input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = appState.selectedYears.includes(checkbox.value);
    });
    updateSelectedYearText();

    // Update channel checkboxes
    document.querySelectorAll('#channelDropdown input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = appState.selectedChannels.includes(checkbox.value);
    });
    updateSelectedChannelText();

    // NEW: Update status checkboxes
    document.querySelectorAll('#statusDropdown input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = appState.selectedStatuses.includes(checkbox.value);
    });
    updateSelectedStatusText();
}

/**
 * Initializes all event listeners for filter controls.
 */
export function initFilterEventListeners() {
    // General click handler for closing dropdowns when clicking outside
    document.addEventListener('click', function (event) {
        const channelContainer = document.getElementById('channelDropdown')?.closest('.multiselect-container');
        const yearContainer = document.getElementById('yearDropdown')?.closest('.multiselect-container');
        const statusContainer = document.getElementById('statusDropdown')?.closest('.multiselect-container');

        if (channelContainer && !channelContainer.contains(event.target)) {
            document.getElementById('channelDropdown')?.classList.remove('show');
            document.getElementById('dropdownArrow')?.classList.remove('rotated');
        }
        if (yearContainer && !yearContainer.contains(event.target)) {
            document.getElementById('yearDropdown')?.classList.remove('show');
            document.getElementById('yearDropdownArrow')?.classList.remove('rotated');
        }
        if (statusContainer && !statusContainer.contains(event.target)) {
            document.getElementById('statusDropdown')?.classList.remove('show');
            document.getElementById('statusDropdownArrow')?.classList.remove('rotated');
        }
    });

    // Event listener for year filter dropdown header click
    const yearHeader = document.querySelector('.multiselect-header[data-filter-type="year"]');
    if (yearHeader) {
        yearHeader.addEventListener('click', () => {
            toggleDropdown(document.getElementById('yearDropdown'), document.getElementById('yearDropdownArrow'));
        });
    }

    // Event listener for channel filter dropdown header click
    const channelHeader = document.querySelector('.multiselect-header[data-filter-type="channel"]');
    if (channelHeader) {
        channelHeader.addEventListener('click', () => {
            toggleDropdown(document.getElementById('channelDropdown'), document.getElementById('dropdownArrow'));
        });
    }

    // NEW: Event listener for status filter dropdown header click
    const statusHeader = document.querySelector('.multiselect-header[data-filter-type="status"]');
    if (statusHeader) {
        statusHeader.addEventListener('click', () => {
            toggleDropdown(document.getElementById('statusDropdown'), document.getElementById('statusDropdownArrow'));
        });
    }

    // Event listener for year filter checkbox changes
    document.getElementById('yearDropdown')?.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox') {
            handleFilterOptionChange(event.target, 'year');
        }
    });

    // Event listener for channel filter checkbox changes
    document.getElementById('channelDropdown')?.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox') {
            handleFilterOptionChange(event.target, 'channel');
        }
    });

    // NEW: Event listener for status filter checkbox changes
    document.getElementById('statusDropdown')?.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox') {
            handleFilterOptionChange(event.target, 'status');
        }
    });
}