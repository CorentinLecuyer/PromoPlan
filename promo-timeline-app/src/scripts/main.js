const supabaseUrl = 'https://supabase.com/dashboard/project/wbvfmgyaudfkhridkhep';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmZtZ3lhdWRma2hyaWRraGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjM0ODQsImV4cCI6MjA2NTkzOTQ4NH0.ycacnokvGqBRAKCBAOaWJMjafiFGB3KuAp3gQYGJLrc';
const supabase = Supabase.createClient(supabaseUrl, supabaseAnonKey);

// ======================================================
// 2. Global State Management
// ======================================================
// Centralized state for filters and fetched data
const appState = {
    allTimelineItems: [],
    allTableData: [],
    selectedChannels: ['all'], // Default to all channels
    selectedYears: ['2026']    // Default to 2026 based on your current setup
};

// ======================================================
// 3. Utility Functions (utils.js equivalent)
// ======================================================

/**
 * Safely parses a JSON string that might represent an array or a single value.
 * Handles cases where the input is null, 'none', or invalid JSON.
 * @param {string|null|undefined} jsonString - The string to parse.
 * @returns {Array<string>} An array of strings.
 */
function parseJsonArray(jsonString) {
    if (!jsonString || jsonString === 'none') {
        return [];
    }
    try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
            return parsed.map(String);
        }
        // If it's a single value (number, string, etc.), wrap it in an array
        return [String(parsed)];
    } catch (e) {
        console.warn('Failed to parse JSON string:', jsonString, e);
        // Fallback: if parsing fails, assume it's a literal string and return it in an array
        return [String(jsonString)];
    }
}

/**
 * Formats a date range for display.
 * @param {string} startDateStr - The start date string (YYYY-MM-DD).
 * @param {string} endDateStr - The end date string (YYYY-MM-DD).
 * @returns {string} Formatted date range (e.g., "1 Jan - 31 Dec 2026").
 */
function formatDateRange(startDateStr, endDateStr) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const sameYear = startDate.getFullYear() === endDate.getFullYear();

    const startOptions = sameYear
        ? { day: 'numeric', month: 'long' }
        : { day: 'numeric', month: 'long', year: 'numeric' };

    const endOptions = { day: '2-digit', month: 'long', year: 'numeric' };

    const formattedStartDate = new Intl.DateTimeFormat('en-US', startOptions).format(startDate);
    const formattedEndDate = new Intl.DateTimeFormat('en-US', endOptions).format(endDate);

    return `${formattedStartDate} - ${formattedEndDate}`;
}

/**
 * Generates an array of months between two dates (inclusive).
 * @param {Date} startDate - The start date.
 * @param {Date} endDate - The end date.
 * @returns {Array<{year: string, month: string}>} Array of month objects.
 */
function getMonthsBetweenDates(startDate, endDate) {
    const months = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (current <= endDate) {
        months.push({
            year: current.getFullYear().toString(),
            month: current.toLocaleString('en-US', { month: 'long' }).toUpperCase()
        });
        current.setMonth(current.getMonth() + 1);
    }
    return months;
}

// ======================================================
// 4. Data Fetching (supabaseClient.js equivalent)
// ======================================================

/**
 * Fetches promotional items from Supabase with applied filters.
 * @returns {Promise<Array>} A promise that resolves to an array of processed timeline items.
 */
async function fetchTimelineItems() {
    try {
        let query = supabase.from('promo_items').select('*');

        // Apply year filter
        if (!appState.selectedYears.includes('all') && appState.selectedYears.length > 0) {
            query = query.in('year', appState.selectedYears); // 'year' column in DB is likely int, ensure comparison is correct.
        }

        // Apply channel filter using 'contains' for array columns
        if (!appState.selectedChannels.includes('all') && appState.selectedChannels.length > 0) {
            query = query.contains('channel_tags', appState.selectedChannels);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Supabase fetchTimelineItems error:', error.message);
            throw new Error('Failed to load timeline data from database.');
        }

        // Process fetched data to parse JSON strings and convert types
        return data.map(item => ({
            ...item,
            promo_details: parseJsonArray(item.promo_details),
            // Parse promo_budget, converting elements to numbers
            promo_budget: parseJsonArray(item.promo_budget).map(b => parseFloat(b) || 0),
            promo_budget_type: parseJsonArray(item.promo_budget_type),
            channel_tags: parseJsonArray(item.channel_tags),
            // Map 'table_name' from DB to 'table' property for existing rendering logic
            table: parseJsonArray(item.table_name).length > 0 ? parseJsonArray(item.table_name) : 'none',
            // Ensure year is string for consistent filtering with checkbox values
            year: String(item.year)
        }));

    } catch (error) {
        console.error('Error in fetchTimelineItems:', error);
        return []; // Return empty array on error
    }
}

/**
 * Fetches table data from Supabase.
 * @returns {Promise<Array>} A promise that resolves to an array of processed table data.
 */
async function fetchTableData() {
    try {
        const { data, error } = await supabase
            .from('promoTables_items') // Your Supabase table name for display tables
            .select('*');

        if (error) {
            console.error('Supabase fetchTableData error:', error.message);
            throw new Error('Failed to load table data from database.');
        }

        // Process fetched data: parse 'th' and 'tr' from string to array
        return data.map(row => ({
            ...row,
            th: parseJsonArray(row.th),
            tr: parseJsonArray(row.tr)
        }));

    } catch (error) {
        console.error('Error in fetchTableData:', error);
        return []; // Return empty array on error
    }
}

// ======================================================
// 5. UI Rendering Functions (ui.js equivalent)
// ======================================================

/**
 * Retrieves a table object by its ID from the cached table data.
 * @param {string|number} tableId - The ID of the table to find.
 * @returns {object|undefined} The table object or undefined if not found.
 */
function getTableDataById(tableId) {
    return appState.allTableData.find(table => String(table.id) === String(tableId));
}

/**
 * Generates HTML for a single table.
 * @param {object} tableObj - The table object.
 * @returns {string} HTML string for the table.
 */
function generateTableHTML(tableObj) {
    if (!tableObj) return '';

    // Use table_name from DB as the title
    const tableTitle = tableObj.table_name || '';
    const tableHeaders = tableObj.th || [];
    const tableRows = tableObj.tr || [];

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
                    ${tableRows.map(rowArray => {
                        // Assuming rowArray is already an array from parseJsonArray
                        // Each item in rowArray is a cell content
                        return `
                            <tr>
                                ${rowArray.map(cell => `<td>${cell}</td>`).join('')}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Generates HTML for multiple tables given their IDs.
 * @param {string|number|Array<string|number>} tableIds - Single ID or array of IDs.
 * @returns {string} Combined HTML string for all tables.
 */
function generateMultipleTablesHTML(tableIds) {
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


/**
 * Renders the timeline view based on filtered items.
 * @param {Array<object>} items - The timeline items to render.
 */
function renderTimeline(items) {
    const root = document.getElementById('timeline-root');
    if (!root) {
        console.warn('Timeline root element not found, cannot render timeline.');
        return;
    }

    // Sort items by start date or end date for loyalty programs
    items.sort((a, b) => {
        const dateA = a.promo_type === "Loyalty Program"
            ? new Date(a.promo_end_date)
            : new Date(a.promo_start_date);

        const dateB = b.promo_type === "Loyalty Program"
            ? new Date(b.promo_end_date)
            : new Date(b.promo_start_date);

        return dateA - dateB; // Ascending order (oldest first)
    });

    let lastMonthMarker = '';
    let lastYearMarker = '';

    root.innerHTML = `
    <div class="timeline-container">
      <div class="timeline">
        ${items.map(item => {
        const startDate = new Date(item.promo_start_date);
        const endDate = new Date(item.promo_end_date);

        const formattedDate = formatDateRange(item.promo_start_date, item.promo_end_date);

        const specialDate = item.promo_type === "Loyalty Program"
            ? new Date(item.promo_end_date)
            : new Date(item.promo_start_date);

        const monthMarker = specialDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
        const showMonthMarker = monthMarker !== lastMonthMarker;
        lastMonthMarker = monthMarker;

        const yearMarker = String(startDate.getFullYear()); // Ensure year is a string
        const showYearMarker = yearMarker !== lastYearMarker;
        lastYearMarker = yearMarker;

        const tablesHTML = generateMultipleTablesHTML(item.table); // Use item.table which is now an array of IDs

        const hasBudget = Array.isArray(item.promo_budget) && item.promo_budget.length > 0 && item.promo_budget.some(b => b > 0);
        const hasMACO = typeof item.MACO === 'number' && item.MACO > 0;
        const hasUpliftHL = typeof item.promo_uplift_HL === 'number' && item.promo_uplift_HL > 0;
        const hasUpliftMachine = typeof item.promo_uplift_machine === 'number' && item.promo_uplift_machine > 0;
        const hasROI = item.ROI !== null && item.ROI !== undefined && item.ROI !== 0 && item.ROI !== 'TBC' && item.ROI !== 'undefined';


        return `
                ${showYearMarker ? `<div class="year-marker">${yearMarker}</div>` : ""}
              <div class="timeline-item">
                  ${showMonthMarker ? `<div class="month-marker">${monthMarker}</div>` : ""}
                <div class="timeline-content">
                  <div class="promo-type ${item.promo_type.toLowerCase().replace(/\s+/g, '-')}">${item.promo_type}</div>
                  <div class="promo-title">${item.promo_title}</div>
                  <div class="promo-date"> ${formattedDate} </div>
                  <div class="promo-details">
                    ${item.promo_details.map(line => `• ${line}<br>`).join("")}
                  </div>
                  <div class="channel-tags">
                    ${item.channel_tags.map(ch => `<span class="channel-tag">${ch}</span>`).join("")}
                  </div>

                  ${tablesHTML}

                  ${(hasBudget || hasMACO || hasUpliftHL || hasUpliftMachine || hasROI) ? `
                    <h3 class="table-title">Budget Details / Financials</h3>
                    <table class="promo-table-budget">
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
                        ${item.promo_budget.map((budget, index) => {
                            const budgetType = item.promo_budget_type[index] || 'N/A';
                            // Only render ROI, Uplift HL, Uplift Machine, and MACO on the first row of budget
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
                                        <th rowspan="${item.promo_budget.length}">${item.MACO.toLocaleString('fr-FR', {
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
                            // Case for items with MACO/Uplift/ROI but no specific budget breakdown
                            `<tr>
                                <th>-</th>
                                <th><span class="channel-tag-budget">-</span></th>
                                <th>${item.promo_uplift_HL || 0} HL</th>
                                <th>${item.promo_uplift_machine || 0} Machines</th>
                                <th>${item.ROI || 'TBC'}</th>
                                <th>${item.MACO.toLocaleString('fr-FR', {
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
                  <div class="icon-container">
                    <div class="icon-emoji">${item.icon}</div>
                  </div>
                  <div class="timeline-dot"></div>
                </a>
              </div>
            `;
    }).join("")}
      </div>
    </div>
  `;
}

/**
 * Renders the home page calendar tables (icons, budget, uplift).
 * @param {Array<object>} items - The timeline items to render.
 */
function renderTablesHomePage(items) {
    const root = document.getElementById('timeline-root-home-page');
    if (!root) {
        console.warn('Home page root element not found, cannot render tables.');
        return;
    }

    // Sort items by date for consistent calendar display
    items.sort((a, b) => {
        const dateA = a.promo_type === "Loyalty Program"
            ? new Date(a.promo_end_date)
            : new Date(a.promo_start_date);

        const dateB = b.promo_type === "Loyalty Program"
            ? new Date(b.promo_end_date)
            : new Date(b.promo_start_date);

        return dateA - dateB;
    });

    // Extract unique channels and budget types from the *filtered* items
    const allChannels = new Set();
    const allBudgetTypes = new Set();
    items.forEach(item => {
        item.channel_tags.forEach(channel => allChannels.add(channel));
        item.promo_budget_type.forEach(type => allBudgetTypes.add(type));
    });
    const uniqueChannels = Array.from(allChannels).sort();
    const uniqueBudgetTypes = Array.from(allBudgetTypes).sort();

    const uniqueYearsInFilteredData = [...new Set(items.map(item => String(item.year)))].sort();

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNamesFull = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

    let h1TitleCalendar = '';
    if (appState.selectedYears.includes('all') || appState.selectedYears.length > 1) {
        h1TitleCalendar = 'Promotional Calendar - Icons by Channel and Month';
    } else {
        h1TitleCalendar = `Promotional Calendar ${appState.selectedYears[0]} - Icons by Channel and Month`;
    }

    let h1TitleBudget = '';
    if (appState.selectedYears.includes('all') || appState.selectedYears.length > 1) {
        h1TitleBudget = 'Budget Calendar by Channel and Month';
    } else {
        h1TitleBudget = `Budget Calendar ${appState.selectedYears[0]} by Channel and Month`;
    }


    let tableHTMLcalendar = '';
    let tableHTMLBudget = '';
    let tableHTMLUplift = '';

    uniqueYearsInFilteredData.forEach(year => {
        const itemsForThisYear = items.filter(item => String(item.year) === year);

        if (uniqueYearsInFilteredData.length > 1) {
            tableHTMLcalendar += `<tr class="year-marker-row"><td colspan="${months.length + 1}" class="year-marker-cell">${year}</td></tr>`;
            tableHTMLBudget += `<tr class="year-marker-row"><td colspan="${months.length + 1}" class="year-marker-cell">${year}</td></tr>`;
            tableHTMLUplift += `<tr class="year-marker-row"><td colspan="${months.length + 1}" class="year-marker-cell">${year}</td></tr>`;
        }

        // Calendar Icons Data
        const yearIconsData = {};
        uniqueChannels.forEach(channel => {
            yearIconsData[channel] = {};
            monthNamesFull.forEach(month => yearIconsData[channel][month] = []);
        });

        itemsForThisYear.forEach(item => {
            const startDate = new Date(item.promo_start_date);
            const endDate = new Date(item.promo_end_date);
            const promoMonths = getMonthsBetweenDates(startDate, endDate);

            item.channel_tags.forEach(channel => {
                promoMonths.forEach(promoMonth => {
                    if (yearIconsData[channel] && yearIconsData[channel][promoMonth.month]) {
                        yearIconsData[channel][promoMonth.month].push(item.icon);
                    }
                });
            });
        });

        // Budget & Uplift Data Aggregation
        const yearFinancialData = {};
        monthNamesFull.forEach(month => {
            yearFinancialData[month] = { HL: 0, machines: 0, MACO: 0 };
        });
        const yearBudgetByTypeData = {};
        uniqueBudgetTypes.forEach(type => {
            yearBudgetByTypeData[type] = {};
            monthNamesFull.forEach(month => yearBudgetByTypeData[type][month] = 0);
        });

        itemsForThisYear.forEach(item => {
            // Aggregate total HL, Machines, MACO by month
            const promoMonthFull = item.month.toUpperCase(); // Ensure month matches full name
            if (yearFinancialData[promoMonthFull]) {
                yearFinancialData[promoMonthFull].HL += item.promo_uplift_HL || 0;
                yearFinancialData[promoMonthFull].machines += item.promo_uplift_machine || 0;
                yearFinancialData[promoMonthFull].MACO += item.MACO || 0;
            }

            // Aggregate budget by type and month
            item.promo_budget_type.forEach((type, index) => {
                const budgetValue = item.promo_budget[index] || 0;
                if (yearBudgetByTypeData[type] && yearBudgetByTypeData[type][promoMonthFull] !== undefined) {
                    yearBudgetByTypeData[type][promoMonthFull] += budgetValue;
                }
            });
        });


        // Generate Calendar HTML for this year
        uniqueChannels.forEach(channel => {
            const className = channel.includes("Loyalty") ? "channel-header-loyalty" : "channel-header";
            tableHTMLcalendar += `
                <tr class="${className}">
                    <td>${channel}</td>
                    ${months.map((month, index) => {
                        const icons = yearIconsData[channel][monthNamesFull[index]];
                        const iconString = icons.length > 0 ? icons.join('') : '-';
                        return `<td class="${icons.length > 0 ? 'icon-cell' : 'empty-cell'}">${iconString}</td>`;
                    }).join('')}
                </tr>
            `;
        });

        // Generate Budget HTML for this year
        uniqueBudgetTypes.forEach(budgetType => {
            tableHTMLBudget += `
                <tr>
                    <td class="channel-header">${budgetType}</td>
                    ${months.map((month, index) => {
                        const totalBudget = yearBudgetByTypeData[budgetType][monthNamesFull[index]];
                        const budgetString = totalBudget > 0 ? totalBudget.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }) : '-';
                        return `<td class="${totalBudget > 0 ? 'data-cell' : 'empty-cell'}">${budgetString}</td>`;
                    }).join('')}
                </tr>
            `;
        });

        // Generate Uplift HTML for this year
        tableHTMLUplift += `
            <tr>
                <td class="channel-header">HL Uplift</td>
                ${months.map((month, index) => {
                    const totalHL = yearFinancialData[monthNamesFull[index]].HL;
                    const hlString = totalHL > 0 ? totalHL.toLocaleString('fr-FR', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }) : '-';
                    return `<td class="${totalHL > 0 ? 'data-cell' : 'empty-cell'}">${hlString}</td>`;
                }).join('')}
            </tr>
            <tr>
                <td class="channel-header">MACO</td>
                ${months.map((month, index) => {
                    const totalMACO = yearFinancialData[monthNamesFull[index]].MACO;
                    const MACOString = totalMACO > 0 ? totalMACO.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                    }) : '-';
                    return `<td class="${totalMACO > 0 ? 'data-cell' : 'empty-cell'}">${MACOString}</td>`;
                }).join('')}
            </tr>
            <tr>
                <td class="channel-header">Machines Uplift</td>
                ${months.map((month, index) => {
                    const totalMachines = yearFinancialData[monthNamesFull[index]].machines;
                    const machinesString = totalMachines > 0 ? totalMachines.toLocaleString('fr-FR', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }) : '-';
                    return `<td class="${totalMachines > 0 ? 'data-cell' : 'empty-cell'}">${machinesString}</td>`;
                }).join('')}
            </tr>
        `;
    });


    root.innerHTML = `
        <h1>${h1TitleCalendar}</h1>
        <table class="promo-table-HomePage">
            <thead class="promo-table-HomePage-header">
                <tr>
                    <th>Channel</th>
                    ${months.map(month => `<th class="month-header">${month}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${tableHTMLcalendar}
            </tbody>
        </table>
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
            <p><strong>Legend:</strong> Each icon represents a promotional campaign. Multiple icons in the same cell
                indicate multiple campaigns running in that month for that channel.</p>
            <p><strong>Note:</strong> Some promotions span multiple months or have ongoing periods without specific end
                dates.</p>
        </div>

        <h1 style="margin-top: 50px;">${h1TitleBudget}</h1>
        <table class="promo-table-HomePage" style="margin-top: 30px;">
            <thead class="promo-table-HomePage-header">
                <tr>
                    <th>Budget Type</th>
                    ${months.map(month => `<th class="month-header">${month}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${tableHTMLBudget}
            </tbody>
        </table>

        <table class="promo-table-HomePage" style="margin-top: 30px;">
            <thead class="promo-table-HomePage-header">
                <tr>
                    <th>UPLIFT / MACO</th>
                    ${months.map(month => `<th class="month-header">${month}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${tableHTMLUplift}
            </tbody>
        </table>
    `;
}

// ======================================================
// 6. Filter Management (filters.js equivalent)
// ======================================================

/**
 * Toggles the visibility of the channel dropdown and arrow rotation.
 */
function toggleChannelDropdown() {
    const dropdown = document.getElementById('channelDropdown');
    const arrow = document.getElementById('dropdownArrow');
    dropdown?.classList.toggle('show');
    arrow?.classList.toggle('rotated');
}

/**
 * Handles changes to channel filter checkboxes.
 * @param {HTMLInputElement} checkbox - The checkbox that triggered the change.
 */
async function handleChannelOptionChange(checkbox) {
    const allCheckbox = document.getElementById('all');

    if (checkbox.value === 'all') {
        if (checkbox.checked) {
            appState.selectedChannels = ['all'];
            document.querySelectorAll('#channelDropdown input[type="checkbox"]').forEach(cb => {
                cb.checked = cb.value === 'all';
            });
        } else {
            appState.selectedChannels = [];
        }
    } else {
        if (allCheckbox) allCheckbox.checked = false;

        if (checkbox.checked) {
            if (!appState.selectedChannels.includes(checkbox.value)) {
                appState.selectedChannels = appState.selectedChannels.filter(ch => ch !== 'all');
                appState.selectedChannels.push(checkbox.value);
            }
        } else {
            appState.selectedChannels = appState.selectedChannels.filter(ch => ch !== checkbox.value);
            if (appState.selectedChannels.length === 0) {
                appState.selectedChannels = ['all'];
                if (allCheckbox) allCheckbox.checked = true;
            }
        }
    }

    updateSelectedChannelText();
    saveFiltersToURL();
    await updateAndRenderContent();
}

/**
 * Updates the text displayed on the channel filter button.
 */
function updateSelectedChannelText() {
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
 * Toggles the visibility of the year dropdown and arrow rotation.
 */
function toggleYearDropdown() {
    const dropdown = document.getElementById('yearDropdown');
    const arrow = document.getElementById('yearDropdownArrow');
    dropdown?.classList.toggle('show');
    arrow?.classList.toggle('rotated');
}

/**
 * Handles changes to year filter checkboxes.
 * @param {HTMLInputElement} checkbox - The checkbox that triggered the change.
 */
async function handleYearOptionChange(checkbox) {
    const allYearCheckbox = document.getElementById('year_all');

    if (checkbox.value === 'all') {
        if (checkbox.checked) {
            appState.selectedYears = ['all'];
            document.querySelectorAll('#yearDropdown input[type="checkbox"]').forEach(cb => {
                cb.checked = cb.value === 'all';
            });
        } else {
            appState.selectedYears = [];
        }
    } else {
        if (allYearCheckbox) allYearCheckbox.checked = false;

        if (checkbox.checked) {
            if (!appState.selectedYears.includes(checkbox.value)) {
                appState.selectedYears = appState.selectedYears.filter(year => year !== 'all');
                appState.selectedYears.push(checkbox.value);
            }
        } else {
            appState.selectedYears = appState.selectedYears.filter(year => year !== checkbox.value);
            if (appState.selectedYears.length === 0) {
                appState.selectedYears = ['all'];
                if (allYearCheckbox) allYearCheckbox.checked = true;
            }
        }
    }

    updateSelectedYearText();
    saveFiltersToURL();
    await updateAndRenderContent();
}

/**
 * Updates the text displayed on the year filter button.
 */
function updateSelectedYearText() {
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
 * Loads filter selections from the URL query parameters.
 */
function loadFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);

    const yearsParam = params.get('years');
    if (yearsParam) {
        appState.selectedYears = yearsParam.split(',').filter(year => year.trim() !== '');
        if (appState.selectedYears.length === 0) {
            appState.selectedYears = ['all'];
        }
    } else {
        // If no years in URL, set default to '2026'
        appState.selectedYears = ['2026'];
    }

    // No channel filter in URL in original main.js, so keep default.
    // If you want to add channel filter to URL, implement similar logic here.
}

/**
 * Saves current filter selections to the URL query parameters.
 */
function saveFiltersToURL() {
    const params = new URLSearchParams();

    if (!appState.selectedYears.includes('all') && appState.selectedYears.length > 0) {
        params.set('years', appState.selectedYears.join(','));
    }
    // Add channel filters to URL if desired
    // if (!appState.selectedChannels.includes('all') && appState.selectedChannels.length > 0) {
    //     params.set('channels', appState.selectedChannels.join(','));
    // }

    const newURL = params.toString() ?
        `${window.location.pathname}?${params.toString()}` :
        window.location.pathname;

    window.history.replaceState({}, '', newURL);
}

/**
 * Updates the filter checkboxes in the UI to reflect the current appState.
 */
function updateCheckboxesFromFilters() {
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
}

// ======================================================
// 7. Application Flow Control
// ======================================================

/**
 * Fetches data, updates state, and renders the UI.
 * This is called whenever filters change or on initial load.
 */
async function updateAndRenderContent() {
    try {
        // Fetch table data first as it's needed by timeline rendering
        appState.allTableData = await fetchTableData();
        // Fetch timeline items with current filters
        appState.allTimelineItems = await fetchTimelineItems();

        // Render based on the current page
        const timelineRoot = document.getElementById('timeline-root');
        const homePageRoot = document.getElementById('timeline-root-home-page');

        if (timelineRoot) {
            renderTimeline(appState.allTimelineItems);
        }
        if (homePageRoot) {
            renderTablesHomePage(appState.allTimelineItems);
        }

    } catch (error) {
        console.error('Error updating and rendering content:', error);
        const errorMessage = '<p style="color:red;">Failed to load data. Please try again.</p>';

        // Corrected lines: Explicitly check for element existence before assignment
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
 * Initializes the application: loads filters, fetches data, and renders UI.
 */
async function initializeApp() {
    loadFiltersFromURL();
    updateCheckboxesFromFilters(); // Ensure UI reflects initial state

    // Attach event listeners for filter dropdowns
    document.getElementById('channelDropdown')?.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox') {
            handleChannelOptionChange(event.target);
        }
    });
    document.getElementById('yearDropdown')?.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox') {
            handleYearOptionChange(event.target);
        }
    });
    document.querySelector('.multiselect-header[onclick="toggleDropdown()"]')?.addEventListener('click', toggleChannelDropdown);
    document.querySelector('.multiselect-header[onclick="toggleYearDropdown()"]')?.addEventListener('click', toggleYearDropdown);


    // Close dropdowns when clicking outside
    document.addEventListener('click', function (event) {
        const channelContainer = document.querySelector('#channelDropdown')?.closest('.multiselect-container');
        const yearContainer = document.querySelector('#yearDropdown')?.closest('.multiselect-container');

        if (channelContainer && !channelContainer.contains(event.target)) {
            document.getElementById('channelDropdown')?.classList.remove('show');
            document.getElementById('dropdownArrow')?.classList.remove('rotated');
        }
        if (yearContainer && !yearContainer.contains(event.target)) {
            document.getElementById('yearDropdown')?.classList.remove('show');
            document.getElementById('yearDropdownArrow')?.classList.remove('rotated');
        }
    });

    await updateAndRenderContent(); // Initial data fetch and render
}

// ======================================================
// 8. Event Listener for DOMContentLoaded
// ======================================================
document.addEventListener('DOMContentLoaded', initializeApp);