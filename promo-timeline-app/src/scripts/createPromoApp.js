// =================================================================
// 1. IMPORTS
// =================================================================
import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';
import { appState } from './state.js';
import { supabase, signOut, getUser } from './supabaseAuth.js'; // Added getUser
import { createPromo, createPromoTableWithFunction } from './supabaseClient.js';
import { stringToArray, stringToNumberArray, arrayToString, formatDateRange } from './utils.js';
import { generateMultipleTablesHTML, getTableDataById } 
    from './renderers.js';

// =================================================================
// 2. ALPINE COMPONENT FOR TABLE MODAL
// =================================================================
Alpine.data('tableManager', () => ({
    isModalOpen: false,
    linkedTableIds: [], 
    selectedTableId: null,
    editor: {
        tableName: '',
        tableStyle: 'blackTable',
        headers: [],
        rows: [],
        columnLimit: 6,
    },
    message: { text: '', isError: false },

    openModal() {
        this.linkedTableIds = appState.tempTables.map(t => t.tempId);
        this.startNewTable();
        this.isModalOpen = true;
    },
    closeModal() {
        this.isModalOpen = false;
        this.message.text = '';
    },
    startNewTable() {
        this.selectedTableId = null;
        this.editor.tableName = '';
        this.editor.tableStyle = 'blackTable';
        this.editor.headers = ['Header 1'];
        this.editor.rows = [['Cell 1']];
        this.message.text = 'Ready to create a temporary table.';
        this.message.isError = false;
    },
    loadTableForEditing(tableId) {
        const tableData = appState.tempTables.find(t => t.tempId === tableId);
        if (!tableData) {
            this.message = { text: `Error: Temporary table ${tableId} not found.`, isError: true };
            return;
        }
        this.selectedTableId = tableId;
        this.editor.tableName = tableData.table_name || '';
        this.editor.tableStyle = tableData.style || 'blackTable';
        this.editor.headers = [...(tableData.th || [])];
        this.editor.rows = tableData.tr.map(row => [...row]);
        this.message = { text: `Editing Temporary Table: ${tableData.table_name || tableId}`, isError: false };
    },
    addColumn() {
        if (this.editor.headers.length >= this.editor.columnLimit) return;
        this.editor.headers.push(`Column ${this.editor.headers.length + 1}`);
        this.editor.rows.forEach(row => row.push(''));
    },
    removeLastColumn() {
        if (this.editor.headers.length === 0) return;
        this.editor.headers.pop();
        this.editor.rows.forEach(row => row.pop());
    },
    addRow() {
        const newRow = Array(this.editor.headers.length).fill('');
        this.editor.rows.push(newRow);
    },
    removeLastRow() {
        if (this.editor.rows.length === 0) return;
        this.editor.rows.pop();
    },
    saveTable() {
        const payload = {
            table_name: this.editor.tableName,
            style: this.editor.tableStyle,
            th: this.editor.headers,
            tr: this.editor.rows, 
        };

        if (this.selectedTableId) {
            const index = appState.tempTables.findIndex(t => t.tempId === this.selectedTableId);
            if (index !== -1) {
                appState.tempTables[index] = { ...appState.tempTables[index], ...payload };
            }
            this.message = { text: 'Temporary table updated.', isError: false };
        } else {
            const tempId = `temp_${Date.now()}`;
            appState.tempTables.push({ tempId, ...payload });
            this.linkedTableIds.push(tempId);
            this.selectedTableId = tempId;
            this.message = { text: 'Temporary table created.', isError: false };
        }
        updatePreviewFromForm();
    },
    deleteTable() {
        if (!this.selectedTableId) return;
        appState.tempTables = appState.tempTables.filter(t => t.tempId !== this.selectedTableId);
        this.linkedTableIds = this.linkedTableIds.filter(id => id !== this.selectedTableId);
        this.message = { text: 'Temporary table removed.', isError: false };
        this.startNewTable();
        updatePreviewFromForm();
    },
}));

// =================================================================
// 3. GLOBAL VARIABLES & DOM ELEMENT DEFINITIONS
// =================================================================
const promoDetailForm = document.getElementById('promoDetailForm');
const promoMessage = document.getElementById('promoMessage');
const createPromoButton = document.getElementById('createPromoButton');
const logoutButton = document.getElementById('logoutButton');
const promoTitleInput = document.getElementById('promoTitle');
const promoTypeInput = document.getElementById('promoType');
const promoDetailsInput = document.getElementById('promoDetails');
const promoBudgetInput = document.getElementById('promoBudget');
const promoBudgetTypeInput = document.getElementById('promoBudgetType');
const channelTagsInput = document.getElementById('channelTags');
const promoStartDateInput = document.getElementById('promoStartDate');
const promoEndDateInput = document.getElementById('promoEndDate');
const promoUpliftHLInput = document.getElementById('promoUpliftHL');
const promoUpliftMachineInput = document.getElementById('promoUpliftMachine');
const roiInput = document.getElementById('roi');
const promoIconDisplay = document.getElementById('promoIconDisplay');
const openIconPickerButton = document.getElementById('openIconPickerButton');
const iconPickerContainer = document.getElementById('iconPickerContainer');
const linkInput = document.getElementById('link');
const macoInput = document.getElementById('maco');
const fscreenCheckbox = document.getElementById('fscreen');
const statusSelect = document.getElementById('status');
const countryInput = document.getElementById('country');
const borderColorInput = document.getElementById('borderColor');
const bgColorInput = document.getElementById('bgColor');
const promoPreviewDiv = document.getElementById('promoPreview');

// New visual element definitions
const borderTextColorInput = document.getElementById('borderTextColor');
const titleTextColorInput = document.getElementById('TitleTextColor');
const dateTextColorInput = document.getElementById('dateTextColor');
const detailsTextColorInput = document.getElementById('detailsTextColor');

let emojiMartData = null;
let picker = null;

// =================================================================
// 4. APPLICATION LOGIC (HELPER FUNCTIONS)
// =================================================================

function displayMessage(message, isError = false) {
    if (promoMessage) {
        promoMessage.textContent = message;
        promoMessage.style.color = isError ? 'red' : 'green';
    }
}

/**
 * Gathers all data from the form fields.
 * @param {string} userName - The full name of the current user.
 * @returns {object} An object containing all promotion data.
 */
function getPromoDataFromForm(userName) {
    let buValue = '';
    const selectedCountry = countryInput.value;
    if (['Belgium', 'France', 'Luxembourg', 'Netherlands'].includes(selectedCountry)) buValue = 'BNFL';
    else if (['England', 'Northern Ireland'].includes(selectedCountry)) buValue = 'BU WEST';
    else if (['Switzerland', 'Italy', 'Czech Republic', 'Germany'].includes(selectedCountry)) buValue = 'BU CENTRAL';

    return {
        promo_title: promoTitleInput.value,
        promo_type: promoTypeInput.value,
        promo_details: stringToArray(promoDetailsInput.value),
        promo_budget: stringToNumberArray(promoBudgetInput.value),
        promo_budget_type: Array.from(promoBudgetTypeInput.selectedOptions).map(option => option.value),
        channel_tags: Array.from(channelTagsInput.selectedOptions).map(option => option.value),
        promo_start_date: promoStartDateInput.value || null,
        promo_end_date: promoEndDateInput.value || null,
        promo_uplift_HL: promoUpliftHLInput.value ? Number(promoUpliftHLInput.value) : null,
        promo_uplift_machine: promoUpliftMachineInput.value ? Number(promoUpliftMachineInput.value) : null,
        ROI: roiInput.value,
        icon: promoIconDisplay ? promoIconDisplay.textContent : '🎯',
        link: linkInput.value,
        table_name: [], // This will be populated after tables are saved
        MACO: macoInput.value ? Number(macoInput.value) : null,
        fscreen: fscreenCheckbox.checked,
        status: statusSelect.value,
        country: selectedCountry,
        BU: buValue,
        bordercolor: borderColorInput.value,
        bgcolor: stringToArray(bgColorInput.value),
        bordertextcolor: borderTextColorInput.value,
        titletextcolor: titleTextColorInput.value,
        datetextcolor: dateTextColorInput.value,
        detailtextcolor: detailsTextColorInput.value,
        // --- NEWLY ADDED FIELDS ---
        author: userName,
        owner: userName,
        creation_date: new Date().toISOString(),
    };
}

function updatePreviewFromForm() {
    if (!promoDetailForm) return;
    // Pass a dummy name for preview purposes, the real name will be used on save.
    const previewPromo = getPromoDataFromForm('Current User');
    renderPromoPreview(previewPromo);
}

function renderPromoPreview(promo) {
    if (!promoPreviewDiv) return;

    const formattedDate = formatDateRange(promo.promo_start_date, promo.promo_end_date);
    const hasBudget = Array.isArray(promo.promo_budget) && promo.promo_budget.length > 0 && promo.promo_budget.some(b => b > 0);
    const hasMACO = typeof promo.MACO === 'number' && promo.MACO > 0;
    const hasUpliftHL = typeof promo.promo_uplift_HL === 'number' && promo.promo_uplift_HL > 0;
    const hasUpliftMachine = typeof promo.promo_uplift_machine === 'number' && promo.promo_uplift_machine > 0;
    const hasROI = promo.ROI !== null && promo.ROI !== undefined && promo.ROI !== 0 && promo.ROI !== 'TBC' && promo.ROI !== 'undefined';

    const isFullScreen = promo.fscreen;
    const timelineContentClass = isFullScreen ? 'timeline-content full-width-content' : 'timeline-content';
    const iconContainerStyle = isFullScreen ? 'left: 96%; transform: translate(-50%, -50%);' : '';

    let inlineBgStyle = '';
    if (Array.isArray(promo.bgcolor) && promo.bgcolor.length >= 1) {
        const color1 = promo.bgcolor[0];
        const color2 = promo.bgcolor.length > 1 ? promo.bgcolor[1] : color1;
        inlineBgStyle = `background-image: linear-gradient(to bottom right, ${color1}, ${color2});`;
    } else if (typeof promo.bgcolor === 'string' && promo.bgcolor !== '') {
        inlineBgStyle = `background-color: ${promo.bgcolor};`;
    }

    let promoTypeStyle = '';
    let timelineContentBorderStyle = '';
    let timelineDotBorderStyle = '';

    if (promo.bordercolor && promo.bordercolor !== '') {
        timelineContentBorderStyle = `border-left: 4px solid ${promo.bordercolor};`;
        promoTypeStyle += `background-color: ${promo.bordercolor};`;
        timelineDotBorderStyle = `border: 3px solid ${promo.bordercolor};`;
    }

    if (promo.bordertextcolor && promo.bordertextcolor !== '') {
        promoTypeStyle += `color: ${promo.bordertextcolor};`;
    } else {
        promoTypeStyle += `color: white;`;
    }

    const combinedInlineContentStyle = `style="${inlineBgStyle} ${timelineContentBorderStyle}"`;
    const combinedPromoTypeStyle = `style="${promoTypeStyle}"`;
    const titleStyle = promo.titletextcolor ? `style="color: ${promo.titletextcolor};"` : '';
    const dateStyle = promo.datetextcolor ? `style="color: ${promo.datetextcolor};"` : '';
    const detailsStyle = promo.detailtextcolor ? `style="color: ${promo.detailtextcolor};"` : '';
    
    const dynamicTablesHTML = generateMultipleTablesHTML(promo.table_name);

    let previewHTML = `
        <div class="timeline">
            <div class="timeline-item">
                <div class="${timelineContentClass}" ${combinedInlineContentStyle}>
                    <div class="promo-type ${promo.promo_type ? promo.promo_type.toLowerCase().replace(/\s+/g, '-') : ''}" ${combinedPromoTypeStyle}>${promo.promo_type || 'N/A'}</div>
                    <div class="promo-title" ${titleStyle}>${promo.promo_title || 'New Promo'}</div>
                    <div class="promo-date" ${dateStyle}> ${formattedDate || 'No Date'} </div>
                    <div class="promo-details" ${detailsStyle}>
                        ${(promo.promo_details && promo.promo_details.map(line => `• ${line}<br>`).join("")) || 'No details.'}
                    </div>
                    <div class="channel-tags">
                        ${(promo.channel_tags && promo.channel_tags.map(ch => `<span class="channel-tag" style="${promoTypeStyle}">${ch}</span>`).join("")) || 'No channels.'}
                    </div>
                    ${dynamicTablesHTML}
                    ${(hasBudget || hasMACO || hasUpliftHL || hasUpliftMachine || hasROI) ? `
                        <h3 class="table-title" style="margin-top: 10px;">Budget Details / Financials</h3>
                        <table class="promo-table-budget" style="font-size: 0.8em; width: 100%;">
                            <thead>
                                <tr>
                                    <th>Budget</th><th>Budget Type</th><th>Uplift HL</th><th>Uplift Machine</th><th>ROI</th><th>MACO</th>
                                </tr>
                            </thead>
                            <tbody>
                            ${(promo.promo_budget && promo.promo_budget.length > 0) ? promo.promo_budget.map((budget, index) => {
                                const budgetType = (promo.promo_budget_type && promo.promo_budget_type[index]) || 'N/A';
                                const displayFinancials = index === 0;
                                return `
                                    <tr>
                                        <th>${budget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</th>
                                        <th><span class="channel-tag-budget">${budgetType}</span></th>
                                        ${displayFinancials ?
                                            `<th rowspan="${promo.promo_budget.length}">${promo.promo_uplift_HL || 0} HL</th>
                                            <th rowspan="${promo.promo_budget.length}">${promo.promo_uplift_machine || 0} Machines</th>
                                            <th rowspan="${promo.promo_budget.length}">${promo.ROI || 'TBC'}</th>
                                            <th rowspan="${promo.promo_budget.length}">${(promo.MACO || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</th>`
                                            : ''}
                                    </tr>
                                `;
                            }).join("") : `
                                <tr>
                                    <th>-</th><th>-</th>
                                    <th>${promo.promo_uplift_HL || 0} HL</th>
                                    <th>${promo.promo_uplift_machine || 0} Machines</th>
                                    <th>${promo.ROI || 'TBC'}</th>
                                    <th>${(promo.MACO || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</th>
                                </tr>`}
                            </tbody>
                        </table>` : ""}
                </div>
                <a href="${promo.link || '#'}" target="_blank" style="text-decoration: none;">
                    <div class="icon-container" style="${timelineDotBorderStyle}${iconContainerStyle}">
                        <div class="icon-emoji">${promo.icon || '❓'}</div>
                    </div>
                </a>
            </div>
        </div>
    `;
    promoPreviewDiv.innerHTML = previewHTML;
}

// =================================================================
// 5. MAIN PAGE INITIALIZATION & EVENT LISTENERS
// =================================================================
document.addEventListener('DOMContentLoaded', async () => {
    appState.tempTables = [];
    let currentUserFullName = 'System'; // Fallback name

    // Fetch the current user's full name from their profile
    try {
        const user = await getUser();
        if (user) {
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('first_name, last_name')
                .eq('id', user.id)
                .single();
            if (error) throw error;
            if (profile) {
                currentUserFullName = `${profile.first_name} ${profile.last_name}`.trim();
            }
        }
    } catch (error) {
        console.error("Could not fetch user's profile name:", error.message);
        displayMessage("Could not fetch user's profile name, 'System' will be used as author.", true);
    }

    if (promoDetailForm) {
        promoDetailForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            createPromoButton.disabled = true;
            displayMessage('Processing...', false);

            try {
                const finalTableIds = [];
                if (appState.tempTables.length > 0) {
                    displayMessage('Saving custom tables...', false);
                    for (const tempTable of appState.tempTables) {
                        const payload = { ...tempTable, tr: tempTable.tr.map(row => JSON.stringify(row)) };
                        const { data: newId, error } = await createPromoTableWithFunction(payload);
                        if (error) throw new Error(`Failed to save table "${tempTable.table_name}": ${error.message}`);
                        finalTableIds.push(newId);
                    }
                }

                displayMessage('Saving promotion...', false);
                // Pass the fetched user name when creating the promo data object
                const newPromoData = getPromoDataFromForm(currentUserFullName);
                newPromoData.table_name = finalTableIds;

                const { data: createdPromo, error: createPromoError } = await createPromo(newPromoData);
                if (createPromoError) throw createPromoError;

                displayMessage('Promotion created successfully! Redirecting...', false);
                setTimeout(() => {
                    window.location.href = `promo-detail.html?id=${createdPromo.id}`;
                }, 1500);

            } catch (error) {
                displayMessage(`Error: ${error.message}`, true);
                createPromoButton.disabled = false;
            }
        });

        promoDetailForm.addEventListener('input', updatePreviewFromForm);
        promoDetailForm.addEventListener('change', updatePreviewFromForm);
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await signOut();
            window.location.href = 'login.html';
        });
    }

    if (openIconPickerButton) {
        openIconPickerButton.addEventListener('click', async () => {
            if (!picker) {
                try {
                    if (!window.EmojiMart) {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/emoji-mart@latest/dist/browser.js';
                        document.head.appendChild(script);
                        await new Promise(resolve => script.onload = resolve);
                    }
                    if (!emojiMartData) {
                        const response = await fetch('https://cdn.jsdelivr.net/npm/@emoji-mart/data');
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        emojiMartData = await response.json();
                    }
                    picker = new window.EmojiMart.Picker({
                        data: emojiMartData,
                        onEmojiSelect: (emoji) => {
                            if (promoIconDisplay) promoIconDisplay.textContent = emoji.native;
                            if (iconPickerContainer) iconPickerContainer.style.display = 'none';
                            updatePreviewFromForm();
                        },
                        theme: 'light',
                    });
                    if (iconPickerContainer) iconPickerContainer.appendChild(picker);
                } catch (error) {
                    displayMessage('Failed to load emoji data. Picker may not work.', true);
                }
            }
            if (iconPickerContainer) {
                iconPickerContainer.style.display = iconPickerContainer.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    updatePreviewFromForm();
});

// =================================================================
// 6. START ALPINE
// =================================================================
window.Alpine = Alpine;
Alpine.start();
