// =================================================================
// 1. IMPORTS
// =================================================================
import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';
import { appState, setTableData } from './state.js';
import { supabase, signOut } from './supabaseAuth.js';
import {
    fetchPromoById,
    updatePromo,
    deletePromo,
    fetchAllTableData,
    createPromo,
    createPromoTableItem,
    updatePromoTableItem,
    deletePromoTableItem,
    createPromoTableWithFunction,
    fetchAllCatalogData
} from './supabaseClient.js';
import { showToast } from './shared/toast.js';
import { stringToArray, stringToNumberArray, arrayToString, formatDateRange } from './utils.js';
import { getTableDataById, generateMultipleTablesHTML } from './renderers.js';


// =================================================================
// 2. VARIABLES & DOM ELEMENT DEFINITIONS
// =================================================================


let currentPromoId = null;
let editMode = false;
let emojiMartData = null;
let picker = null;
let catalog = { brands: [], subBrands: [], products: [] };

const formTitle = document.getElementById('formTitle');
const saveSubmitButton = document.getElementById('saveSubmitButton');
const promoForm = document.getElementById('promoForm');
const promoIdDisplay = document.getElementById('promoIdDisplay');
const deletePromoButton = document.getElementById('deletePromoButton');
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
const borderTextColorInput = document.getElementById('borderTextColor');
const titleTextColorInput = document.getElementById('TitleTextColor');
const dateTextColorInput = document.getElementById('dateTextColor');
const detailsTextColorInput = document.getElementById('detailsTextColor');
const promoBrandsSelect = document.getElementById('promoBrands');
const promoSubBrandsSelect = document.getElementById('promoSubBrands');
const promoProductsSelect = document.getElementById('promoProducts');

// --- 3.2. HELPER FUNCTIONS (Defined within the main scope) ---

function populateSelect(selectElement, items, selectedIds = []) {
    const safeSelectedIds = selectedIds || [];
    selectElement.innerHTML = '';
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        if (safeSelectedIds.includes(item.id)) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

function updateProductSelect(promo = {}) {
    const selectedSubBrandIds = Array.from(promoSubBrandsSelect.selectedOptions).map(opt => parseInt(opt.value));
    const availableProducts = catalog.products.filter(p => selectedSubBrandIds.includes(p.sub_brand_id));
    populateSelect(promoProductsSelect, availableProducts, promo.product_ids);
}

function updateSubBrandSelect(promo = {}) {
    const selectedBrandIds = Array.from(promoBrandsSelect.selectedOptions).map(opt => parseInt(opt.value));
    const availableSubBrands = catalog.subBrands.filter(sb => selectedBrandIds.includes(sb.brand_id));
    populateSelect(promoSubBrandsSelect, availableSubBrands, promo.sub_brand_ids);
    updateProductSelect(promo);
}

function populateForm(promo = {}) {
    promoTitleInput.value = promo.promo_title || '';
    promoTypeInput.value = promo.promo_type || '';
    promoDetailsInput.value = arrayToString(promo.promo_details);
    promoBudgetInput.value = arrayToString(promo.promo_budget);
    Array.from(promoBudgetTypeInput.options).forEach(option => option.selected = (promo.promo_budget_type || []).includes(option.value));
    Array.from(channelTagsInput.options).forEach(option => option.selected = (promo.channel_tags || []).includes(option.value));
    promoStartDateInput.value = promo.promo_start_date || '';
    promoEndDateInput.value = promo.promo_end_date || '';
    promoUpliftHLInput.value = promo.promo_uplift_HL || '';
    promoUpliftMachineInput.value = promo.promo_uplift_machine || '';
    roiInput.value = promo.ROI || '';
    if (promoIconDisplay) promoIconDisplay.textContent = promo.icon || '🎯';
    linkInput.value = promo.link || '';
    if (tableNameInput) tableNameInput.value = arrayToString(promo.table_name);
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
    if (userIdInput) userIdInput.value = promo.user_id || '';
    borderTextColorInput.value = promo.bordertextcolor || '';
    titleTextColorInput.value = promo.titletextcolor || '';
    dateTextColorInput.value = promo.datetextcolor || '';
    detailsTextColorInput.value = promo.detailtextcolor || '';

    populateSelect(promoBrandsSelect, catalog.brands, promo.brand_ids);
    updateSubBrandSelect(promo);
}

function getPromoDataFromForm(userName) {
    let BU_final = buInput.value;
    if (['Belgium', 'France', 'Luxembourg', 'Netherlands'].includes(countryInput.value)) BU_final = 'BNFL';
    else if (['England', 'Northern Ireland'].includes(countryInput.value)) BU_final = 'BU WEST';
    else if (['Switzerland', 'Italy', 'Czech Republic', 'Germany'].includes(countryInput.value)) BU_final = 'BU CENTRAL';

    const data = {
        promo_title: promoTitleInput.value,
        promo_type: promoTypeInput.value,
        promo_details: stringToArray(promoDetailsInput.value),
        promo_budget: stringToNumberArray(promoBudgetInput.value),
        promo_budget_type: Array.from(promoBudgetTypeInput.selectedOptions).map(option => option.value),
        channel_tags: Array.from(channelTagsInput.selectedOptions).map(option => option.value),
        promo_start_date: promoStartDateInput.value || null,
        promo_end_date: promoEndDateInput.value || null,
        promo_uplift_HL: Number(promoUpliftHLInput.value) || 0,
        promo_uplift_machine: Number(promoUpliftMachineInput.value) || 0,
        ROI: Number(roiInput.value) || 0,
        MACO: Number(macoInput.value) || 0,
        icon: promoIconDisplay ? promoIconDisplay.textContent : '🎯',
        link: linkInput.value,
        table_name: tableNameInput ? stringToNumberArray(tableNameInput.value) : [],
        fscreen: fscreenCheckbox.checked,
        status: statusSelect.value,
        country: countryInput.value,
        BU: BU_final,
        bordercolor: borderColorInput.value,
        bgcolor: stringToArray(bgColorInput.value),
        bordertextcolor: borderTextColorInput.value,
        titletextcolor: titleTextColorInput.value,
        datetextcolor: dateTextColorInput.value,
        detailtextcolor: detailsTextColorInput.value,
        brand_ids: Array.from(promoBrandsSelect.selectedOptions).map(opt => parseInt(opt.value)),
        sub_brand_ids: Array.from(promoSubBrandsSelect.selectedOptions).map(opt => parseInt(opt.value)),
        product_ids: Array.from(promoProductsSelect.selectedOptions).map(opt => parseInt(opt.value)),
    };

    if (!editMode && userName) {
        data.author = userName;
        data.owner = userName;
        data.creation_date = new Date().toISOString().split('T')[0];
    }

    return data;
}

function updatePreviewFromForm() {
    if (!promoForm) return;
    const previewPromo = getPromoDataFromForm('Current User');
    renderPromoPreview(previewPromo);
}

function renderPromoPreview(promo) {
    if (!promoPreviewDiv) return;

    const brandTagsHTML = (promo.brand_ids || [])
        .map(brandId => {
            const brand = catalog.brands.find(b => b.id === brandId);
            if (!brand || !brand.logo_medium_url) return '';
            return `<div class="brand-tag"><img src="${brand.logo_medium_url}" alt="${brand.name} Logo"></div>`;
        })
        .join('');

    const formattedDate = formatDateRange(promo.promo_start_date, promo.promo_end_date);
    const hasBudget = Array.isArray(promo.promo_budget) && promo.promo_budget.length > 0 && promo.promo_budget.some(b => b > 0);
    const hasMACO = typeof promo.MACO === 'number' && promo.MACO > 0;
    const hasUpliftHL = typeof promo.promo_uplift_HL === 'number' && promo.promo_uplift_HL > 0;
    const hasUpliftMachine = typeof promo.promo_uplift_machine === 'number' && promo.promo_uplift_machine > 0;
    const hasROI = promo.ROI !== null && promo.ROI !== undefined && promo.ROI !== 0 && promo.ROI !== 'TBC' && promo.ROI !== 'undefined';

    const isFullScreen = promo.fscreen;
    const timelineContentClass = isFullScreen ? 'timeline-content full-width-content' : 'timeline-content';
    const iconContainerStyle = isFullScreen ? 'left: 96%; transform: translate(-50%, -50%);' : '';

    // --- Styling Logic ---
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
        promoTypeStyle = `background-color: ${promo.bordercolor};`;
        timelineDotBorderStyle = `border: 3px solid ${promo.bordercolor};`;
    }

    // Add text color for the promo type badge
    if (promo.bordertextcolor && promo.bordertextcolor !== '') {
        promoTypeStyle += `color: ${promo.bordertextcolor};`;
    } else {
        promoTypeStyle += `color: white;`; // Default to white if not specified
    }

    const combinedInlineContentStyle = `style="${inlineBgStyle} ${timelineContentBorderStyle}"`;
    const combinedPromoTypeStyle = `style="${promoTypeStyle}"`;

    // Styles for other text elements
    const titleStyle = promo.titletextcolor ? `style="color: ${promo.titletextcolor};"` : '';
    const dateStyle = promo.datetextcolor ? `style="color: ${promo.datetextcolor};"` : '';
    const detailsStyle = promo.detailtextcolor ? `style="color: ${promo.detailtextcolor};"` : '';

    const tableIdsForRendering = (promo.table_name && promo.table_name.length > 0)
        ? promo.table_name.map(String)
        : 'none';

    console.log(tableIdsForRendering);
    // --- Dynamic Table Loading ---
    const dynamicTablesHTML = generateMultipleTablesHTML(tableIdsForRendering);

    promoPreviewDiv.innerHTML = `
        <div class="timeline">
            <div class="timeline-item">
                <div class="${timelineContentClass}" ${combinedInlineContentStyle}>
                    <div class="brand-tag-container">${brandTagsHTML}</div>
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
                            <thead ${combinedPromoTypeStyle}>
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
                    <div class="icon-container" style="${timelineDotBorderStyle}${iconContainerStyle}">
                        <div class="icon-emoji">${promo.icon || '❓'}</div>
                    </div>
                </a>
            </div>
        </div>
    `;

}

// =================================================================
// 3. ALPINE COMPONENT DEFINITION
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
    focusedCell: { row: null, col: null },

    openModal() {
        this.linkedTableIds = stringToNumberArray(document.getElementById('tableName').value);
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
        this.editor.headers = [];
        this.editor.rows = [];
        this.message.text = 'Ready to create a new table.';
        this.message.isError = false;
    },
    loadTableForEditing(tableId) {
        const tableData = getTableDataById(tableId);
        if (!tableData) {
            this.message = { text: `Error: Table with ID ${tableId} not found.`, isError: true };
            return;
        }
        this.selectedTableId = tableId;
        this.editor.tableName = tableData.table_name || '';
        this.editor.tableStyle = tableData.style || 'blackTable';
        this.editor.headers = [...(tableData.th || [])];
        this.editor.rows = tableData.tr.map(rowStr => {
            try {
                const parsedRow = JSON.parse(rowStr);
                return Array.isArray(parsedRow) ? parsedRow : [parsedRow];
            } catch (e) {
                console.warn('Could not parse row data, treating as raw string:', rowStr);
                return [rowStr];
            }
        });
        this.message = { text: `Editing Table ID: ${tableId}`, isError: false };
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

    triggerImageUpload() {
        if (this.focusedCell.row === null || this.focusedCell.col === null) {
            showToast('Please click on a cell in the table first!', 'error');
            return;
        }
        document.getElementById('cellImageUpload').click();
    },

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (this.focusedCell.row === null || this.focusedCell.col === null) {
            showToast('Error: No cell was selected for the image.', 'error');
            return;
        }

        showToast('Compressing and uploading image...', 'info');

        // Compression options, same as catalog page
        const options = {
            maxSizeMB: 0.4,
            maxWidthOrHeight: 1024,
            useWebWorker: true,
        };

        try {
            // 1. Compress the file
            const compressedFile = await imageCompression(file, options);

            // 2. Define a unique path for the image in Supabase Storage
            const filePath = `public/table-images/${Date.now()}-${compressedFile.name}`;

            // 3. Upload the compressed file
            const { error: uploadError } = await supabase.storage
                .from('promo-assets') // Ensure this bucket exists and has public access
                .upload(filePath, compressedFile);

            if (uploadError) throw uploadError;

            // 4. Get the public URL of the uploaded image
            const { data: urlData } = supabase.storage
                .from('promo-assets')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;

            // 5. Create the HTML for the image and update the editor's data
            const imageHtml = `<img src="${publicUrl}" alt="User uploaded content">`;
            this.editor.rows[this.focusedCell.row][this.focusedCell.col] = imageHtml;

            showToast('Image inserted successfully!', 'success');

        } catch (error) {
            console.error('Image upload failed:', error);
            showToast(`Error uploading image: ${error.message}`, 'error');
        } finally {
            // Clear the file input so the user can upload the same file again if needed
            event.target.value = '';
        }
    },
    async deleteTable() {
        if (!this.selectedTableId) {
            this.message = { text: 'No table selected to delete.', isError: true };
            return;
        }

        if (!confirm(`Are you sure you want to permanently delete Table ID: ${this.selectedTableId}? This cannot be undone.`)) {
            return;
        }

        this.message = { text: 'Deleting...', isError: false };
        const tableIdToDelete = this.selectedTableId;

        try {
            // 1. Unlink the table from the current promotion
            const tableNameInput = document.getElementById('tableName');
            const updatedTableIds = this.linkedTableIds.filter(id => id !== tableIdToDelete);
            const { error: unlinkError } = await updatePromo(currentPromoId, { table_name: updatedTableIds });
            if (unlinkError) throw unlinkError;

            // 2. Delete the table itself from the database
            const { error: deleteError } = await deletePromoTableItem(tableIdToDelete);
            if (deleteError) throw deleteError;

            // 3. Update local state to reflect the deletion
            this.linkedTableIds = updatedTableIds;
            tableNameInput.value = arrayToString(updatedTableIds);
            appState.allTableData = appState.allTableData.filter(t => t.id !== tableIdToDelete);

            this.message = { text: `Table ${tableIdToDelete} was deleted and unlinked.`, isError: false };
            this.startNewTable(); // Reset the editor to the "Create New" state

        } catch (error) {
            this.message = { text: `Error deleting table: ${error.message}`, isError: true };
        }

        // Refresh the main form preview
        updatePreviewFromForm();
    },
    async saveTable() {
        this.message = { text: 'Saving...', isError: false };
        const payload = {
            table_name: this.editor.tableName,
            style: this.editor.tableStyle,
            th: this.editor.headers,
            tr: this.editor.rows.map(row => JSON.stringify(row)),
        };

        try {
            const tableNameInput = document.getElementById('tableName');
            if (this.selectedTableId) {
                const { error: updateError } = await updatePromoTableItem(this.selectedTableId, payload);
                if (updateError) throw updateError;

                // 2. Update the local appState for instant preview refresh
                const tableIndex = appState.allTableData.findIndex(t => t.id == this.selectedTableId);
                if (tableIndex !== -1) {
                    // Merge the existing ID and creation date with the new payload
                    appState.allTableData[tableIndex] = { ...appState.allTableData[tableIndex], ...payload };
                }

                this.message = { text: `Table ID: ${this.selectedTableId} updated successfully!`, isError: false };
            } else {
                // --- CREATE LOGIC (This part is updated) ---
                const { data: newId, error: createTableError } = await createPromoTableWithFunction(payload);
                if (createTableError) throw createTableError;

                const existingTableIds = stringToNumberArray(tableNameInput.value);
                if (!existingTableIds.includes(newId)) existingTableIds.push(newId);

                const { error: linkTableError } = await updatePromo(currentPromoId, { table_name: existingTableIds });
                if (linkTableError) throw linkTableError;

                // --- THIS IS THE FIX ---
                // Create a complete table object and add it to the local appState
                // so the preview can find it immediately.
                const { data: { user } } = await supabase.auth.getUser();
                const newTableForState = {
                    id: newId,
                    created_at: new Date().toISOString(),
                    user_id: user.id,
                    ...payload
                };
                appState.allTableData.push(newTableForState);

                this.selectedTableId = newId;
                this.linkedTableIds = existingTableIds;
                tableNameInput.value = arrayToString(existingTableIds);
                this.message = { text: `New table (ID: ${newId}) created and linked!`, isError: false };

            }
        } catch (error) {
            this.message = { text: `Error: ${error.message}`, isError: true };
        }
        updatePreviewFromForm();
    },
}));

// =================================================================
// 4. MAIN INITIALIZATION FUNCTION
// =================================================================
async function initializeApp() {

    try {
        const { data: rawTableData, error: tableError } = await fetchAllTableData();
        if (tableError) throw tableError;
        // The processDisplayTables function is not available here,
        // but the raw data structure is often sufficient for the lookup.
        // If processing is needed, you'll need to import and use it.
        setTableData(rawTableData);
        console.log('All table data loaded into state for preview.', appState.allTableData);
    } catch (error) {
        showToast(`Could not load table data for previews: ${error.message}`, 'error');
    }

    const urlParams = new URLSearchParams(window.location.search);
    currentPromoId = urlParams.get('id');
    editMode = !!currentPromoId;

    if (editMode) {
        formTitle.textContent = 'Edit Promotion';
        saveSubmitButton.textContent = 'Save Changes';
        deletePromoButton.style.display = 'inline-block';
        promoIdDisplay.textContent = `Editing Promotion ID: ${currentPromoId}`;
    } else {
        formTitle.textContent = 'Create New Promotion';
        saveSubmitButton.textContent = 'Create Promotion';
        // --- THIS IS THE FIX ---
        document.querySelector('.table-section').style.display = 'none';
    }

    promoForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        saveSubmitButton.disabled = true;

        const { data: { user } } = await supabase.auth.getUser();
        const userName = user ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`.trim() : 'System';

        const promoData = getPromoDataFromForm(userName);

        if (editMode) {
            showToast('Saving changes...', 'info');
            const { error } = await updatePromo(currentPromoId, promoData);
            if (error) {
                showToast(`Update failed: ${error.message}`, 'error');
            } else {
                showToast('Promotion updated successfully!', 'success');
            }
        } else {
            showToast('Creating promotion...', 'info');
            try {
                // Since tables are disabled in create mode, we no longer need to handle temp tables here.
                const { data: newPromo, error } = await createPromo(promoData);
                if (error) throw error;

                showToast('Promotion created! Redirecting to edit page...', 'success');
                setTimeout(() => {
                    window.location.href = `promo-form.html?id=${newPromo.id}`;
                }, 1500);
            } catch (error) {
                showToast(`Creation failed: ${error.message}`, 'error');
            }
        }
        saveSubmitButton.disabled = false;
    });

    try {
        const { data, error } = await fetchAllCatalogData();
        if (error) throw error;
        catalog = data;

        if (editMode) {
            const promoRes = await fetchPromoById(currentPromoId);
            if (promoRes.error || !promoRes.data) throw new Error('Promotion not found or you do not have access.');
            populateForm(promoRes.data);
        } else {
            populateForm({});
        }

        promoBrandsSelect.addEventListener('change', () => updateSubBrandSelect(getPromoDataFromForm()));
        promoSubBrandsSelect.addEventListener('change', () => updateProductSelect(getPromoDataFromForm()));

        updatePreviewFromForm();

    } catch (error) {
        showToast(error.message, 'error');
    }

    if (deletePromoButton) {
        deletePromoButton.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete this promotion?')) return;
            deletePromoButton.disabled = true;
            showToast('Deleting promotion...', 'info');
            try {
                const { error } = await deletePromo(currentPromoId);
                if (error) throw error;
                showToast('Promotion deleted successfully! Redirecting...', 'success');
                setTimeout(() => { window.location.href = 'profile.html'; }, 1500);
            } catch (error) {
                showToast(`Failed to delete promotion: ${error.message}`, 'error');
            } finally {
                deletePromoButton.disabled = false;
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await signOut();
            window.location.href = 'login.html';
        });
    }

    // --- Emoji Mart Setup ---
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
                    showToast('Failed to load emoji data. Picker may not work.', 'error');
                }
            }
            if (iconPickerContainer) {
                iconPickerContainer.style.display = iconPickerContainer.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    promoForm.addEventListener('input', updatePreviewFromForm);
    promoForm.addEventListener('change', updatePreviewFromForm);
}
// =================================================================
// 5. START ALPINE
// =================================================================
document.addEventListener('DOMContentLoaded', initializeApp);
window.Alpine = Alpine;
Alpine.start();