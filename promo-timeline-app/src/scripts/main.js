let allTimelineItems = [];

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

function applyYearFilter(selectedYear) {
    if (selectedYear === "all") {
        renderTimeline(allTimelineItems);
    } else {
        // Filter by the "year" property in each item
        const filteredItems = allTimelineItems.filter(item => item.year === selectedYear);
        renderTimeline(filteredItems);
    }
}

// Wait for the DOM to be ready (script is at the bottom of <body>, so this will work)
document.getElementById('yearFilter').addEventListener('change', (e) => {
    applyYearFilter(e.target.value);
});

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
