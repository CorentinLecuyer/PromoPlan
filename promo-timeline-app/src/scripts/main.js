let allTimelineItems = [];
let allTableData = [];
let selectedChannels = ['all'];
let selectedYears = ['all']; // Changed from selectedYear

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
        // Load both datasets concurrently
        await Promise.all([
            loadTableData(),
            loadTimelineData()
        ]);

        // Render timeline once both datasets are loaded
        renderTimeline(allTimelineItems);
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Call initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Function to generate HTML table
function generateTableHTML(tableObj) {
    if (!tableObj) return '';

    return `
        <div class="table-container ${tableObj.style}">
            <h3 class="table-title">${tableObj.table}</h3>
            <table class="promo-table">
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

function renderTimeline(items) {
    const root = document.getElementById('timeline-root');

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

        // Determine the month label for grouping (e.g., "January 2025")
        const monthMarker = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

        // Show month marker only if different from the last one
        const showMonthMarker = monthMarker !== lastMonthMarker;
        lastMonthMarker = monthMarker;

        // Determine the year label for grouping (e.g., "January 2025")
        const YearMarker = startDate.toLocaleString('en-US', { year: 'numeric' });

        // Show month marker only if different from the last one
        const showYearMarker = YearMarker !== lastYearMarker;
        lastYearMarker = YearMarker;

        // Check if item has a table and get table data
        const hasTable = item.table && item.table !== "none";
        const tableHTML = hasTable ? generateTableHTML(getTableById(item.table)) : '';

        // Check if item has a budget and get table data
        const hasBudget = item.promo_budget && item.promo_budget !== 0;
        const tableHTMLBudget = hasBudget ? generateTableHTML(getTableById(item.table)) : '';

        return `
            ${showYearMarker ? `<div class="year-marker">${YearMarker}</div>` : ""}
          <div class="timeline-item">
              ${showMonthMarker ? `<div class="month-marker">${monthMarker}</div>` : ""}
            <div class="timeline-content">
              <div class="promo-type ${item.promo_type.toLowerCase().replace(/\s+/g, '-')}">${item.promo_type}</div>
              <div class="promo-title">${item.promo_title}</div>
              <div class="promo-date"> ${formattedStartDate} - ${formattedEndDate} </div>
              <div class="promo-details">
                ${item.promo_details.map(line => `• ${line}<br>`).join("")}
              </div>
              <div class="channel-tags">
                ${item.channel_tags.map(ch => `<span class="channel-tag">${ch}</span>`).join("")}
              </div>

              ${tableHTML}
              ${hasBudget ? `
                <h3 class="table-title">Budget Details // Financials</h3>
                <table class="promo-table-budget">
                    <thead>
                        <tr>
                            <th>Budget</th>
                            <th>Budget Type</th>
                            <th>Uplift</th>
                            <th>ROI</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th>${item.promo_budget.toLocaleString('fr-FR', { 
                                style: 'currency', 
                                currency: 'EUR',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                                })}
                            </th>

                            <th><div class="channel-tags-budget">${item.promo_budget_type.map(ch => `<span class="channel-tag-budget">${ch}</span>`).join("")}</div></th>
                            <th>${item.promo_uplift}</th>
                            <th>${item.ROI}</th>
                        </tr>
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
        `}).join("")}
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
}

// YEAR MULTI-SELECT FUNCTIONS
function toggleYearDropdown() {
    const dropdown = document.getElementById('yearDropdown');
    const arrow = document.getElementById('yearDropdownArrow');

    dropdown.classList.toggle('show');
    arrow.classList.toggle('rotated');
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
        allYearCheckbox.checked = false;

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
                allYearCheckbox.checked = true;
            }
        }
    }

    updateSelectedYearText();
    applyFilters();
}

function updateSelectedYearText() {
    const selectedText = document.getElementById('selectedYearText');

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

    dropdown.classList.toggle('show');
    arrow.classList.toggle('rotated');
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
        allCheckbox.checked = false;

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
                allCheckbox.checked = true;
            }
        }
    }

    updateSelectedText();
    applyFilters();
}

function updateSelectedText() {
    const selectedText = document.getElementById('selectedText');

    if (selectedChannels.includes('all') || selectedChannels.length === 0) {
        selectedText.textContent = 'All Channels';
    } else if (selectedChannels.length === 1) {
        selectedText.textContent = selectedChannels[0];
    } else {
        selectedText.innerHTML = `${selectedChannels.length} Channels <span class="selected-count">${selectedChannels.length}</span>`;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
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

// Load data and initialize
fetch('./db/timeline-items.json')
    .then(response => response.json())
    .then(data => {
        allTimelineItems = data;
        renderTimeline(allTimelineItems);
    })
    .catch(error => {
        document.getElementById('timeline-root').innerHTML = '<p style="color:red;">Failed to load timeline data.</p>';
        console.error(error);
    });

