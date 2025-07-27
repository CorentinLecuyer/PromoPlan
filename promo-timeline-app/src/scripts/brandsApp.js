// scripts/brandsApp.js

import { supabase, signOut, getSession } from './supabaseAuth.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Authentication Check ---
    const session = await getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // --- DOM Elements ---
    const brandForm = document.getElementById('brandForm');
    const brandIdInput = document.getElementById('brandId');
    const brandNameInput = document.getElementById('brandName');
    const brandLogoInput = document.getElementById('brandLogo');
    const formMessage = document.getElementById('formMessage');
    const brandsListDiv = document.getElementById('brandsList');
    const clearFormButton = document.getElementById('clearFormButton');
    const logoutButton = document.getElementById('logoutButton');
    const existingLogoPreview = document.getElementById('existingLogoPreview');
    const logoPreviewImage = document.getElementById('logoPreviewImage');

    // --- State ---
    let allBrands = [];

    // --- Functions ---

    // Fetch all brands from the database
    const fetchBrands = async () => {
        const { data, error } = await supabase.from('brands').select('*').order('name');
        if (error) {
            console.error('Error fetching brands:', error);
            brandsListDiv.innerHTML = `<p style="color: red;">Error loading brands.</p>`;
            return;
        }
        allBrands = data;
        renderBrands();
    };

    // Render the list of brands
    const renderBrands = () => {
        if (allBrands.length === 0) {
            brandsListDiv.innerHTML = `<p>No brands found. Add one using the form above.</p>`;
            return;
        }

        brandsListDiv.innerHTML = allBrands.map(brand => `
            <div class="user-card">
                <img src="${brand.logo_medium_url || 'https://placehold.co/60x60/EEE/31343C?text=Logo'}" alt="${brand.name} Logo" 
                class="brand-logo"
                style="">
                <div class="user-card-details">
                    <p>${brand.name}</p>
                    <small>ID: ${brand.id}</small>
                </div>
                <div class="user-card-actions">
                    <button class="updateButton" data-action="edit" data-id="${brand.id}">Edit</button>
                    <button class="logoutButton" data-action="delete" data-id="${brand.id}">Delete</button>
                </div>
            </div>
        `).join('');
    };

    // Handle form submission for creating or updating a brand
    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const brandName = brandNameInput.value.trim();
        const logoFile = brandLogoInput.files[0];
        const brandId = brandIdInput.value;

        if (!brandName) {
            formMessage.textContent = 'Brand name is required.';
            formMessage.style.color = 'red';
            return;
        }

        let logoUrl = null;

        // 1. Upload logo if a new one is provided
        if (logoFile) {
            const filePath = `public/${Date.now()}-${logoFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from('brand-logos')
                .upload(filePath, logoFile);

            if (uploadError) {
                console.error('Error uploading logo:', uploadError);
                formMessage.textContent = 'Failed to upload logo.';
                formMessage.style.color = 'red';
                return;
            }

            // 2. Get the public URL of the uploaded file
            const { data: urlData } = supabase.storage
                .from('brand-logos')
                .getPublicUrl(filePath);

            // For simplicity, we'll use the same URL for all sizes.
            // In a real-world scenario, you might have different upload processes or functions
            // to generate different image sizes.
            logoUrl = urlData.publicUrl;
        }

        // 3. Prepare data for the database
        const brandData = {
            name: brandName,
        };
        
        // Only add logo URLs to the update object if a new logo was uploaded
        if (logoUrl) {
            brandData.logo_small_url = logoUrl;
            brandData.logo_medium_url = logoUrl;
            brandData.logo_large_url = logoUrl;
        }

        // 4. Upsert (Update or Insert) the data
        let error;
        if (brandId) {
            // Update existing brand
            const { error: updateError } = await supabase.from('brands').update(brandData).eq('id', brandId);
            error = updateError;
        } else {
            // Create new brand
            const { error: insertError } = await supabase.from('brands').insert([brandData]);
            error = insertError;
        }

        if (error) {
            console.error('Error saving brand:', error);
            formMessage.textContent = `Error saving brand: ${error.message}`;
            formMessage.style.color = 'red';
        } else {
            formMessage.textContent = 'Brand saved successfully!';
            formMessage.style.color = 'green';
            clearForm();
            await fetchBrands(); // Refresh the list
        }
    };
    
    // Populate the form for editing an existing brand
    const populateFormForEdit = (id) => {
        const brand = allBrands.find(b => b.id == id);
        if (brand) {
            brandIdInput.value = brand.id;
            brandNameInput.value = brand.name;

            if (brand.logo_medium_url) {
                logoPreviewImage.src = brand.logo_medium_url;
                existingLogoPreview.style.display = 'block';
            } else {
                existingLogoPreview.style.display = 'none';
            }
            
            window.scrollTo(0, 0); // Scroll to top to see the form
        }
    };

    // Delete a brand
    const deleteBrand = async (id) => {
        if (!confirm('Are you sure you want to delete this brand? This cannot be undone.')) {
            return;
        }
        const { error } = await supabase.from('brands').delete().eq('id', id);
        if (error) {
            console.error('Error deleting brand:', error);
            alert(`Failed to delete brand: ${error.message}`);
        } else {
            await fetchBrands(); // Refresh list
        }
    };

    // Clear form fields and messages
    const clearForm = () => {
        brandForm.reset();
        brandIdInput.value = '';
        formMessage.textContent = '';
        existingLogoPreview.style.display = 'none';
    };

    // --- Event Listeners ---
    brandForm.addEventListener('submit', handleFormSubmit);
    clearFormButton.addEventListener('click', clearForm);
    logoutButton.addEventListener('click', () => {
        signOut();
        window.location.href = 'login.html';
    });

    brandsListDiv.addEventListener('click', (event) => {
        const target = event.target;
        const action = target.dataset.action;
        const id = target.dataset.id;

        if (action === 'edit') {
            populateFormForEdit(id);
        } else if (action === 'delete') {
            deleteBrand(id);
        }
    });

    // --- Initial Load ---
    await fetchBrands();
});
