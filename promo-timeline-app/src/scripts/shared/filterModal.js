// scripts/shared/filterModal.js

import { supabase } from '../supabaseAuth.js';

const FILTERS_STORAGE_KEY = 'promoAppFilters';

/**
 * Initializes the filter modal, sets up custom dropdowns.
 */
export async function initFilterModal() {
    try {
        const response = await fetch('scripts/shared/filterModal.html');
        if (!response.ok) throw new Error('Failed to load modal HTML');
        const modalHTML = await response.text();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        console.error("Error initializing filter modal:", error);
        return;
    }

    const modal = document.getElementById('filterModal');
    const openBtn = document.getElementById('openFilterModalBtn');
    const closeBtn = document.getElementById('closeFilterModalBtn');
    const filterForm = document.getElementById('filterForm');
    const resetBtn = document.getElementById('resetFiltersBtn');

    openBtn?.addEventListener('click', () => modal.style.display = 'flex');
    closeBtn?.addEventListener('click', () => modal.style.display = 'none');
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    filterForm?.addEventListener('submit', handleApplyFilters);
    resetBtn?.addEventListener('click', handleResetFilters);

    setupCustomDropdowns();
    await populateFilterDropDowns();
    loadFilters();
}

function setupCustomDropdowns() {
    const dropdowns = document.querySelectorAll('.custom-multiselect');

    dropdowns.forEach(dropdown => {
        const selectBox = dropdown.querySelector('.select-box');
        const optionsContainer = dropdown.querySelector('.dropdown-options');

        selectBox.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other dropdowns
            document.querySelectorAll('.dropdown-options.show').forEach(openDropdown => {
                if (openDropdown !== optionsContainer) {
                    openDropdown.classList.remove('show');
                    openDropdown.closest('.custom-multiselect').querySelector('.select-box').classList.remove('open');
                }
            });
            // Toggle current dropdown
            optionsContainer.classList.toggle('show');
            selectBox.classList.toggle('open');
        });

        // Add event listener to the container and delegate to checkboxes
        optionsContainer.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                updateSelectedText(dropdown);
            }
        });
    });

    // Close dropdowns when clicking outside
    window.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-options.show').forEach(openDropdown => {
            openDropdown.classList.remove('show');
            openDropdown.closest('.custom-multiselect').querySelector('.select-box').classList.remove('open');
        });
    });
}

function updateSelectedText(dropdown) {
    const selectedTextEl = dropdown.querySelector('.selected-text');
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:checked');
    const placeholder = dropdown.dataset.placeholder || 'Select option(s)';

    if (checkboxes.length === 0) {
        selectedTextEl.textContent = placeholder;
    } else if (checkboxes.length === 1) {
        selectedTextEl.textContent = checkboxes[0].parentElement.querySelector('label').textContent;
    } else {
        selectedTextEl.textContent = `${checkboxes.length} items selected`;
    }
    
    // Special handling for country to update BU
    if (dropdown.dataset.filterKey === 'country') {
        updateBU();
    }
}


async function populateFilterDropDowns() {
    const { data, error } = await supabase.from('promo_items').select('promo_type, channel_tags, author, owner, status, country, promo_budget_type');
    if (error) {
        console.error("Error fetching distinct filter values:", error);
        return;
    }

    const distinct = {
        promo_type: [...new Set(data.map(i => i.promo_type).filter(Boolean))].sort(),
        channel_tags: [...new Set(data.flatMap(i => i.channel_tags || []).filter(Boolean))].sort(),
        author: [...new Set(data.map(i => i.author).filter(Boolean))].sort(),
        owner: [...new Set(data.map(i => i.owner).filter(Boolean))].sort(),
        status: [...new Set(data.map(i => i.status).filter(Boolean))].sort(),
        country: [...new Set(data.map(i => i.country).filter(Boolean))].sort(),
        promo_budget_type: [...new Set(data.flatMap(i => i.promo_budget_type || []).filter(Boolean))].sort(),
    };

    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear + 2; i >= currentYear - 2; i--) {
        years.push(String(i));
    }
    
    populateCustomDropdown('year', years);
    populateCustomDropdown('status', distinct.status);
    populateCustomDropdown('promo_type', distinct.promo_type);
    populateCustomDropdown('channel_tags', distinct.channel_tags);
    populateCustomDropdown('country', distinct.country);
    populateCustomDropdown('author', distinct.author);
    populateCustomDropdown('owner', distinct.owner);
    populateCustomDropdown('promo_budget_type', distinct.promo_budget_type);
}

function populateCustomDropdown(filterKey, options) {
    const dropdown = document.querySelector(`.custom-multiselect[data-filter-key="${filterKey}"]`);
    if (!dropdown) return;
    const optionsContainer = dropdown.querySelector('.dropdown-options');
    
    options.forEach(option => {
        const optionId = `${filterKey}-${option.replace(/[^a-zA-Z0-9]/g, '-')}`; // Sanitize ID
        const optionHTML = `
            <div class="option-item">
                <input type="checkbox" value="${option}" id="${optionId}">
                <label for="${optionId}">${option}</label>
            </div>
        `;
        optionsContainer.insertAdjacentHTML('beforeend', optionHTML);
    });
}

function saveFilters() {
    const filters = {};
    document.querySelectorAll('.custom-multiselect').forEach(dropdown => {
        const key = dropdown.dataset.filterKey;
        const checked = dropdown.querySelectorAll('input:checked');
        if (checked.length > 0) {
            filters[key] = Array.from(checked).map(cb => cb.value);
        }
    });
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
}

function loadFilters() {
    const filters = getSavedFilters();
    for (const key in filters) {
        const dropdown = document.querySelector(`.custom-multiselect[data-filter-key="${key}"]`);
        if (dropdown && Array.isArray(filters[key])) {
            filters[key].forEach(value => {
                // Use querySelector with attribute selector for values that may contain special characters
                const checkbox = dropdown.querySelector(`input[value="${value}"]`);
                if (checkbox) checkbox.checked = true;
            });
            updateSelectedText(dropdown);
        }
    }
}

function handleApplyFilters(e) {
    e.preventDefault();
    saveFilters();
    document.getElementById('filterModal').style.display = 'none';
    document.dispatchEvent(new CustomEvent('filtersApplied'));
}

function handleResetFilters() {
    document.querySelectorAll('.custom-multiselect input:checked').forEach(cb => cb.checked = false);
    document.querySelectorAll('.custom-multiselect').forEach(updateSelectedText);
    saveFilters(); // Saves the empty state
    document.getElementById('filterModal').style.display = 'none';
    document.dispatchEvent(new CustomEvent('filtersApplied'));
}

function updateBU() {
    const buInput = document.getElementById('filterBU');
    const countryDropdown = document.querySelector('.custom-multiselect[data-filter-key="country"]');
    if (!buInput || !countryDropdown) return;
    
    const selectedCountries = Array.from(countryDropdown.querySelectorAll('input:checked')).map(cb => cb.value);
    
    if (selectedCountries.length !== 1) {
        buInput.value = selectedCountries.length > 1 ? 'Multiple Countries Selected' : '';
        return;
    }

    const country = selectedCountries[0];
    let bu = '';
    if (['Belgium', 'France', 'Luxembourg', 'Netherlands'].includes(country)) bu = 'BNFL';
    else if (['England', 'Northern Ireland'].includes(country)) bu = 'BU WEST';
    else if (['Switzerland', 'Italy', 'Czech Republic', 'Germany'].includes(country)) bu = 'BU CENTRAL';
    buInput.value = bu;
}

export function getSavedFilters() {
    try {
        return JSON.parse(localStorage.getItem(FILTERS_STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
}