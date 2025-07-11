let allTimelineItems = [];
let allTableData = [];
let selectedChannels = ['all'];
let selectedYears = ['all'];

function getTableById(tableId) {
    return allTableData.find(table => table.id === tableId);
}

// Load table data from JSON file
function loadTableData() {
    return fetch('./db/table-items.json')
        .then(response => response.json())
        .then(data => {
            allTableData = data;
        })
        .catch(error => {
            console.error('Error loading table data:', error);
            allTableData = [];
        });
}

// Load timeline data from JSON file
function loadTimelineData() {
    return fetch('./db/timeline-items.json')
        .then(response => response.json())
        .then(data => {
            allTimelineItems = data;
        })
        .catch(error => {
            console.error('Error loading timeline data:', error);
            allTimelineItems = [];
        });
}

// Initialize the application
async function initializeApp() {
    try {
        // Check if required DOM elements exist
        const timelineRoot = document.getElementById('timeline-root');
        const homePageRoot = document.getElementById('timeline-root-home-page');

        if (!timelineRoot && !homePageRoot) {
            console.warn('No timeline containers found in DOM');
            return;
        }

        // Load both datasets concurrently
        await Promise.all([
            loadTableData(),
            loadTimelineData()
        ]);

        // Render timeline only if container exists
        if (timelineRoot) {
            renderTimeline(allTimelineItems);
        }

        // Render home page only if container exists
        if (homePageRoot) {
            renderTablesHomePage(allTimelineItems);
        }

    } catch (error) {
        console.error('Error initializing app:', error);
        // Show error in available containers
        const timelineRoot = document.getElementById('timeline-root');
        const homePageRoot = document.getElementById('timeline-root-home-page');

        const errorMessage = '<p style="color:red;">Failed to load timeline data.</p>';

        if (timelineRoot) {
            timelineRoot.innerHTML = errorMessage;
        }
        if (homePageRoot) {
            homePageRoot.innerHTML = errorMessage;
        }
    }
}

// Function to generate HTML table
function generateTableHTML(tableObj) {
    if (!tableObj) return '';

    return `
        <div class="table-container ${tableObj.style}">
            <h3 class="table-title">${tableObj.table}</h3>
            <table class="promo-table${tableObj.style}">
                <thead>
                    <tr>
                        ${tableObj.th.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${tableObj.tr.map(row => `
                        <tr>
                            ${row.map(cell => `<td>${cell}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
function generateMultipleTablesHTML(tableIds) {
    if (!tableIds || tableIds.length === 0) return '';

    // Handle both single table ID (string/number) and array of table IDs
    const tableIdArray = Array.isArray(tableIds) ? tableIds : [tableIds];

    return tableIdArray
        .map(tableId => {
            const tableObj = getTableById(tableId);
            return generateTableHTML(tableObj);
        })
        .filter(html => html !== '') // Remove empty results
        .join('');
}

function renderTimeline(items) {
    const root = document.getElementById('timeline-root');

    // Safety check
    if (!root) {
        console.warn('Timeline root element not found');
        return;
    }

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

        const sameYear = startDate.getFullYear() === endDate.getFullYear();

        // Choose format options depending on year match
        const startOptions = sameYear
            ? { day: 'numeric', month: 'long' }
            : { day: 'numeric', month: 'long', year: 'numeric' };

        const endOptions = { day: '2-digit', month: 'long', year: 'numeric' };

        const formattedStartDate = new Intl.DateTimeFormat('en-US', startOptions).format(startDate);
        const formattedEndDate = new Intl.DateTimeFormat('en-US', endOptions).format(endDate);

        const specialDate = item.promo_type === "Loyalty Program"
            ? new Date(item.promo_end_date)
            : new Date(item.promo_start_date);

        // Determine the month label for grouping (e.g., "January 2025")
        const monthMarker = specialDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

        // Show month marker only if different from the last one
        const showMonthMarker = monthMarker !== lastMonthMarker;
        lastMonthMarker = monthMarker;

        // Determine the year label for grouping (e.g., "January 2025")
        const YearMarker = startDate.toLocaleString('en-US', { year: 'numeric' });

        // Show year marker only if different from the last one
        const showYearMarker = YearMarker !== lastYearMarker;
        lastYearMarker = YearMarker;

        // Check if item has a table and get table data
        const hasTable = item.table && item.table !== "none" && (Array.isArray(item.table) ? item.table.length > 0 : true);
        const tablesHTML = hasTable ? generateMultipleTablesHTML(item.table) : '';

        // Check if item has a budget and get table data
        const hasBudget = Array.isArray(item.promo_budget) || item.promo_budget.length > 0

        // Check if item has a bgcolor

        let inlineBgStyle = '';
        if (Array.isArray(item.bgcolor) && item.bgcolor.length >= 1) {
            const color1 = item.bgcolor[0];
            const color2 = item.bgcolor.length > 1 ? item.bgcolor[1] : '#ffffff'; // Default to white if only one color provided
            inlineBgStyle = `style="background-image: linear-gradient(to bottom right, ${color1}, ${color2}); border-right-color: ${item.bordercolor};  border-left-color: ${item.bordercolor};"`;
        } else if (typeof item.bgcolor === 'string' && item.bgcolor !== '') {
            // Fallback for single string bgcolor for backward compatibility or simpler cases
            inlineBgStyle = `style="background-color: ${item.bgcolor}; border-right-color: ${item.bordercolor}; border-left-color: ${item.bordercolor};"`; 
        }
        
        let theadStyle = '';
        if (item.bordercolor && item.bordercolor !== '') {
            theadStyle = `style="background-color:${item.bordercolor}; color: white; border-color: ${item.bordercolor}; "`;
        }


        return `
                ${showYearMarker ? `<div class="year-marker">${YearMarker}</div>` : ""}
              <div class="timeline-item">
                  ${showMonthMarker ? `<div class="month-marker">${monthMarker}</div>` : ""}
                <div class="timeline-content" ${inlineBgStyle}>
                  <div class="promo-type ${item.promo_type.toLowerCase().replace(/\s+/g, '-')}">${item.promo_type}</div>
                  <div class="promo-title">${item.promo_title}</div>
                  <div class="promo-date"> ${formattedStartDate} - ${formattedEndDate} </div>
                  <div class="promo-details">
                    ${item.promo_details.map(line => `• ${line}<br>`).join("")}
                  </div>
                  <div class="channel-tags" >
                    ${item.channel_tags.map(ch => `<span class="channel-tag" ${theadStyle}>${ch}</span>`).join("")}
                  </div>

                  ${tablesHTML}
                  ${hasBudget ? `
                    <h3 class="table-title">Budget Details // Financials</h3>
                    <table class="promo-table-budget">
                        <thead ${theadStyle}>
                            <tr>
                                <th>Budget</th>
                                <th>Budget Type</th>
                                <th>Uplift HL</th>
                                <th>Uplift Machine</th>
                                <th>ROI</th>
                            </tr>
                        </thead>
                        <tbody>
                        
                        ${item.promo_budget.map((budget, index) => `
                            <tr>
                                <th>${budget.toLocaleString('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        })}</th>
                                <th><span class="channel-tag-budget">${item.promo_budget_type[index]}</span></th>${index === 0 ?
                `<th rowspan="${item.promo_budget.length}">${item.promo_uplift_HL} HL</th>
                                <th rowspan="${item.promo_budget.length}">${item.promo_uplift_machine} Machines</th>
                                <th rowspan="${item.promo_budget.length}">${item.ROI}</th>` : ''}
                            </tr>
                        `).join("")}
                        
                        
                    </tbody>
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

// Combined filter function that applies both year and channel filters
function applyFilters() {
    let filteredItems = allTimelineItems;

    // Apply year filter (updated to handle multiple years)
    if (!selectedYears.includes('all') && selectedYears.length > 0) {
        filteredItems = filteredItems.filter(item => selectedYears.includes(item.year));
    }

    // Apply channel filter
    if (!selectedChannels.includes('all') && selectedChannels.length > 0) {
        filteredItems = filteredItems.filter(item =>
            item.channel_tags.some(tag => selectedChannels.includes(tag))
        );
    }

    renderTimeline(filteredItems);
    renderTablesHomePage(filteredItems);

}

// YEAR MULTI-SELECT FUNCTIONS
function toggleYearDropdown() {
    const dropdown = document.getElementById('yearDropdown');
    const arrow = document.getElementById('yearDropdownArrow');

    if (dropdown) dropdown.classList.toggle('show');
    if (arrow) arrow.classList.toggle('rotated');
}

function handleYearOptionChange(checkbox) {
    const allYearCheckbox = document.getElementById('year_all');

    if (checkbox.value === 'all') {
        if (checkbox.checked) {
            // If "All" is checked, uncheck all others and select only "all"
            selectedYears = ['all'];
            document.querySelectorAll('#yearDropdown input[type="checkbox"]').forEach(cb => {
                cb.checked = cb.value === 'all';
            });
        } else {
            // If "All" is unchecked, keep it unchecked
            selectedYears = [];
        }
    } else {
        // If any specific year is selected
        if (allYearCheckbox) allYearCheckbox.checked = false;

        if (checkbox.checked) {
            // Add to selected years
            if (!selectedYears.includes(checkbox.value)) {
                selectedYears = selectedYears.filter(year => year !== 'all');
                selectedYears.push(checkbox.value);
            }
        } else {
            // Remove from selected years
            selectedYears = selectedYears.filter(year => year !== checkbox.value);

            // If no years selected, select "All"
            if (selectedYears.length === 0) {
                selectedYears = ['all'];
                if (allYearCheckbox) allYearCheckbox.checked = true;
            }
        }
    }

    updateSelectedYearText();
    applyFilters();
}

function updateSelectedYearText() {
    const selectedText = document.getElementById('selectedYearText');

    if (!selectedText) return;

    if (selectedYears.includes('all') || selectedYears.length === 0) {
        selectedText.textContent = 'All Years';
    } else if (selectedYears.length === 1) {
        selectedText.textContent = selectedYears[0];
    } else {
        selectedText.innerHTML = `${selectedYears.length} Years <span class="selected-count">${selectedYears.length}</span>`;
    }
}

// CHANNEL MULTI-SELECT FUNCTIONS
function toggleDropdown() {
    const dropdown = document.getElementById('channelDropdown');
    const arrow = document.getElementById('dropdownArrow');

    if (dropdown) dropdown.classList.toggle('show');
    if (arrow) arrow.classList.toggle('rotated');
}

function handleOptionChange(checkbox) {
    const allCheckbox = document.getElementById('all');

    if (checkbox.value === 'all') {
        if (checkbox.checked) {
            // If "All" is checked, uncheck all others and select only "all"
            selectedChannels = ['all'];
            document.querySelectorAll('#channelDropdown input[type="checkbox"]').forEach(cb => {
                cb.checked = cb.value === 'all';
            });
        } else {
            // If "All" is unchecked, keep it unchecked
            selectedChannels = [];
        }
    } else {
        // If any specific channel is selected
        if (allCheckbox) allCheckbox.checked = false;

        if (checkbox.checked) {
            // Add to selected channels
            if (!selectedChannels.includes(checkbox.value)) {
                selectedChannels = selectedChannels.filter(ch => ch !== 'all');
                selectedChannels.push(checkbox.value);
            }
        } else {
            // Remove from selected channels
            selectedChannels = selectedChannels.filter(ch => ch !== checkbox.value);

            // If no channels selected, select "All"
            if (selectedChannels.length === 0) {
                selectedChannels = ['all'];
                if (allCheckbox) allCheckbox.checked = true;
            }
        }
    }

    updateSelectedText();
    applyFilters();
}

function updateSelectedText() {
    const selectedText = document.getElementById('selectedText');

    if (!selectedText) return;

    if (selectedChannels.includes('all') || selectedChannels.length === 0) {
        selectedText.textContent = 'All Channels';
    } else if (selectedChannels.length === 1) {
        selectedText.textContent = selectedChannels[0];
    } else {
        selectedText.innerHTML = `${selectedChannels.length} Channels <span class="selected-count">${selectedChannels.length}</span>`;
    }
}

function getMonthsBetweenDates(startDate, endDate) {
    const months = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (current <= endDate) {
        months.push({
            year: current.getFullYear().toString(),  // Ensure it's a string like item.year
            month: current.toLocaleString('en-US', { month: 'long' }).toUpperCase()
        });
        current.setMonth(current.getMonth() + 1);
    }

    return months;
}
// Function to render the home page tables
function renderTablesHomePage(items) {

    const root = document.getElementById('timeline-root-home-page');

    // Safety check
    if (!root) {
        console.warn('Home page root element not found');
        return;
    }

    // Sort items by date
    items.sort((a, b) => {
        const dateA = a.promo_type === "Loyalty Program"
            ? new Date(a.promo_end_date)
            : new Date(a.promo_start_date);

        const dateB = b.promo_type === "Loyalty Program"
            ? new Date(b.promo_end_date)
            : new Date(b.promo_start_date);

        return dateA - dateB; // Ascending order (oldest first)
    });

    // Get unique channels from all items
    const allChannels = new Set();
    items.forEach(item => {
        item.channel_tags.forEach(channel => {
            allChannels.add(channel);
        });
    });
    const uniqueChannels = Array.from(allChannels).sort();

    // Get unique channels from all items
    const allBudgetTypes = new Set();
    items.forEach(item => {
        item.promo_budget_type.forEach(promo_budget => {
            allBudgetTypes.add(promo_budget);
        });
    });
    const uniqueBudgetTypes = Array.from(allBudgetTypes).sort();

    // Get unique years from filtered items
    const uniqueYears = [...new Set(items.map(item => String(item.year)))].sort();

    // Month names for header
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

    let h1Title = '';
    if (
        selectedYears.includes('all') ||
        selectedYears.length === 0 ||
        selectedYears.length > 1
    ) {
        h1Title = 'Promotional Calendar - Icons by Channel and Month';
    } else {
        h1Title = `Promotional Calendar ${selectedYears[0]} - Icons by Channel and Month`;
    }

    let h1TitleBudget = '';
    if (
        selectedYears.includes('all') ||
        selectedYears.length === 0 ||
        selectedYears.length > 1
    ) {
        h1TitleBudget = 'Budget Calendar by Channel and Month';
    } else {
        h1TitleBudget = `Budget Calendar ${selectedYears[0]} by Channel and Month`;
    }

    // Build the table HTML
    let tableHTMLcalendar = '';

    uniqueYears.forEach((year, yearIndex) => {
        // Add year separator if multiple years
        if (uniqueYears.length > 1) {

            tableHTMLcalendar += `<tr class="year-marker-row"><td colspan="${months.length + 1}" class="year-marker-cell">${year}</td></tr>`;
        }

        // Create data structure for this year
        const yearData = {};
        uniqueChannels.forEach(channel => {
            yearData[channel] = {};
            months.forEach((month, index) => {
                yearData[channel][monthNames[index]] = [];
            });
        });

        // Populate data for this year
        items.filter(item => item.year === year).forEach(item => {
            // Get start and end dates for the promotion
            const startDate = new Date(item.promo_start_date);
            const endDate = new Date(item.promo_end_date);

            // Get all months between start and end date
            let promoMonths = [];

            if (item.promo_type === "Loyalty Program") {
                // Only end date's month
                promoMonths.push({
                    year: endDate.getFullYear().toString(),
                    month: endDate.toLocaleString('en-US', { month: 'long' }).toUpperCase()
                });
            } else {
                promoMonths = getMonthsBetweenDates(startDate, endDate);
            }


            // Add icon to each month of the promotion for each channel
            item.channel_tags.forEach(channel => {
                promoMonths.forEach(promoMonth => {
                    if (promoMonth.year === year && yearData[channel][promoMonth.month]) {
                        yearData[channel][promoMonth.month].push(item.icon);
                    }
                });
            });

        });

        uniqueChannels.forEach(channel => {
            const className = channel.includes("Loyalty") ? "channel-header-loyalty" : "channel-header";
            // Generate table rows for this year
            tableHTMLcalendar += `
        <tr class="${className}">
            <td>${channel}</td>
            ${months.map((month, index) => {
                const icons = yearData[channel][monthNames[index]];
                const iconString = icons.length > 0 ? icons.join('') : '-';
                return `<td class="${icons.length > 0 ? 'icon-cell' : 'empty-cell'}">${iconString}</td>`;
            }).join('')}
        </tr>
    `;
        });
    });

    // Build the table HTML
    let tableHTMLBudget = '';

    uniqueYears.forEach((year, yearIndex) => {
        // Add year separator if multiple years
        if (uniqueYears.length > 1) {

            tableHTMLBudget += `<tr class="year-marker-row"><td colspan="${months.length + 2}" class="year-marker-cell">${year}</td></tr>`;
        }

        // Create data structure for this year
        const yearData = {};
        uniqueBudgetTypes.forEach(promo_type => {
            yearData[promo_type] = {};
            months.forEach((month, index) => {
                yearData[promo_type][monthNames[index]] = 0;
            });
        });


        items.filter(item => item.year === year).forEach(item => {
            const budgetTypes = item.promo_budget_type;
            const budgets = Array.isArray(item.promo_budget) ? item.promo_budget : [item.promo_budget];
            const HL = Array.isArray(item.promo_uplift_HL) ? item.promo_uplift_HL : [item.promo_uplift_HL];
            const Machines = Array.isArray(item.promo_uplift_machine) ? item.promo_uplift_machine : [item.promo_uplift_machine];


            budgetTypes.forEach((budgetType, index) => {
                const budgetValue = parseFloat(budgets[index] || 0);
                if (yearData[budgetType] && yearData[budgetType][item.month] !== undefined) {
                    yearData[budgetType][item.month] += budgetValue;
                }
            });
        });

        // Generate table rows for this year
        uniqueBudgetTypes.forEach(budgetType => {
            tableHTMLBudget += `
            <tr>
            <td class="channel-header">${budgetType}</td>
            ${months.map((month, index) => {
                // MODIFICATION: Format the final summed value
                const totalBudget = yearData[budgetType][monthNames[index]];
                const budgetString = totalBudget > 0 ? totalBudget.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }) : '-';
                return `<td class="${totalBudget > 0 ? 'data-cell' : 'empty-cell'}">${budgetString}</td>`;
            }).join('')}

            <td class="data-cell">
    ${Object.values(yearData[budgetType]).reduce((sum, val) => sum + val, 0).toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            })}
</td>
            </tr>
        `;
        });
    });




    // Build the table HTML
    let tableHTMLUplift = '';

    uniqueYears.forEach((year, yearIndex) => {

        if (uniqueYears.length > 1) {

            tableHTMLUplift += `<tr class="year-marker-row"><td colspan="${months.length + 2}" class="year-marker-cell">${year}</td></tr>`;
        }

        // Create data structure for this year (just months)
        const yearData = {};
        months.forEach((month, index) => {
            yearData[monthNames[index]] = {
                HL: 0,
                machines: 0,
                MACO: 0
            };
        });


        items.filter(item => item.year === year).forEach(item => {
            const HL = Array.isArray(item.promo_uplift_HL) ? item.promo_uplift_HL : [item.promo_uplift_HL];
            const HLvalue = parseFloat(HL[0] || 0);

            const MACO = Array.isArray(item.MACO) ? item.MACO : [item.MACO];
            const MACOvalue = parseFloat(MACO[0] || 0);

            // Handle machines uplift (assuming similar structure)
            const machines = Array.isArray(item.promo_uplift_machine) ? item.promo_uplift_machine : [item.promo_uplift_machine];
            const machinesValue = parseFloat(machines[0] || 0);

            // Sum up by month (all promo types combined)
            if (yearData[item.month]) {
                yearData[item.month].HL += HLvalue;
                yearData[item.month].machines += machinesValue;
                yearData[item.month].MACO += MACOvalue;
            }
        })

        tableHTMLUplift += `
            <tr>
            <td class="channel-header">HL Uplift</td>
            ${months.map((month, index) => {
            const totalHL = yearData[monthNames[index]].HL;
            return `<td class="${totalHL > 0 ? 'data-cell' : 'empty-cell'}">${totalHL > 0 ? totalHL.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '-'}</td>`;
        }).join('')}
            <td class="data-cell">
                ${Object.values(yearData).reduce((sum, m) => sum + m.HL, 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            </td>
            </tr>

            <tr>
            <td class="channel-header">MACO</td>
            ${months.map((month, index) => {
            const totalMACO = yearData[monthNames[index]].MACO;
            return `<td class="${totalMACO > 0 ? 'data-cell' : 'empty-cell'}">${totalMACO > 0 ? totalMACO.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '-'}</td>`;
        }).join('')}
            <td class="data-cell">
                ${Object.values(yearData).reduce((sum, m) => sum + m.MACO, 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
            </td>
            </tr>

            <tr>
            <td class="channel-header">Machines Uplift</td>
            ${months.map((month, index) => {
            const totalMachines = yearData[monthNames[index]].machines;
            return `<td class="${totalMachines > 0 ? 'data-cell' : 'empty-cell'}">${totalMachines > 0 ? totalMachines.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '-'}</td>`;
        }).join('')}
            <td class="data-cell">
                ${Object.values(yearData).reduce((sum, m) => sum + m.machines, 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            </td>
            </tr>
    `;
    });

    root.innerHTML = `
        <h1>${h1Title}</h1>
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
                    <th style="width: 150px;">Channel</th>
                    ${months.map(month => `<th class="month-header">${month}</th>`).join('')}
                    <th class="month-header">Total</th>
                </tr>
            </thead>
            <tbody>
                ${tableHTMLBudget}
            </tbody>
        </table>

        <table class="promo-table-HomePage" style="margin-top: 30px;">
            <thead class="promo-table-HomePage-header">
                <tr>
                    <th class="first-col-header">UPLIFT</th>
                    ${months.map(month => `<th class="month-header">${month}</th>`).join('')}
                    <th class="month-header">Total</th>
                </tr>
            </thead>
            <tbody>
                ${tableHTMLUplift}
            </tbody>
        </table>
    `;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    // Initialize the app when DOM is ready
    initializeApp();

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (event) {
        const channelContainer = document.querySelector('#channelDropdown')?.closest('.multiselect-container');
        const yearContainer = document.querySelector('#yearDropdown')?.closest('.multiselect-container');

        // Close channel dropdown
        if (channelContainer && !channelContainer.contains(event.target)) {
            document.getElementById('channelDropdown')?.classList.remove('show');
            document.getElementById('dropdownArrow')?.classList.remove('rotated');
        }

        // Close year dropdown
        if (yearContainer && !yearContainer.contains(event.target)) {
            document.getElementById('yearDropdown')?.classList.remove('show');
            document.getElementById('yearDropdownArrow')?.classList.remove('rotated');
        }
    });
});

// Function to save filters to URL
function saveFiltersToURL() {
    const params = new URLSearchParams();

    // Save selected years (skip if 'all' is selected)
    if (!selectedYears.includes('all') && selectedYears.length > 0) {
        params.set('years', selectedYears.join(','));
    }

    // Update URL without page reload
    const newURL = params.toString() ?
        `${window.location.pathname}?${params.toString()}` :
        window.location.pathname;

    window.history.replaceState({}, '', newURL);
}

// Function to load filters from URL
function loadFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);


    // Load years from URL
    const yearsParam = params.get('years');
    if (yearsParam) {
        selectedYears = yearsParam.split(',').filter(year => year.trim() !== '');
        if (selectedYears.length === 0) {
            selectedYears = ['all'];
        }
    }
}

// Function to update checkboxes based on loaded filters
function updateCheckboxesFromFilters() {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        // Update year checkboxes
        document.querySelectorAll('#yearDropdown input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.value === 'all') {
                checkbox.checked = selectedYears.includes('all');
            } else {
                checkbox.checked = selectedYears.includes(checkbox.value);
            }
        });

        // Update display text
        updateSelectedYearText();
    }, 10);
}

// Modified handleYearOptionChange function (replace your existing one)
function handleYearOptionChange(checkbox) {
    const allYearCheckbox = document.getElementById('year_all');

    if (checkbox.value === 'all') {
        if (checkbox.checked) {
            selectedYears = ['all'];
            document.querySelectorAll('#yearDropdown input[type="checkbox"]').forEach(cb => {
                cb.checked = cb.value === 'all';
            });
        } else {
            selectedYears = [];
        }
    } else {
        if (allYearCheckbox) allYearCheckbox.checked = false;

        if (checkbox.checked) {
            if (!selectedYears.includes(checkbox.value)) {
                selectedYears = selectedYears.filter(year => year !== 'all');
                selectedYears.push(checkbox.value);
            }
        } else {
            selectedYears = selectedYears.filter(year => year !== checkbox.value);

            if (selectedYears.length === 0) {
                selectedYears = ['all'];
                if (allYearCheckbox) allYearCheckbox.checked = true;
            }
        }
    }

    updateSelectedYearText();
    saveFiltersToURL(); // Save to URL when filters change
    applyFilters();
}

// Modified initializeApp function (replace your existing one)
async function initializeApp() {
    try {
        // Check if required DOM elements exist
        const timelineRoot = document.getElementById('timeline-root');
        const homePageRoot = document.getElementById('timeline-root-home-page');

        if (!timelineRoot && !homePageRoot) {
            console.warn('No timeline containers found in DOM');
            return;
        }

        // Load filters from URL before loading data
        loadFiltersFromURL();

        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has('years')) {
            selectedYears = ['2026']
        }
        // Load both datasets concurrently
        await Promise.all([
            loadTableData(),
            loadTimelineData()
        ]);

        // Update checkboxes to match loaded filters
        updateCheckboxesFromFilters();

        // Apply filters and render
        applyFilters();

    } catch (error) {
        console.error('Error initializing app:', error);
        // Show error in available containers
        const timelineRoot = document.getElementById('timeline-root');
        const homePageRoot = document.getElementById('timeline-root-home-page');

        const errorMessage = '<p style="color:red;">Failed to load timeline data.</p>';

        if (timelineRoot) {
            timelineRoot.innerHTML = errorMessage;
        }
        if (homePageRoot) {
            homePageRoot.innerHTML = errorMessage;
        }
    }
}