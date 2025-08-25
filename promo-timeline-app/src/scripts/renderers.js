import { appState } from './state.js';
import { formatDateRange, downloadTableAsCSV } from './utils.js';
import { getSavedFilters } from './shared/filterModal.js';

export function getTableDataById(tableId) {
    return appState.allTableData.find(table => String(table.id) === String(tableId));
}

export function generateTableHTML(tableObj) {
    if (!tableObj) return '';

    const tableTitle = tableObj.table_name || '';
    const tableHeaders = tableObj.th || [];
    const tableRows = tableObj.tr || [];

    console.log(tableObj)

    return `
        <div class="table-container ${tableObj.style}">
            <h3 class="table-title">${tableTitle}</h3>
            <table class="promo-table${tableObj.style}">
                <thead>
                    <tr>
                        ${tableHeaders.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>

                    ${tableRows.map(rowContent => {
        // --- THIS IS THE FIX ---
        // The database stores rows as an array of strings. We need to parse
        // each cell's content, which might be a stringified array itself.
        let rowArray;
        try {
            // Attempt to parse the row, which might be a JSON string like '["<img...>", "text"]'
            rowArray = JSON.parse(rowContent);
        } catch (e) {
            // If it's not valid JSON, treat it as a single-column row
            rowArray = [rowContent];
        }
        if (!Array.isArray(rowArray)) rowArray = [rowArray];

        const cellsHTML = rowArray.map(cell => `<td>${cell}</td>`).join('');
        return `<tr>${cellsHTML}</tr>`;
    }).join('')}

                </tbody>
            </table>
        </div>
    `;
}

export function generateMultipleTablesHTML(tableIds) {

    if (!tableIds || (Array.isArray(tableIds) && tableIds.length === 0) || tableIds === 'none') return '';
    const tableIdArray = Array.isArray(tableIds) ? tableIds : [tableIds];

    return tableIdArray
        .map(tableId => {
            const tableObj = getTableDataById(tableId);
            return generateTableHTML(tableObj);
        })
        .filter(html => html !== '')
        .join('');
}

// ------------------------------------------------------------------------------------------------------------------------

/**
 * Renders the timeline view into the DOM.
 */
export function renderTimeline() {
    const root = document.getElementById('timeline-root');
    if (!root) {
        return;
    }

    let lastMonthMarker = '';
    let lastYearMarker = '';

    

    root.innerHTML = `
    <div class="timeline-container">
      <div class="timeline">
        ${appState.allTimelineItems.map((item, index) => { // Loop starts here
        const startDate = new Date(item.promo_start_date);
        const formattedDate = formatDateRange(item.promo_start_date, item.promo_end_date);

        const specialDate = item.promo_type === "Loyalty Program"
            ? new Date(item.promo_end_date)
            : new Date(item.promo_start_date);

        const monthMarker = specialDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
        const showMonthMarker = monthMarker !== lastMonthMarker;
        lastMonthMarker = monthMarker;

        const brandTagsHTML = (item.brand_ids || [])
            .map(brandId => {
                // Find the full brand object from our global state
                const brand = appState.catalogData.brands.find(b => b.id === brandId);
                if (!brand || !brand.logo_medium_url) return '';
                return `
                    <div class="brand-tag">
                        <img src="${brand.logo_medium_url}" alt="${brand.name} Logo">
                    </div>
                `;
            })
            .join('');

        const yearMarker = String(startDate.getFullYear());
        const showYearMarker = yearMarker !== lastYearMarker;
        lastYearMarker = yearMarker;

        console.log(item);
        const tablesHTML = generateMultipleTablesHTML(item.table);
        


        const hasBudget = Array.isArray(item.promo_budget) && item.promo_budget.length > 0 && item.promo_budget.some(b => b > 0);
        const hasMACO = typeof item.MACO === 'number' && item.MACO > 0;
        const hasUpliftHL = typeof item.promo_uplift_HL === 'number' && item.promo_uplift_HL > 0;
        const hasUpliftMachine = typeof item.promo_uplift_machine === 'number' && item.promo_uplift_machine > 0;
        const hasROI = item.ROI !== null && item.ROI !== undefined && item.ROI !== 0 && item.ROI !== 'TBC' && item.ROI !== 'undefined';

        const isFullScreen = item.fscreen;
        const timelineContentClass = isFullScreen ? 'timeline-content full-width-content' : 'timeline-content';
        const iconContainerStyle = isFullScreen ? 'left: 96%; transform: translate(-50%, -50%);' : '';

        let inlineBgStyle = '';
        if (Array.isArray(item.bgcolor) && item.bgcolor.length >= 1) {
            const color1 = item.bgcolor[0];
            const color2 = item.bgcolor.length > 1 ? item.bgcolor[1] : color1;
            inlineBgStyle = `background-image: linear-gradient(to bottom right, ${color1}, ${color2});`;
        } else if (typeof item.bgcolor === 'string' && item.bgcolor !== '') {
            inlineBgStyle = `background-color: ${item.bgcolor};`;
        }

        let timelineContentBorderStyle = '';
        let promoTypeStyle = '';
        let timelineDotBorderStyle = '';


        if (item.bordercolor && item.bordercolor !== '') {
            const isEven = (index + 1) % 2 === 0;
            if (isEven) {
                // Apply border-right for even items
                timelineContentBorderStyle = `border-left: 4px solid ${item.bordercolor};`;
            } else {
                // Apply border-left for odd items
                timelineContentBorderStyle = `border-right: 4px solid ${item.bordercolor};`;
            }

            promoTypeStyle = `background-color: ${item.bordercolor};`;
            timelineDotBorderStyle = `border: 3px solid ${item.bordercolor};`;
        }

        // Add text color for the promo type badge
        if (item.bordertextcolor && item.bordertextcolor !== '') {
            promoTypeStyle += `color: ${item.bordertextcolor};`;
        } else {
            promoTypeStyle += `color: white;`; // Default to white if not specified
        }

        const combinedInlineContentStyle = `style="${inlineBgStyle} ${timelineContentBorderStyle}"`;
        const combinedPromoTypeStyle = `style="${promoTypeStyle}"`;

        // Styles for other text elements
        const titleStyle = item.titletextcolor ? `style="color: ${item.titletextcolor};"` : '';
        const dateStyle = item.datetextcolor ? `style="color: ${item.datetextcolor};"` : '';
        const detailsStyle = item.detailtextcolor ? `style="color: ${item.detailtextcolor};"` : '';

        const editLink = document.createElement('a');
        editLink.href = `promo-form.html?id=${item.id}`;
        editLink.textContent = '🖊️';

        return `
                    ${showYearMarker ? `<div class="year-marker">${yearMarker}</div>` : ""}
                  <div class="timeline-item">
                      ${showMonthMarker ? `<div class="month-marker">${monthMarker}</div>` : ""}
                    
                    <div class="${timelineContentClass}" ${combinedInlineContentStyle}>
                    <div class="brand-tag-container">${brandTagsHTML}</div>
                    
                    <a href="${editLink}">
                        <div>
                            <div class="promo-type ${item.promo_type.toLowerCase().replace(/\s+/g, '-')}" ${combinedPromoTypeStyle}>${item.promo_type}</div>
                        </div>
                    </a>
                    <div class="promo-title" ${titleStyle}>${item.promo_title || 'New Promo'}</div>
                    <div class="promo-date" ${dateStyle}> ${formattedDate || 'No Date'} </div>
                    <div class="promo-details" ${detailsStyle}>
                        ${item.promo_details.map(line => `• ${line}<br>`).join("")}
                      </div>
                      <div class="channel-tags" >
                        ${item.channel_tags.map(ch => `<span class="channel-tag" style="${promoTypeStyle} ">${ch}</span>`).join("")}
                      </div>

                      ${tablesHTML}

                      ${(hasBudget || hasMACO || hasUpliftHL || hasUpliftMachine || hasROI) ? `
                        <h3 class="table-title">Budget Details / Financials</h3>
                        <table class="promo-table-budget">
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
                            ${item.promo_budget.map((budget, index) => {
            const budgetType = item.promo_budget_type[index] || 'N/A';
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
                    `<th rowspan="${item.promo_budget.length}">${item.promo_uplift_HL || 0} HL</th>
                                            <th rowspan="${item.promo_budget.length}">${item.promo_uplift_machine || 0} Machines</th>
                                            <th rowspan="${item.promo_budget.length}">${item.ROI || 'TBC'}</th>
                                            <th rowspan="${item.promo_budget.length}">${(item.MACO || 0).toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    })}</th>`
                    : ''}
                                    </tr>
                                `;
        }).join("")}
                            ${item.promo_budget.length === 0 && (hasMACO || hasUpliftHL || hasUpliftMachine || hasROI) ?
                    `<tr>
                                    <th>-</th>
                                    <th><span class="channel-tag-budget">-</span></th>
                                    <th>${item.promo_uplift_HL || 0} HL</th>
                                    <th>${item.promo_uplift_machine || 0} Machines</th>
                                    <th>${item.ROI || 'TBC'}</th>
                                    <th>${(item.MACO || 0).toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    })}</th>
                                </tr>` : ''}
                            </tbody>
                        </table>` : ""}

        
                      </div>
                    <a href="${item.link}" target="_blank">
                      <div class="icon-container" style="${timelineDotBorderStyle} ${iconContainerStyle}">
                        <div class="icon-emoji">${item.icon}</div>
                      </div>
                      <div class="timeline-dot" style="${timelineDotBorderStyle} ${iconContainerStyle}"></div>
                    </a>
                  </div>
                `;
    }).join("")}
      </div>
    </div>
  `;
}


// ------------------------------------------------------------------------------------------------------------------------



















export function renderTablesHomePage() {
    const standardContainer = document.getElementById('standard-reports-container');
    const interactiveContainer = document.getElementById('interactive-pivot-container');
    const reportSwitcher = document.getElementById('reportTypeSwitcher');
    const calendarSwitcher = document.getElementById('viewSwitcher');

    if (!standardContainer || !interactiveContainer || !reportSwitcher) {
        console.error("Error: renderers.js cannot find the required containers in CommandBoard.html. Ensure IDs like 'standard-reports-container' exist.");
        return;
    }

    function updateView() {
        const selectedView = document.querySelector('input[name="reportType"]:checked').value;
        console.log(selectedView)
        if (selectedView === 'standard') {
            standardContainer.classList.remove('hidden-view');
            interactiveContainer.classList.add('hidden-view');
            renderStandardReports();
        } else {
            standardContainer.classList.add('hidden-view');
            interactiveContainer.classList.remove('hidden-view');
            renderInteractivePivot();
        }
    }

    reportSwitcher.addEventListener('change', updateView);
    calendarSwitcher.addEventListener('change', renderStandardReports);
    updateView();
}


// =================================================================
// VIEW 1: STANDARD REPORTS (Icons, Budget, Uplift)
// =================================================================

function renderStandardReports() {
    const root = document.getElementById('standard-reports-root');
    if (!root) return;

    const view = document.querySelector('input[name="calendarView"]:checked')?.value || 'monthly';
    const filters = getSavedFilters();

    if (appState.allTimelineItems.length === 0) {
        root.innerHTML = '<h1>No promotions found for the selected filters.</h1>';
        return;
    }

    const allChannels = new Set();
    const allBudgetTypesSet = new Set();
    appState.allTimelineItems.forEach(item => {
        (item.channel_tags || []).forEach(channel => allChannels.add(channel));
        if (Array.isArray(item.promo_budget_type)) {
            item.promo_budget_type.forEach(type => allBudgetTypesSet.add(type));
        }
    });
    allBudgetTypesSet.add("Loyalty Program");
    const uniqueBudgetTypes = Array.from(allBudgetTypesSet).sort();
    const uniqueChannels = Array.from(allChannels).sort();
    const allYearsInFilteredData = [...new Set(appState.allTimelineItems.map(item => String(new Date(item.promo_start_date).getFullYear())))].sort();
    const yearsToRender = (filters.year && filters.year.length > 0) ? filters.year.sort() : allYearsInFilteredData;
    const timeColumns = getTimeColumns(view, yearsToRender);

    const iconsData = {};
    const budgetData = {};
    const upliftData = { HL: {}, machines: {}, MACO: {} };
    uniqueChannels.forEach(ch => iconsData[ch] = {});
    uniqueBudgetTypes.forEach(bt => budgetData[bt] = {});
    Object.keys(upliftData).forEach(metric => { timeColumns.forEach(col => { upliftData[metric][col.key] = 0; }); });
    appState.allTimelineItems.forEach(item => {
        const startDate = new Date(item.promo_start_date);
        const endDate = new Date(item.promo_end_date);
        const attributionDate = item.promo_type === "Loyalty Program" ? endDate : startDate;
        const year = String(attributionDate.getFullYear());
        let financialKey;
        if (view === 'monthly') financialKey = `${year}-${String(attributionDate.getMonth() + 1).padStart(2, '0')}`;
        else if (view === 'weekly') financialKey = `${year}-W${String(getWeek(attributionDate)).padStart(2, '0')}`;
        else financialKey = `${year}-${String(attributionDate.getMonth() + 1).padStart(2, '0')}-${String(attributionDate.getDate()).padStart(2, '0')}`;
        if (timeColumns.some(c => c.key === financialKey)) {
            upliftData.HL[financialKey] = (upliftData.HL[financialKey] || 0) + (item.promo_uplift_HL || 0);
            upliftData.machines[financialKey] = (upliftData.machines[financialKey] || 0) + (item.promo_uplift_machine || 0);
            upliftData.MACO[financialKey] = (upliftData.MACO[financialKey] || 0) + (item.MACO || 0);
            if (item.promo_type === "Loyalty Program") {
                const budgetVal = (item.promo_budget && item.promo_budget.length > 0) ? item.promo_budget[0] : 0;
                if (!budgetData["Loyalty Program"]) budgetData["Loyalty Program"] = {};
                budgetData["Loyalty Program"][financialKey] = (budgetData["Loyalty Program"][financialKey] || 0) + budgetVal;
            } else if (Array.isArray(item.promo_budget_type)) {
                (item.promo_budget || []).forEach((val, i) => {
                    const type = item.promo_budget_type[i];
                    if (!budgetData[type]) budgetData[type] = {};
                    budgetData[type][financialKey] = (budgetData[type][financialKey] || 0) + (val || 0);
                });
            }
        }
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const currentYear = String(currentDate.getFullYear());
            let iconKey;
            if (view === 'monthly') iconKey = `${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            else if (view === 'weekly') iconKey = `${currentYear}-W${String(getWeek(currentDate)).padStart(2, '0')}`;
            else iconKey = `${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            if (timeColumns.some(c => c.key === iconKey)) {
                (item.channel_tags || []).forEach(channel => {
                    if (!iconsData[channel][iconKey]) iconsData[channel][iconKey] = new Set();
                    iconsData[channel][iconKey].add(item.icon);
                });
            }
            if (view === 'monthly') {
                currentDate.setMonth(currentDate.getMonth() + 1);
            } else {
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
    });

    const formatCurrency = (value) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const formatNumber = (value) => value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const generateYearlyRows = (year, titles, dataAccessor, isCurrency = false, isIcon = false) => {
        let yearHTML = '';
        const yearColumns = timeColumns.filter(c => c.year === year);
        if (yearsToRender.length > 1) {
            const colspan = isIcon ? yearColumns.length + 1 : yearColumns.length + 2;
            yearHTML += `<tr class="year-marker-row"><td colspan="${colspan}" class="year-marker-cell">${year}</td></tr>`;
        }
        titles.forEach(title => {
            let total = 0;
            const data = dataAccessor(title);
            const cells = yearColumns.map(col => {
                const value = data[col.key] || (isIcon ? new Set() : 0);
                if (!isIcon) total += value;
                let displayValue = '-';
                if (isIcon) {
                    displayValue = value.size > 0 ? Array.from(value).join('') : '-';
                } else if (value) {
                    displayValue = isCurrency ? formatCurrency(value) : formatNumber(value);
                }
                return `<td class="${value && (isIcon ? value.size > 0 : value) ? (isIcon ? 'icon-cell' : 'data-cell') : 'empty-cell'}">${displayValue}</td>`;
            }).join('');
            const totalCell = isIcon ? '' : `<td>${isCurrency ? formatCurrency(total) : formatNumber(total)}</td>`;
            yearHTML += `<tr><td class="channel-header">${title}</td>${cells}${totalCell}</tr>`;
        });
        return yearHTML;
    };
    const viewTitle = view.charAt(0).toUpperCase() + view.slice(1);
    const tableHeaders = (year) => {
        const yearColumns = timeColumns.filter(c => c.year === year);
        return `<thead class="promo-table-HomePage-header"><tr><th>${viewTitle}</th>${yearColumns.map(c => `<th class="month-header">${c.label}</th>`).join('')}<th>Total</th></tr></thead>`;
    };
    const iconTableHeaders = (year) => {
        const yearColumns = timeColumns.filter(c => c.year === year);
        return `<thead class="promo-table-HomePage-header"><tr><th>Channel</th>${yearColumns.map(c => `<th class="month-header">${c.label}</th>`).join('')}</tr></thead>`;
    };
    const fullIconTable = yearsToRender.map(year => `${iconTableHeaders(year)}<tbody>${generateYearlyRows(year, uniqueChannels, (title) => iconsData[title], false, true)}</tbody>`).join('');
    const fullBudgetTable = yearsToRender.map(year => `${tableHeaders(year)}<tbody>${generateYearlyRows(year, uniqueBudgetTypes, (title) => budgetData[title] || {}, true)}</tbody>`).join('');
    const fullUpliftTable = yearsToRender.map(year => `${tableHeaders(year)}<tbody>${generateYearlyRows(year, ['HL Uplift'], () => upliftData.HL)}${generateYearlyRows(year, ['MACO'], () => upliftData.MACO, true)}${generateYearlyRows(year, ['Machines Uplift'], () => upliftData.machines)}</tbody>`).join('');

    root.innerHTML = `
        <div class="report-header">
            <h1>Promotional Calendar ${yearsToRender.join(', ')} - Icons (${viewTitle})</h1>
            <button class="download-button" data-table-id="icons-table">Download CSV</button>
        </div>

        <div class="table-scroll-wrapper">
            <table class="promo-table-HomePage"  id="icons-table">${fullIconTable}</table>    
        </div>
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
            <p><strong>Note:</strong> Icons represent all time periods spanned by a promotion. Financials are attributed to the start date (or end date for Loyalty Programs).</p>
        </div>
        
        <div class="report-header" style="margin-top: 50px;">
            <h1>Budget Calendar ${yearsToRender.join(', ')} (${viewTitle})</h1>
            <button class="download-button" data-table-id="budget-table">Download CSV</button>
        </div>
        <div class="table-scroll-wrapper">
            <table class="promo-table-HomePage" id="budget-table" style="margin-top: 30px;">${fullBudgetTable}</table>
        </div>
        
        <div class="report-header" style="margin-top: 50px;">
            <h1>Uplift / MACO Calendar ${yearsToRender.join(', ')} (${viewTitle})</h1>
            <button class="download-button" data-table-id="uplift-table">Download CSV</button>
        </div>

        <div class="table-scroll-wrapper">
            <table class="promo-table-HomePage" id="uplift-table" style="margin-top: 30px;">${fullUpliftTable}</table>
        </div>
    `;

    root.querySelectorAll('.download-button').forEach(button => {
        button.addEventListener('click', () => {
            const tableId = button.dataset.tableId;
            downloadTableAsCSV(tableId, `standard_report_${tableId}`);
        });
    });
}


// =================================================================
// VIEW 2: INTERACTIVE PIVOT TABLE
// =================================================================

const ALL_DIMENSIONS = [
    { id: 'promo_type', name: 'Promo Type' },
    { id: 'country', name: 'Country' },
    { id: 'channel_tags', name: 'Channel' },
    { id: 'status', name: 'Status' },
    { id: 'brand', name: 'Brand' }
];
const LOCAL_STORAGE_KEY = 'pivotConfig';

function renderInteractivePivot() {
    const savedConfig = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    const rowDimensions = savedConfig?.rows || [{ id: 'channel_tags', name: 'Channel' }];
    const valueType = savedConfig?.valueType || 'icons';

    renderValueSwitcher(valueType);
    renderPivotBuilder(rowDimensions);
    initDragAndDrop(rerender);

    document.getElementById('pivotValueSwitcher').addEventListener('change', rerender);

    rerender();

    function rerender() {
        const currentConfig = {
            rows: Array.from(document.querySelectorAll('#row-drop-zone .dimension-item'))
                .map(el => ({ id: el.dataset.id, name: el.textContent })),
            valueType: document.querySelector('input[name="pivotValue"]:checked').value
        };

        if (currentConfig.rows.length > 3) {
            showToast('You can select a maximum of 3 row categories.', 'error');
            renderInteractivePivot();
            return;
        }

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentConfig));
        renderPivotBuilder(currentConfig.rows);
        const pivotData = buildPivotData(currentConfig.rows, currentConfig.valueType);
        renderPivotTable(pivotData, currentConfig.rows, currentConfig.valueType);
    }
}

function renderValueSwitcher(selectedValue) {
    const switcher = document.getElementById('pivotValueSwitcher');
    if (!switcher) return;

    const budgetTypes = [...new Set(appState.allTimelineItems.flatMap(item => item.promo_budget_type || []))];
    const upliftTypes = [
        { id: 'MACO', name: 'MACO' },
        { id: 'promo_uplift_HL', name: 'HL Uplift' },
        { id: 'promo_uplift_machine', name: 'Machines Uplift' }
    ];

    let optionsHTML = `<input type="radio" id="valueIcons" name="pivotValue" value="icons" ${selectedValue === 'icons' ? 'checked' : ''}><label for="valueIcons">Icons</label>`;

    budgetTypes.forEach(type => {
        const id = `valueBudget_${type.replace(/\s+/g, '')}`;
        optionsHTML += `<input type="radio" id="${id}" name="pivotValue" value="${type}" ${selectedValue === type ? 'checked' : ''}><label for="${id}">${type}</label>`;
    });

    upliftTypes.forEach(type => {
        const id = `valueUplift_${type.id}`;
        optionsHTML += `<input type="radio" id="${id}" name="pivotValue" value="${type.id}" ${selectedValue === type.id ? 'checked' : ''}><label for="${id}">${type.name}</label>`;
    });

    switcher.innerHTML = optionsHTML;
}

function renderPivotBuilder(rowDimensions) {
    const pool = document.getElementById('dimension-pool');
    const rows = document.getElementById('row-drop-zone');
    if (!pool || !rows) return;

    const usedIds = new Set(rowDimensions.map(d => d.id));
    const availableDimensions = ALL_DIMENSIONS.filter(d => !usedIds.has(d.id));

    pool.innerHTML = availableDimensions.map(d => `<div class="dimension-item" data-id="${d.id}">${d.name}</div>`).join('');
    rows.innerHTML = rowDimensions.map(d => `<div class="dimension-item" data-id="${d.id}">${d.name}</div>`).join('');
}

function initDragAndDrop(onUpdateCallback) {
    const pool = document.getElementById('dimension-pool');
    const rows = document.getElementById('row-drop-zone');
    if (!pool || !rows) return;

    if (pool.sortable) pool.sortable.destroy();
    if (rows.sortable) rows.sortable.destroy();

    pool.sortable = new Sortable(pool, { group: 'pivot-builder', animation: 150, sort: false });
    rows.sortable = new Sortable(rows, { group: 'pivot-builder', animation: 150, onAdd: onUpdateCallback, onUpdate: onUpdateCallback, onRemove: onUpdateCallback });
}

function buildPivotData(rowConfig, valueType) {
    if (rowConfig.length === 0) return { children: {}, count: 0 };

    const items = appState.allTimelineItems.map(item => {
        const brand = appState.catalogData.brands.find(b => b.id === (item.brand_ids ? item.brand_ids[0] : null));
        return { ...item, brand: brand ? brand.name : 'N/A' };
    });

    function groupData(data, dimensions) {
        if (dimensions.length === 0) {
            return { values: aggregateTimeData(data, valueType), count: 1 };
        }

        const [currentDim, ...restDims] = dimensions;
        const grouped = {};

        for (const item of data) {
            const keys = Array.isArray(item[currentDim.id]) ? item[currentDim.id] : [item[currentDim.id] || 'N/A'];
            for (const key of keys) {
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(item);
            }
        }

        for (const key in grouped) {
            grouped[key] = groupData(grouped[key], restDims);
        }

        return { children: grouped };
    }

    return groupData(items, rowConfig);
}

// --- THIS IS THE CORRECTED AGGREGATION FUNCTION ---
function aggregateTimeData(items, valueType) {
    const aggregated = {};

    items.forEach(item => {
        // Logic for Icons (spans the entire duration)
        if (valueType === 'icons') {
            const startDate = new Date(item.promo_start_date);
            const endDate = new Date(item.promo_end_date);
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const year = String(currentDate.getFullYear());
                const key = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
                if (!aggregated[key]) aggregated[key] = new Set();
                aggregated[key].add(item.icon);
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }
        // Logic for all financial data (attributed to a single point in time)
        else {
            const attributionDate = item.promo_type === "Loyalty Program"
                ? new Date(item.promo_end_date)
                : new Date(item.promo_start_date);

            const year = String(attributionDate.getFullYear());
            const key = `${year}-${String(attributionDate.getMonth() + 1).padStart(2, '0')}`;

            if (!aggregated[key]) aggregated[key] = 0;

            if (['MACO', 'promo_uplift_HL', 'promo_uplift_machine'].includes(valueType)) {
                aggregated[key] += (item[valueType] || 0);
            } else { // It's a budget type
                const budgetIndex = (item.promo_budget_type || []).indexOf(valueType);
                if (budgetIndex !== -1) {
                    aggregated[key] += (item.promo_budget[budgetIndex] || 0);
                }
            }
        }
    });
    return aggregated;
}


function renderPivotTable(pivotData, rowConfig, valueType) {
    const root = document.getElementById('pivot-table-root');
    if (!root) return;
    const yearsToRender = [...new Set(appState.allTimelineItems.map(item => String(new Date(item.promo_start_date).getFullYear())))].sort();
    const timeColumns = getTimeColumns('monthly', yearsToRender);

    let tableHTML = `<div class="table-scroll-wrapper"><table class="promo-table-HomePage" id="pivot-table"><thead><tr>`;
    rowConfig.forEach(dim => { tableHTML += `<th class="pivot-table-header-cell">${dim.name}</th>`; });
    timeColumns.forEach(col => { tableHTML += `<th class="month-header">${col.label}</th>`; });
    if (valueType !== 'icons') {
        tableHTML += `<th class="month-header">Total</th>`;
    }
    tableHTML += `</tr></thead><tbody>`;
    tableHTML += generatePivotRows(pivotData, timeColumns, rowConfig, valueType);
    tableHTML += `</tbody></table></div>`;
    root.innerHTML = tableHTML;

    document.getElementById('downloadPivotBtn').onclick = () => {
        downloadTableAsCSV('pivot-table', 'interactive_pivot_report');
    };
}

function generatePivotRows(node, timeColumns, rowConfig, valueType, headers = []) {
    if (!node || !node.children) return '';

    let html = '';
    const sortedKeys = Object.keys(node.children).sort();

    sortedKeys.forEach(key => {
        const childNode = node.children[key];
        const newHeaders = [...headers, key];

        if (childNode.values) {
            html += '<tr>';
            newHeaders.forEach((header, i) => {
                const isBrandDim = rowConfig[i].id === 'brand';
                if (isBrandDim) {
                    const brand = appState.catalogData.brands.find(b => b.name === header);
                    const logoUrl = brand?.logo_medium_url || 'https://placehold.co/80x40/EEE/31343C?text=N/A';
                    html += `<td class="pivot-table-column-header-cell" data-value="${header}"><img src="${logoUrl}" alt="${header}" class="pivot-brand-logo"></td>`;
                } else {
                    html += `<td class="pivot-table-column-header-cell">${header}</td>`;
                }
            });

            let rowTotal = 0;
            timeColumns.forEach(col => {
                const value = childNode.values[col.key];
                let cellContent = '-';
                let dataValueAttr = '';
                if (value) {
                    if (valueType === 'icons') {
                        cellContent = Array.from(value).join('');
                    } else {
                        rowTotal += value;
                        const isCurrency = valueType === 'MACO' || !valueType.startsWith('promo_uplift_');
                        cellContent = isCurrency
                            ? value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
                            : value.toLocaleString('fr-FR');
                        dataValueAttr = `data-value="${value}"`;
                    }
                }
                html += `<td ${dataValueAttr} class="${value ? 'pivot-data-cell' : 'empty-cell'}">${cellContent}</td>`;
            });

            if (valueType !== 'icons') {
                const isCurrency = valueType === 'MACO' || !valueType.startsWith('promo_uplift_');
                const totalContent = isCurrency
                    ? rowTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
                    : rowTotal.toLocaleString('fr-FR');
                html += `<td class="pivot-data-cell" data-value="${rowTotal}"><strong>${totalContent}</strong></td>`;
            }
            html += '</tr>';
        } else {
            html += generatePivotRows(childNode, timeColumns, rowConfig, valueType, newHeaders);
        }
    });

    return html;
}

// --- Utility Functions ---
function getTimeColumns(view, yearsToRender) {
    const timeColumns = [];
    if (yearsToRender.length === 0) return [];

    if (view === 'monthly') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        yearsToRender.forEach(year => {
            months.forEach((month, index) => {
                timeColumns.push({
                    key: `${year}-${String(index + 1).padStart(2, '0')}`,
                    label: `${month} ${year.slice(-2)}`,
                    year: year
                });
            });
        });
    } else {
        let currentDate = new Date(yearsToRender[0], 0, 1);
        const lastDate = new Date(yearsToRender[yearsToRender.length - 1], 11, 31);
        while (currentDate <= lastDate) {
            const year = String(currentDate.getFullYear());
            if (yearsToRender.includes(year)) {
                if (view === 'weekly') {
                    const week = getWeek(currentDate);
                    const weekKey = `${year}-W${String(week).padStart(2, '0')}`;
                    if (!timeColumns.some(c => c.key === weekKey)) {
                        timeColumns.push({ key: weekKey, label: `W${week}`, year: year });
                    }
                    currentDate.setDate(currentDate.getDate() + 7);
                } else { // Daily
                    timeColumns.push({
                        key: `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`,
                        label: `${currentDate.toLocaleString('en-US', { month: 'short' })} ${currentDate.getDate()}`,
                        year: year,
                    });
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            } else {
                currentDate.setFullYear(parseInt(year) + 1, 0, 1);
            }
        }
    }
    return timeColumns;
}

const getWeek = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};