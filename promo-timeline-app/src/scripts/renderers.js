import { appState } from './state.js';
import { formatDateRange, getMonthsBetweenDates } from './utils.js';

export function getTableDataById(tableId) {
    return appState.allTableData.find(table => String(table.id) === String(tableId));
}

export function generateTableHTML(tableObj) {
    if (!tableObj) return '';

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
                    ${tableRows.map(rowContent => {
        let cellsHTML = '';
        if (Array.isArray(rowContent)) {
            cellsHTML = rowContent.map(cell => `<td>${cell}</td>`).join('');
        } else {
            cellsHTML = `<td colspan="${tableHeaders.length || 1}">${rowContent}</td>`;
        }
        return `
                            <tr>
                                ${cellsHTML}
                            </tr>
                        `;
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
        ${appState.allTimelineItems.map(item => { // Loop starts here
            const startDate = new Date(item.promo_start_date);
            const formattedDate = formatDateRange(item.promo_start_date, item.promo_end_date);

            const specialDate = item.promo_type === "Loyalty Program"
                ? new Date(item.promo_end_date)
                : new Date(item.promo_start_date);

            const monthMarker = specialDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
            const showMonthMarker = monthMarker !== lastMonthMarker;
            lastMonthMarker = monthMarker;

            const yearMarker = String(startDate.getFullYear());
            const showYearMarker = yearMarker !== lastYearMarker;
            lastYearMarker = yearMarker;

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

            let timelineContentBorderAndBg = '';
            let promoTypeBgColor = '';
            let timelineDotBorder = '';

            if (item.bordercolor && item.bordercolor !== '') {
                timelineContentBorderAndBg = `border-left: 4px solid ${item.bordercolor};`;
                promoTypeBgColor = `background-color: ${item.bordercolor};`;
                timelineDotBorder = `border: 3px solid ${item.bordercolor};`;
            }

            const combinedInlineContentStyle = `style="${inlineBgStyle} ${timelineContentBorderAndBg}"`;
            const combinedPromoTypeStyle = `style="${promoTypeBgColor}"`;

/*             const sanitizedPromoType = item.promo_type || 'N/A'; // Use 'N/A' or an empty string as a default
            const promoTypeClass = sanitizedPromoType.toLowerCase().replace(/\s+/g, '-'); // <--- FIX IS HERE */

            return `
                    ${showYearMarker ? `<div class="year-marker">${yearMarker}</div>` : ""}
                  <div class="timeline-item">
                      ${showMonthMarker ? `<div class="month-marker">${monthMarker}</div>` : ""}
                    <div class="${timelineContentClass}" ${combinedInlineContentStyle}>
                      <div class="promo-type ${item.promo_type.toLowerCase().replace(/\s+/g, '-')}" ${combinedPromoTypeStyle}>${item.promo_type}</div>
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
                      <div class="icon-container" style="${timelineDotBorder} ${iconContainerStyle}">
                        <div class="icon-emoji">${item.icon}</div>
                      </div>
                      <div class="timeline-dot" style="${timelineDotBorder} ${iconContainerStyle}"></div>
                    </a>
                  </div>
                `;
        }).join("")}
      </div>
    </div>
  `;
}


// ------------------------------------------------------------------------------------------------------------------------

/**
 * Renders the home page calendar tables (icons, budget, uplift) into the DOM.
 */
export function renderTablesHomePage() {
    const root = document.getElementById('timeline-root-home-page');
    if (!root) {
        return;
    }

    const allChannels = new Set();
    const allBudgetTypesSet = new Set();

    appState.allTimelineItems.forEach(item => {
        item.channel_tags.forEach(channel => allChannels.add(channel));
        if (Array.isArray(item.promo_budget_type)) {
            item.promo_budget_type.forEach(type => allBudgetTypesSet.add(type));
        }
    });

    allBudgetTypesSet.add("Loyalty Program");
    const uniqueBudgetTypes = Array.from(allBudgetTypesSet).sort();

    const uniqueChannels = Array.from(allChannels).sort();

    const allYearsInData = [...new Set(appState.allTimelineItems.map(item => String(item.year)))];
    const yearsToRender = appState.selectedYears.includes('all')
        ? allYearsInData.sort()
        : appState.selectedYears.sort();


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

    yearsToRender.forEach(year => { // Loop through the years relevant for rendering
        // Define items for icon aggregation (span across years)
        const itemsRelevantForThisYearBlock = appState.allTimelineItems.filter(item => {
            const promoStartYear = new Date(item.promo_start_date).getFullYear();
            const promoEndYear = new Date(item.promo_end_date).getFullYear();
            const currentRenderYear = parseInt(year);

            return (promoStartYear <= currentRenderYear && promoEndYear >= currentRenderYear);
        });

        // Define items for financial aggregation (start in this year only)
        const itemsForFinancialAggregation = appState.allTimelineItems.filter(item => String(item.year) === year);


        if (yearsToRender.length > 1) {
            tableHTMLcalendar += `<tr class="year-marker-row"><td colspan="${months.length + 2}" class="year-marker-cell">${year}</td></tr>`;
            tableHTMLBudget += `<tr class="year-marker-row"><td colspan="${months.length + 2}" class="year-marker-cell">${year}</td></tr>`;
            tableHTMLUplift += `<tr class="year-marker-row"><td colspan="${months.length + 2}" class="year-marker-cell">${year}</td></tr>`;
        }

        // Calendar Icons Data Aggregation
        const yearIconsData = {};
        uniqueChannels.forEach(channel => {
            yearIconsData[channel] = {};
            monthNamesFull.forEach(month => yearIconsData[channel][month] = new Set());
        });

        itemsRelevantForThisYearBlock.forEach(item => {
            const startDate = new Date(item.promo_start_date);
            const endDate = new Date(item.promo_end_date);
            const promoMonthsSpanned = getMonthsBetweenDates(startDate, endDate);

            item.channel_tags.forEach(channel => {
                // --- MODIFIED: Loyalty Program icon on END date, others on SPANNED months ---
                if (item.promo_type === "Loyalty Program") {
                    const endMonthDate = new Date(item.promo_end_date);
                    const endMonthName = endMonthDate.toLocaleString('en-US', { month: 'long' }).toUpperCase(); // Get ONLY month name
                    const endYear = String(endMonthDate.getFullYear());

                    if (endYear === year && yearIconsData[channel] && yearIconsData[channel][endMonthName]) { // Use endMonthName
                        yearIconsData[channel][endMonthName].add(item.icon);
                    }
                } else {
                    // Normal promotions: icon appears on all spanned months within the current rendering year
                    promoMonthsSpanned.forEach(monthObj => {
                        if (monthObj.year === year && monthObj.month && yearIconsData[channel] && yearIconsData[channel][monthObj.month]) {
                            yearIconsData[channel][monthObj.month].add(item.icon);
                        }
                    });
                }
            });
        });


        // Financial Data Aggregation (Budget, Uplift, MACO)
        const yearFinancialData = {};
        monthNamesFull.forEach(month => {
            yearFinancialData[month] = { HL: 0, machines: 0, MACO: 0 };
        });
        const monthTotals = {};
        monthNamesFull.forEach(month => {
            monthTotals[month] = { HL: 0, machines: 0, MACO: 0 };
        });

        const yearBudgetByTypeData = {};
        const budgetTypeTotals = {};
        uniqueBudgetTypes.forEach(type => {
            yearBudgetByTypeData[type] = {};
            monthNamesFull.forEach(month => yearBudgetByTypeData[type][month] = 0);
            budgetTypeTotals[type] = 0;
        });

        itemsForFinancialAggregation.forEach(item => { // Use itemsForFinancialAggregation
            // --- MODIFIED: Determine attribution date based on promo type ---
            const attributionDate = item.promo_type === "Loyalty Program"
                ? new Date(item.promo_end_date)
                : new Date(item.promo_start_date);

            const attributionMonthFull = attributionDate.toLocaleString('en-US', { month: 'long' }).toUpperCase();
            const attributionYear = String(attributionDate.getFullYear());

            // Only aggregate if the attribution year matches the current rendering year
            if (attributionYear === year && attributionMonthFull && yearFinancialData[attributionMonthFull]) {
                yearFinancialData[attributionMonthFull].HL += item.promo_uplift_HL || 0;
                yearFinancialData[attributionMonthFull].machines += item.promo_uplift_machine || 0;
                yearFinancialData[attributionMonthFull].MACO += item.MACO || 0;

                monthTotals[attributionMonthFull].HL += item.promo_uplift_HL || 0;
                monthTotals[attributionMonthFull].machines += item.promo_uplift_machine || 0;
                monthTotals[attributionMonthFull].MACO += item.MACO || 0;
            }

            if (item.promo_type === "Loyalty Program") {
                const loyaltyBudgetValue = (item.promo_budget && item.promo_budget.length > 0) ? item.promo_budget[0] : 0;
                const loyaltyBudgetType = "Loyalty Program";

                // Only aggregate if the attribution year matches the current rendering year
                if (attributionYear === year && attributionMonthFull && yearBudgetByTypeData[loyaltyBudgetType] && yearBudgetByTypeData[loyaltyBudgetType][attributionMonthFull] !== undefined) {
                    yearBudgetByTypeData[loyaltyBudgetType][attributionMonthFull] += loyaltyBudgetValue;
                    budgetTypeTotals[loyaltyBudgetType] += loyaltyBudgetValue;
                }
            } else if (Array.isArray(item.promo_budget_type)) {
                item.promo_budget.forEach((budgetValue, index) => {
                    const type = item.promo_budget_type[index];
                    // Only aggregate if the attribution year matches the current rendering year
                    if (attributionYear === year && attributionMonthFull && yearBudgetByTypeData[type] && yearBudgetByTypeData[type][attributionMonthFull] !== undefined) {
                        yearBudgetByTypeData[type][attributionMonthFull] += budgetValue || 0;
                        budgetTypeTotals[type] += budgetValue || 0;
                    }
                });
            }
        });

        // Calculate Grand Totals for the footer row
        const grandTotalHL = Object.values(monthTotals).reduce((sum, month) => sum + month.HL, 0);
        const grandTotalMACO = Object.values(monthTotals).reduce((sum, month) => sum + month.MACO, 0);
        const grandTotalMachines = Object.values(monthTotals).reduce((sum, month) => sum + month.machines, 0);


        // Generate Calendar HTML for this year
        uniqueChannels.forEach(channel => {
            const className = channel.includes("Loyalty") ? "channel-header-loyalty" : "channel-header";
            tableHTMLcalendar += `
                <tr class="${className}">
                    <td>${channel}</td>
                    ${months.map((month, index) => {
                const iconsSet = yearIconsData[channel][monthNamesFull[index]];
                const iconsArray = Array.from(iconsSet);
                const iconString = iconsArray.length > 0 ? iconsArray.join('') : '-';
                return `<td class="${iconsArray.length > 0 ? 'icon-cell' : 'empty-cell'}">${iconString}</td>`;
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
                    <td>${budgetTypeTotals[budgetType].toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            })}</td>
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
                <td>${grandTotalHL.toLocaleString('fr-FR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        })}</td>
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
                <td>${grandTotalMACO.toLocaleString('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        })}</td>
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
                <td>${grandTotalMachines.toLocaleString('fr-FR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        })}</td>
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
            <p><strong>Note:</strong> Icons represent all months spanned (for non-Loyalty). Financials are attributed to the start month only (for non-Loyalty). For Loyalty Programs, both icon and financials are attributed to the END month.</p>
        </div>

        <h1 style="margin-top: 50px;">${h1TitleBudget}</h1>
        <table class="promo-table-HomePage" style="margin-top: 30px;">
            <thead class="promo-table-HomePage-header">
                <tr>
                    <th>Budget Type</th>
                    ${months.map(month => `<th class="month-header">${month}</th>`).join('')}
                    <th>Total</th>
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
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${tableHTMLUplift}
            </tbody>
        </table>
    `;
}