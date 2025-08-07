// scripts/utils.js

/**
 * Safely parses a JSON string that might represent an array or a single value.
 * Handles cases where the input is null, 'none', or invalid JSON.
 * This is crucial if your Supabase columns are `TEXT` and store JSON-like strings.
 * If you configure your Supabase columns as `JSONB`, this function might become obsolete
 * for those specific columns as Supabase client would auto-parse.
 * @param {string|null|undefined} jsonString - The string to parse.
 * @returns {Array<string>} An array of strings.
 */
export function parseJsonArray(jsonString) {
    if (!jsonString || jsonString === 'none') {
        return [];
    }
    // Only attempt JSON.parse if it's actually a string that looks like JSON
    if (typeof jsonString === 'string' && (jsonString.startsWith('[') || jsonString.startsWith('{'))) {
        try {
            const parsed = JSON.parse(jsonString);
            if (Array.isArray(parsed)) {
                return parsed.map(String);
            }
            return [String(parsed)];
        } catch (e) {
            console.warn('Failed to parse JSON string (might already be an array or non-JSON string), returning as single element array:', jsonString, e);
            return [String(jsonString)]; // Fallback
        }
    }
    // If it's already an array, or a non-JSON string, return as is (or wrap if not an array)
    if (Array.isArray(jsonString)) {
        return jsonString.map(String); // Ensure elements are strings
    }
    return [String(jsonString)]; // Wrap single values
}
/**
 * Processes raw promotional items fetched from Supabase, parsing stringified JSON arrays
 * and ensuring correct data types.
* @param {Array<object>} rawItems - The raw items directly from Supabase.
 * @returns {Array<object>} The processed timeline items.
 */
export function processTimelineItems(rawItems) {
    return rawItems.map(item => ({
        ...item,
        promo_details: item.promo_details || [],
        promo_budget: (item.promo_budget || []).map(Number),
        promo_budget_type: item.promo_budget_type || [],
        channel_tags: item.channel_tags || [],
        table: (item.table_name && item.table_name.length > 0) ? item.table_name.map(String) : 'none',
        year: String(new Date(item.promo_start_date).getFullYear()),
        ROI: isNaN(parseFloat(item.ROI)) ? item.ROI : parseFloat(item.ROI),
        MACO: parseFloat(item.MACO) || 0,
        // --- ADD THESE LINES FOR bgcolor and bordercolor ---
        // Assuming bgcolor is text[] or text, and bordercolor is text
        // Ensure bgcolor is an array for consistent gradient logic, even if single string in DB
        bgcolor: Array.isArray(item.bgcolor) ? item.bgcolor : (item.bgcolor ? [item.bgcolor] : []),
        bordercolor: item.bordercolor || ''
        // --- END ADDITION ---
    })).sort((a, b) => {
        const dateA = (a.promo_type === "Loyalty Program") ? new Date(a.promo_end_date) : new Date(a.promo_start_date);
        const dateB = (b.promo_type === "Loyalty Program") ? new Date(b.promo_end_date) : new Date(b.promo_start_date);
        return dateA - dateB;
    });
}

/**
 * Processes raw display table data fetched from Supabase, parsing stringified JSON arrays.
 * @param {Array<object>} rawTables - The raw tables directly from Supabase.
 * @returns {Array<object>} The processed table data.
 */
export function processDisplayTables(rawTables) {
    return rawTables.map(table => {
        const headers = table.th || []; // Already a native JS array (e.g., ['Tier Level', 'Benefits'])
        const rawRows = table.tr || []; // This is the problematic one: a flat array (e.g., ['Tier 1', '1% discount', 'Tier 2', '2% discount'])

        const numColumns = headers.length;
        let formattedRows = [];

        // If there are headers, and rows can be logically grouped by column count
        if (numColumns > 0) {
            for (let i = 0; i < rawRows.length; i += numColumns) {
                // Slice rawRows into chunks, each representing a row
                formattedRows.push(rawRows.slice(i, i + numColumns));
            }
        } else {
            // Handle cases where 'th' might be empty or table is just an image (like Table ID 4, 5, etc.)
            // If numColumns is 0, each item in rawRows is considered a single cell row.
            // Example for images: ["<img style=\"...\" src=\"img/Parasol Leffe.PNG\">"]
            // If it's a single element, wrap it in an array to match expected [[cell]] structure
            formattedRows = rawRows.map(cell => [cell]);
        }


        return {
            ...table,
            th: headers.map(String), // Ensure headers are strings
            tr: formattedRows // Now tr is an array of arrays
        };
    });
}


/**
 * Formats a date range for display.
 * @param {string} startDateStr - The start date string (YYYY-MM-DD).
 * @param {string} endDateStr - The end date string (YYYY-MM-DD).
 * @returns {string} Formatted date range (e.g., "1 Jan - 31 Dec 2026").
 */
export function formatDateRange(startDateStr, endDateStr) {
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
export function getMonthsBetweenDates(startDate, endDate) {
    const months = [];
    // Create new Date objects to avoid modifying the original dates passed in
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()); // Use end date for loop condition

    // Defensive check: Ensure dates are valid
    if (isNaN(current.getTime()) || isNaN(end.getTime())) {
        console.error("Invalid date passed to getMonthsBetweenDates:", startDate, endDate);
        return [];
    }

    while (current <= end) { // Loop until current date is past the end month
        const monthName = current.toLocaleString('en-US', { month: 'long' });
        if (monthName) { // Ensure monthName is not empty/null before toUpperCase
            months.push({
                year: current.getFullYear().toString(),
                month: monthName.toUpperCase()
            });
        }
        // Move to the next month
        current.setMonth(current.getMonth() + 1);
    }

    return months;
}

/**
 * Converts a comma-separated string to an array of trimmed strings.
 * Filters out empty strings.
 * @param {string} str - The input string (e.g., "tag1, tag2").
 * @returns {Array<string>} An array of strings.
 */
export function stringToArray(str) {
    if (typeof str !== 'string' || str.trim() === '') {
        return [];
    }
    return str.split(',').map(s => s.trim()).filter(s => s !== '');
}

/**
 * Converts a comma-separated string to an array of numbers.
 * Filters out non-numeric values.
 * @param {string} str - The input string (e.g., "100,200").
 * @returns {Array<number>} An array of numbers.
 */
export function stringToNumberArray(str) {
    if (typeof str !== 'string' || str.trim() === '') {
        return [];
    }
    return str.split(',').map(Number).filter(n => !isNaN(n));
}

/**
 * Converts an array to a comma-separated string.
 * @param {Array} arr - The input array.
 * @returns {string} A comma-separated string.
 */
export function arrayToString(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
        return '';
    }
    return arr.join(', ');
}

export function downloadTableAsCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) {
        console.error(`Table with ID "${tableId}" not found.`);
        return;
    }

    let csv = [];
    const rows = table.querySelectorAll("tr");
    
    for (const row of rows) {
        const rowData = [];
        const cols = row.querySelectorAll("td, th");
        
        for (const col of cols) {
            // --- MODIFIED LOGIC ---
            // 1. Prioritize the raw data value for numbers.
            // 2. For text, clean it by removing currency symbols and non-breaking spaces.
            let data = col.dataset.value !== undefined 
                ? col.dataset.value 
                : col.innerText.replace(/[\s€,]/g, '').trim();
            
            // 3. Sanitize for CSV: escape double quotes.
            data = String(data).replace(/"/g, '""');
            rowData.push(`"${data}"`);
        }
        csv.push(rowData.join(","));
    }

    // 4. Add a BOM (Byte Order Mark) for better Excel compatibility with UTF-8 characters.
    const bom = "\uFEFF";
    const csvContent = "data:text/csv;charset=utf-8," + bom + csv.join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
} 