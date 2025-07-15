// scripts/promoDetailApp.js

// Import appState from your state.js file
import { appState } from './state.js';
import { supabase, signOut, getSession, getUser } from './supabaseAuth.js';
// Make sure fetchAllTableData is imported from supabaseClient.js
import { fetchPromoById, updatePromo, deletePromo, fetchAllTableData } from './supabaseClient.js';
import { stringToArray, stringToNumberArray, arrayToString, formatDateRange } from './utils.js';
// Import rendering functions from renderers.js
import { getTableDataById, generateTableHTML, generateMultipleTablesHTML } from './renderers.js';

// --- DOM Elements ---
const promoDetailForm = document.getElementById('promoDetailForm');
const promoIdDisplay = document.getElementById('promoIdDisplay');
const promoMessage = document.getElementById('promoMessage');
const savePromoButton = document.getElementById('savePromoButton'); // Ensure this ID is consistent in HTML
const deletePromoButton = document.getElementById('deletePromoButton');
const logoutButton = document.getElementById('logoutButton');

// Form fields
const promoTitleInput = document.getElementById('promoTitle');
const promoTypeInput = document.getElementById('promoType');
const promoDetailsInput = document.getElementById('promoDetails');
const promoBudgetInput = document.getElementById('promoBudget');
const promoBudgetTypeInput = document.getElementById('promoBudgetType');
const channelTagsInput = document.getElementById('channelTags');
const promoStartDateInput = document.getElementById('promoStartDate');
const promoEndDateInput = document.getElementById('promoEndDate');
const promoUpliftHLInput = document.getElementById('promoUpliftHL');
const promoUpliftMachineInput = document.getElementById('promoUpliftMachine');// Corrected typo
const roiInput = document.getElementById('roi');
const promoIconDisplay = document.getElementById('promoIconDisplay');
const openIconPickerButton = document.getElementById('openIconPickerButton');
const iconPickerContainer = document.getElementById('iconPickerContainer');
const linkInput = document.getElementById('link');
const tableNameInput = document.getElementById('tableName');
const macoInput = document.getElementById('maco');
const fscreenCheckbox = document.getElementById('fscreen');
const authorInput = document.getElementById('author');
const ownerInput = document.getElementById('owner');
const creationDateInput = document.getElementById('creationDate');
const statusSelect = document.getElementById('status');
const countryInput = document.getElementById('country');
const buInput = document.getElementById('bu');
const borderColorInput = document.getElementById('borderColor');
const bgColorInput = document.getElementById('bgColor');
const userIdInput = document.getElementById('userId');

const promoPreviewDiv = document.getElementById('promoPreview');

// --- Global State Variables ---
let currentPromoId = null;
let currentPromoData = null;
let selectedIconEmoji = '🎯'; // For emoji picker
let picker = null; // Emoji picker instance
let emojiMartData = null; // Fetched emoji data

// --- Helper function for messages ---
function displayMessage(message, isError = false) {
    promoMessage.textContent = message;
    promoMessage.style.color = isError ? 'red' : 'green';
}

// --- Emoji Mart Picker Setup ---
// The actual initialization logic is now inside initializePromoDetailPage (below)

// Event listener for opening the picker
if (openIconPickerButton) { // CHECK IF THE BUTTON EXISTS
    console.log("Attempting to attach click listener to openIconPickerButton.");
    openIconPickerButton.addEventListener('click', () => {
        console.log("Pick Icon button clicked!"); // THIS MUST APPEAR IN CONSOLE ON CLICK
        console.log("Current picker instance (should be null initially):", picker);
        console.log("Emoji Mart Data state (should be populated):", emojiMartData);
        console.log("window.EmojiMart:", window.EmojiMart);
        console.log("window.EmojiMart.Picker:", window.EmojiMart ? window.EmojiMart.Picker : 'not defined');


        if (!picker) {
            console.log("Picker not yet initialized. Attempting to create new picker instance.");
            if (window.EmojiMart && window.EmojiMart.Picker && emojiMartData) { // Check if data is loaded
                console.log("All conditions met for picker initialization!");
                picker = new window.EmojiMart.Picker({
                    data: emojiMartData, // Pass the pre-fetched data
                    onEmojiSelect: (emoji) => {
                        console.log("Emoji selected:", emoji.native);
                        selectedIconEmoji = emoji.native;
                        promoIconDisplay.textContent = selectedIconEmoji;
                        iconPickerContainer.style.display = 'none';
                        displayMessage('Icon selected!', false);
                        updatePreviewFromForm();
                    },
                    theme: 'light',
                    set: 'windows',
                });
                iconPickerContainer.appendChild(picker);
                console.log("Picker appended to container.");

                // Timeouts for nav element are fine, but consider if #nav is always the ID
                setTimeout(() => {
                    const navElement = iconPickerContainer.querySelector('#nav');
                    if (navElement) {
                        navElement.style.display = 'none';
                        console.log("Emoji picker nav hidden.");
                    } else {
                        console.log("Emoji picker nav element not found on first try.");
                        setTimeout(() => {
                            const navElementRetry = iconPickerContainer.querySelector('#nav');
                            if (navElementRetry) {
                                navElementRetry.style.display = 'none';
                                console.log("Emoji picker nav hidden on retry.");
                            } else {
                                console.log("Emoji picker nav element not found even on retry.");
                            }
                        }, 500);
                    }
                }, 100);

            } else {
                console.warn("Conditions NOT met for picker initialization. Window.EmojiMart:", window.EmojiMart, "window.EmojiMart.Picker:", window.EmojiMart ? window.EmojiMart.Picker : 'N/A', "emojiMartData:", emojiMartData);
                displayMessage('Emoji picker library or data not loaded. Check console.', true);
                return;
            }
        }
        // Toggle display of the picker container
        iconPickerContainer.style.display = iconPickerContainer.style.display === 'none' ? 'block' : 'none';
        console.log("Icon picker container display set to:", iconPickerContainer.style.display);
    });
} else {
    console.warn("openIconPickerButton (the 'Pick Icon' button) not found in DOM. Emoji picker functionality disabled.");
}

// Event listener for closing the picker when clicking outside
document.addEventListener('click', (event) => {
    if (picker && iconPickerContainer && iconPickerContainer.style.display === 'block' &&
        openIconPickerButton && !openIconPickerButton.contains(event.target) && !iconPickerContainer.contains(event.target)) {
        iconPickerContainer.style.display = 'none';
        console.log("Emoji picker closed due to outside click.");
    }
});
// --- End Emoji Mart Picker Setup ---


// --- Form Population ---
function populateForm(promo) {
    promoTitleInput.value = promo.promo_title || '';
    promoTypeInput.value = promo.promo_type || '';
    promoDetailsInput.value = arrayToString(promo.promo_details);
    promoBudgetInput.value = arrayToString(promo.promo_budget);
    Array.from(promoBudgetTypeInput.options).forEach(option => {
        option.selected = false;
    });
    if (Array.isArray(promo.budgetType)) {
        promo.budgetType.forEach(tag => {
            const option = Array.from(promoBudgetTypeInput.options).find(opt => opt.value === tag);
            if (option) {
                option.selected = true;
            }
        });
    }

    Array.from(channelTagsInput.options).forEach(option => {
        option.selected = false;
    });
    // Set selected based on promo.channel_tags array
    if (Array.isArray(promo.channel_tags)) {
        promo.channel_tags.forEach(tag => {
            const option = Array.from(channelTagsInput.options).find(opt => opt.value === tag);
            if (option) {
                option.selected = true;
            }
        });
    }
    promoStartDateInput.value = promo.promo_start_date || '';
    promoEndDateInput.value = promo.promo_end_date || '';
    promoUpliftHLInput.value = promo.promo_uplift_HL || '';
    promoUpliftMachineInput.value = promo.promo_uplift_machine || '';
    roiInput.value = promo.ROI || '';

    selectedIconEmoji = promo.icon || '🎯';
    if (promoIconDisplay) { // Defensive check
        promoIconDisplay.textContent = selectedIconEmoji;
    }

    linkInput.value = promo.link || '';
    tableNameInput.value = arrayToString(promo.table_name);
    macoInput.value = promo.MACO || '';
    fscreenCheckbox.checked = promo.fscreen || false;
    authorInput.value = promo.author || '';
    ownerInput.value = promo.owner || '';
    creationDateInput.value = promo.creation_date || '';
    statusSelect.value = promo.status || 'draft';
    countryInput.value = promo.country || '';
    buInput.value = promo.BU || '';
    borderColorInput.value = promo.bordercolor || '';
    bgColorInput.value = arrayToString(promo.bgcolor);
    userIdInput.value = promo.user_id || '';
}

// --- Get Form Data for Preview/Save ---
function getPromoDataFromForm() {


    let BU_final = buInput.value;
    if (
        countryInput.value === 'Belgium' ||
        countryInput.value === 'France' ||
        countryInput.value === 'Luxembourg' ||
        countryInput.value === 'Netherlands'
    ) {
        BU_final = 'BNFL';
    } else if (
        countryInput.value === 'England' ||
        countryInput.value === 'Northern Ireland'
    ) {
        BU_final = 'BU WEST';
    } else if (
        countryInput.value === 'Switzerland' ||
        countryInput.value === 'Italy' ||
        countryInput.value === 'Czech Republic' ||
        countryInput.value === 'Germany'
    ) {
        BU_final = 'BU CENTRAL';
    }


    return {
        id: currentPromoId,
        promo_title: promoTitleInput.value,
        promo_type: promoTypeInput.value || null,
        promo_details: stringToArray(promoDetailsInput.value),
        promo_budget: stringToNumberArray(promoBudgetInput.value),
        promo_budget_type: Array.from(promoBudgetTypeInput.selectedOptions).map(option => option.value),
        channel_tags: Array.from(channelTagsInput.selectedOptions).map(option => option.value),
        promo_start_date: promoStartDateInput.value || null,
        promo_end_date: promoEndDateInput.value || null,
        promo_uplift_HL: promoUpliftHLInput.value ? Number(promoUpliftHLInput.value) : null,
        promo_uplift_machine: promoUpliftMachineInput.value ? Number(promoUpliftMachineInput.value) : null,
        ROI: roiInput.value || null,
        icon: selectedIconEmoji || null,
        link: linkInput.value || null,
        table_name: stringToNumberArray(tableNameInput.value),
        MACO: macoInput.value ? Number(macoInput.value) : null,
        fscreen: fscreenCheckbox.checked,
        author: authorInput.value || null,
        owner: ownerInput.value || null,
        creation_date: creationDateInput.value || null,
        status: statusSelect.value || 'draft',
        country: countryInput.value || null,
        BU: BU_final || null,
        bordercolor: borderColorInput.value || null,
        bgcolor: stringToArray(bgColorInput.value),
        user_id: userIdInput.value || null,
    };
}

// --- Update Preview from Form ---
function updatePreviewFromForm() {
    const previewPromo = getPromoDataFromForm();
    renderPromoPreview(previewPromo);
}

// --- Render Promo Preview ---
function renderPromoPreview(promo) {
    if (!promoPreviewDiv) return;

    const formattedDate = formatDateRange(promo.promo_start_date, promo.promo_end_date);
    const hasBudget = Array.isArray(promo.promo_budget) && promo.promo_budget.length > 0 && promo.promo_budget.some(b => b > 0);
    const hasMACO = typeof promo.MACO === 'number' && promo.MACO > 0;
    const hasUpliftHL = typeof promo.promo_uplift_HL === 'number' && promo.promo_uplift_HL > 0;
    const hasUpliftMachine = typeof promo.promo_uplift_machine === 'number' && promo.promo_uplift_machine > 0;
    const hasROI = promo.ROI !== null && promo.ROI !== undefined && promo.ROI !== 0 && promo.ROI !== 'TBC' && promo.ROI !== 'undefined';

    // --- Styling Logic (reused from renderers.js) ---
    let inlineBgStyle = '';
    if (Array.isArray(promo.bgcolor) && promo.bgcolor.length >= 1) {
        const color1 = promo.bgcolor[0];
        const color2 = promo.bgcolor.length > 1 ? promo.bgcolor[1] : color1;
        inlineBgStyle = `background-image: linear-gradient(to bottom right, ${color1}, ${color2});`;
    } else if (typeof promo.bgcolor === 'string' && promo.bgcolor !== '') {
        inlineBgStyle = `background-color: ${promo.bgcolor};`;
    }

    let timelineContentBorderAndBg = '';
    let promoTypeBgColor = '';
    let timelineDotBorder = '';

    if (promo.bordercolor && promo.bordercolor !== '') {
        timelineContentBorderAndBg = `border-left: 4px solid ${promo.bordercolor};`;
        promoTypeBgColor = `background-color: ${promo.bordercolor};`;
        timelineDotBorder = `border: 3px solid ${promo.bordercolor};`;
    }
    const combinedInlineContentStyle = `style="${inlineBgStyle} ${timelineContentBorderAndBg}"`;
    const combinedPromoTypeStyle = `style="${promoTypeBgColor}"`;
    // --- End Styling Logic ---

    // --- DYNAMIC TABLE LOADING ---
    const dynamicTablesHTML = generateMultipleTablesHTML(promo.table_name);
    // --- END DYNAMIC TABLE LOADING ---

    let previewHTML = `
        <div class="timeline">
            <div class="timeline-item">
                <div class="timeline-content" ${combinedInlineContentStyle}>
                    <div class="promo-type ${promo.promo_type ? promo.promo_type.toLowerCase().replace(/\s+/g, '-') : ''}" ${combinedPromoTypeStyle}>${promo.promo_type || 'N/A'}</div>
                    <div class="promo-title">${promo.promo_title || 'New Promo'}</div>
                    <div class="promo-date"> ${formattedDate || 'No Date'} </div>
                    <div class="promo-details">
                        ${(promo.promo_details && promo.promo_details.map(line => `• ${line}<br>`).join("")) || 'No details.'}
                    </div>
                    <div class="channel-tags">
                        ${(promo.channel_tags && promo.channel_tags.map(ch => `<span class="channel-tag">${ch}</span>`).join("")) || 'No channels.'}
                    </div>

                    ${dynamicTablesHTML}

                    ${(hasBudget || hasMACO || hasUpliftHL || hasUpliftMachine || hasROI) ? `
                        <h3 class="table-title" style="margin-top: 10px;">Budget Details / Financials</h3>
                        <table class="promo-table-budget" style="font-size: 0.8em; width: 100%;">
                            <thead>
                                <tr>
                                    <th>Budget</th>
                                    <th>Budget Type</th>
                                    <th>Uplift HL</th>
                                    <th>Uplift Machine</th>
                                    <th>ROI</th>
                                    <th>MACO</th>
                                </tr>
                            </thead>
                            <tbody>
                            ${(promo.promo_budget && promo.promo_budget.length > 0) ? promo.promo_budget.map((budget, index) => {
                                const budgetType = (promo.promo_budget_type && promo.promo_budget_type[index]) || 'N/A';
                                const displayFinancials = index === 0;
                                return `
                                    <tr>
                                        <th>${budget.toLocaleString('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0
                                        })}</th>
                                        <th><span class="channel-tag-budget">${budgetType}</span></th>
                                        ${displayFinancials ?
                                            `<th rowspan="${promo.promo_budget.length}">${promo.promo_uplift_HL || 0} HL</th>
                                            <th rowspan="${promo.promo_budget.length}">${promo.promo_uplift_machine || 0} Machines</th>
                                            <th rowspan="${promo.promo_budget.length}">${promo.ROI || 'TBC'}</th>
                                            <th rowspan="${promo.promo_budget.length}">${(promo.MACO || 0).toLocaleString('fr-FR', {
                                                style: 'currency',
                                                currency: 'EUR',
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0
                                            })}</th>`
                                            : ''}
                                    </tr>
                                `;
                            }).join("") : `
                                <tr>
                                    <th>-</th>
                                    <th>-</th>
                                    <th>${promo.promo_uplift_HL || 0} HL</th>
                                    <th>${promo.promo_uplift_machine || 0} Machines</th>
                                    <th>${promo.ROI || 'TBC'}</th>
                                    <th>${(promo.MACO || 0).toLocaleString('fr-FR', {
                                        style: 'currency',
                                        currency: 'EUR',
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0
                                    })}</th>
                                </tr>`}
                            </tbody>
                        </table>` : ""}
                </div>
                <a href="${promo.link || '#'}" target="_blank" style="text-decoration: none;">
                    <div class="icon-container" style="font-size: 2em; margin-top: 10px; ${timelineDotBorder}">
                        <div class="icon-emoji">${promo.icon || '❓'}</div>
                    </div>
                </a>
            </div>
        </div>
    `;
    promoPreviewDiv.innerHTML = previewHTML;
}

// --- Main Initialization Function (called on DOMContentLoaded) ---
async function initializePromoDetailPage() {
    // 1. Fetch all table data
    console.log("All Table Data loaded into appState (before fetch):", appState.allTableData);
    displayMessage('Loading all table data...', false);
    try {
        const { data, error } = await fetchAllTableData();
        if (error) throw error;
        appState.allTableData = data;
        console.log("All Table Data loaded into appState (after fetch):", appState.allTableData);
        displayMessage('Table data loaded.', false);
    } catch (error) {
        console.error('Error fetching all table data:', error.message);
        displayMessage(`Failed to load table data: ${error.message}`, true);
        appState.allTableData = [];
    }

    // --- Fetch Emoji Mart Data ---
    displayMessage('Loading emoji data...', false);
    try {
        const response = await fetch('https://cdn.jsdelivr.net/npm/@emoji-mart/data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        emojiMartData = await response.json();
        displayMessage('Emoji data loaded.', false);
    } catch (error) {
        console.error('Error fetching emoji data:', error.message);
        displayMessage('Failed to load emoji data. Picker may not work.', true);
        emojiMartData = null; // Ensure it's null if fetch fails
    }
    // --- END Emoji Mart Fetch ---

    // 2. Load promo details
    const urlParams = new URLSearchParams(window.location.search);
    currentPromoId = urlParams.get('id');

    if (!currentPromoId) {
        displayMessage('No promotion ID found in URL.', true);
        promoDetailForm.style.display = 'none';
        return;
    }

    promoIdDisplay.textContent = `Editing Promotion ID: ${currentPromoId}`;
    displayMessage('Loading promotion details...', false);

    try {
        const { data, error } = await fetchPromoById(currentPromoId);

        if (error) {
            throw error;
        }

        if (!data) {
            displayMessage('Promotion not found or you do not have access.', true);
            promoDetailForm.style.display = 'none';
            return;
        }

        currentPromoData = data;
        populateForm(data);
        displayMessage('Promotion details loaded.', false);

    } catch (error) {
        console.error('Error loading promo details:', error.message);
        displayMessage(`Failed to load promo details: ${error.message}`, true);
        promoDetailForm.style.display = 'none';
    }

    // 3. Setup Event Listeners for Live Preview
    // These listeners are now safely placed within DOMContentLoaded
    if (promoDetailForm) { // Defensive check
        promoDetailForm.addEventListener('input', () => {
            updatePreviewFromForm();
        });

        promoDetailForm.addEventListener('change', () => {
            updatePreviewFromForm();
        });
    }


    // Initial call to populate preview after all data is loaded and form is populated
    updatePreviewFromForm();
}


// --- Event Listeners for Buttons ---
if (promoDetailForm) { // Defensive check for form submission
    promoDetailForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (savePromoButton) savePromoButton.disabled = true; // Defensive check
        displayMessage('Saving promotion...', false);

        const updatedPromo = getPromoDataFromForm();

        try {
            const { error } = await updatePromo(currentPromoId, updatedPromo);
            if (error) {
                throw error;
            }
            displayMessage('Promotion updated successfully!', false);
        } catch (error) {
            console.error('Error updating promotion:', error.message);
            displayMessage(`Failed to update promotion: ${error.message}`, true);
        } finally {
            if (savePromoButton) savePromoButton.disabled = false; // Defensive check
        }
    });
}


if (deletePromoButton) { // Defensive check
    deletePromoButton.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this promotion?')) {
            return;
        }
        deletePromoButton.disabled = true;
        displayMessage('Deleting promotion...', false);

        try {
            const { error } = await deletePromo(currentPromoId);
            if (error) {
                throw error;
            }
            displayMessage('Promotion deleted successfully! Redirecting...', false);
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1500);
        } catch (error) {
            console.error('Error deleting promotion:', error.message);
            displayMessage(`Failed to delete promotion: ${error.message}`, true);
        } finally {
            deletePromoButton.disabled = false;
        }
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        const { error } = await signOut();
        if (!error) {
            window.location.href = 'login.html';
        } else {
            console.error('Logout failed:', error.message);
        }
    });
}

// Call the main initialization function when the DOM is ready
document.addEventListener('DOMContentLoaded', initializePromoDetailPage);