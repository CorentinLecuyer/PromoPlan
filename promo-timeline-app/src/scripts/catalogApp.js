// scripts/catalogApp.js

import { supabase, signOut, getSession } from './supabaseAuth.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Authentication Check ---
    const session = await getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // --- DOM Elements ---
    // Brand elements
    const brandForm = document.getElementById('brandForm');
    const brandIdInput = document.getElementById('brandId');
    const brandNameInput = document.getElementById('brandName');
    const brandLogoInput = document.getElementById('brandLogo');
    const brandFormMessage = document.getElementById('brandFormMessage');
    const brandsListDiv = document.getElementById('brandsList');
    const clearBrandFormButton = document.getElementById('clearBrandFormButton');
    const existingLogoPreview = document.getElementById('existingLogoPreview');
    const logoPreviewImage = document.getElementById('logoPreviewImage');

    // Product elements
    const productsSection = document.getElementById('productsSection');
    const productsHeader = document.getElementById('productsHeader');
    const productForm = document.getElementById('productForm');
    const productIdInput = document.getElementById('productId');
    const productNameInput = document.getElementById('productName');
    const productPackagingInput = document.getElementById('productPackaging');
    const productHlInput = document.getElementById('productHl');
    const productFormMessage = document.getElementById('productFormMessage');
    const productsListDiv = document.getElementById('productsList');
    const clearProductFormButton = document.getElementById('clearProductFormButton');
    
    // General elements
    const logoutButton = document.getElementById('logoutButton');

    // --- State ---
    let allBrands = [];
    let allProducts = [];
    let selectedBrandId = null;

    // --- RENDER FUNCTIONS ---
    const renderBrands = () => {
        if (allBrands.length === 0) {
            brandsListDiv.innerHTML = `<p>No brands found. Add one to get started.</p>`;
            return;
        }
        brandsListDiv.innerHTML = allBrands.map(brand => `
            <div class="user-card brand-card" data-brand-id="${brand.id}">
                <img src="${brand.logo_medium_url || 'https://placehold.co/60x60/EEE/31343C?text=Logo'}" alt="${brand.name} Logo" style="width: 60px; height: 60px; border-radius: 8px; object-fit: contain;">
                <div class="user-card-details">
                    <p>${brand.name}</p>
                </div>
                <div class="user-card-actions">
                    <button class="updateButton" data-action="edit-brand" data-id="${brand.id}">Edit</button>
                </div>
            </div>
        `).join('');
    };

    const renderProducts = () => {
        if (!selectedBrandId) {
            productsListDiv.innerHTML = `<p>Select a brand from the list on the left.</p>`;
            return;
        }
        
        const filteredProducts = allProducts.filter(p => p.brand_id === selectedBrandId);

        if (filteredProducts.length === 0) {
            productsListDiv.innerHTML = `<p>No products found for this brand. Add one using the form above.</p>`;
            return;
        }

        productsListDiv.innerHTML = filteredProducts.map(product => `
            <div class="user-card">
                <div class="user-card-details">
                    <p>${product.name}</p>
                    <small>Packaging: ${product.product_packaging || 'N/A'} | HL: ${product.hl_per_product || 'N/A'}</small>
                </div>
                <div class="user-card-actions">
                    <button class="updateButton" data-action="edit-product" data-id="${product.id}">Edit</button>
                    <button class="logoutButton" data-action="delete-product" data-id="${product.id}">Delete</button>
                </div>
            </div>
        `).join('');
    };

    // --- DATA FETCHING ---
    const fetchAllData = async () => {
        const [{ data: brandsData, error: brandsError }, { data: productsData, error: productsError }] = await Promise.all([
            supabase.from('brands').select('*').order('name'),
            supabase.from('products').select('*').order('name')
        ]);

        if (brandsError) console.error('Error fetching brands:', brandsError);
        if (productsError) console.error('Error fetching products:', productsError);

        allBrands = brandsData || [];
        allProducts = productsData || [];

        renderBrands();
    };

    // --- BRAND LOGIC ---
    const handleBrandFormSubmit = async (event) => {
        event.preventDefault();
        const brandName = brandNameInput.value.trim();
        const logoFile = brandLogoInput.files[0];
        const brandId = brandIdInput.value;

        if (!brandName) {
            brandFormMessage.textContent = 'Brand name is required.';
            brandFormMessage.style.color = 'red';
            return;
        }

        let logoUrl = null;
        if (logoFile) {
            const filePath = `public/${Date.now()}-${logoFile.name}`;
            const { error: uploadError } = await supabase.storage.from('brand-logos').upload(filePath, logoFile);
            if (uploadError) {
                brandFormMessage.textContent = 'Failed to upload logo.'; return;
            }
            const { data: urlData } = supabase.storage.from('brand-logos').getPublicUrl(filePath);
            logoUrl = urlData.publicUrl;
        }

        const brandData = { name: brandName };
        if (logoUrl) {
            brandData.logo_small_url = logoUrl;
            brandData.logo_medium_url = logoUrl;
            brandData.logo_large_url = logoUrl;
        }

        const { error } = brandId
            ? await supabase.from('brands').update(brandData).eq('id', brandId)
            : await supabase.from('brands').insert([brandData]);

        if (error) {
            brandFormMessage.textContent = `Error: ${error.message}`;
        } else {
            brandFormMessage.textContent = 'Brand saved!';
            clearBrandForm();
            await fetchAllData();
        }
    };

    const populateBrandFormForEdit = (id) => {
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
        }
    };
    
    const clearBrandForm = () => {
        brandForm.reset();
        brandIdInput.value = '';
        brandFormMessage.textContent = '';
        existingLogoPreview.style.display = 'none';
    };

    // --- PRODUCT LOGIC ---
    const handleProductFormSubmit = async (event) => {
        event.preventDefault();
        const productName = productNameInput.value.trim();
        const productId = productIdInput.value;

        if (!productName || !selectedBrandId) {
            productFormMessage.textContent = 'Product name is required and a brand must be selected.';
            return;
        }

        const productData = {
            name: productName,
            brand_id: selectedBrandId,
            product_packaging: productPackagingInput.value.trim(),
            hl_per_product: productHlInput.value ? parseFloat(productHlInput.value) : null,
        };

        const { error } = productId
            ? await supabase.from('products').update(productData).eq('id', productId)
            : await supabase.from('products').insert([productData]);

        if (error) {
            productFormMessage.textContent = `Error: ${error.message}`;
        } else {
            productFormMessage.textContent = 'Product saved!';
            clearProductForm();
            // Refetch just products
            const { data, error: productsError } = await supabase.from('products').select('*').order('name');
            if (!productsError) {
                allProducts = data;
                renderProducts();
            }
        }
    };

    const populateProductFormForEdit = (id) => {
        const product = allProducts.find(p => p.id == id);
        if (product) {
            productIdInput.value = product.id;
            productNameInput.value = product.name;
            productPackagingInput.value = product.product_packaging || '';
            productHlInput.value = product.hl_per_product || '';
        }
    };

    const deleteProduct = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
            alert(`Failed to delete product: ${error.message}`);
        } else {
            const { data, error: productsError } = await supabase.from('products').select('*').order('name');
            if (!productsError) {
                allProducts = data;
                renderProducts();
            }
        }
    };

    const clearProductForm = () => {
        productForm.reset();
        productIdInput.value = '';
        productFormMessage.textContent = '';
    };

    // --- EVENT LISTENERS ---
    logoutButton.addEventListener('click', () => { signOut(); window.location.href = 'login.html'; });
    brandForm.addEventListener('submit', handleBrandFormSubmit);
    clearBrandFormButton.addEventListener('click', clearBrandForm);
    productForm.addEventListener('submit', handleProductFormSubmit);
    clearProductFormButton.addEventListener('click', clearProductForm);

    // Main interaction listener
    brandsListDiv.addEventListener('click', (event) => {
        const brandCard = event.target.closest('.brand-card');
        const editButton = event.target.closest('button[data-action="edit-brand"]');

        if (editButton) {
            populateBrandFormForEdit(editButton.dataset.id);
            return; // Stop further processing
        }

        if (brandCard) {
            // Handle brand selection
            selectedBrandId = parseInt(brandCard.dataset.brandId);
            const selectedBrand = allBrands.find(b => b.id === selectedBrandId);

            // Update UI
            document.querySelectorAll('.brand-card.is-active').forEach(c => c.classList.remove('is-active'));
            brandCard.classList.add('is-active');
            productsSection.classList.remove('is-hidden');
            productsHeader.textContent = `Products for ${selectedBrand.name}`;
            
            clearProductForm();
            renderProducts();
        }
    });

    productsListDiv.addEventListener('click', (event) => {
        const editButton = event.target.closest('button[data-action="edit-product"]');
        const deleteButton = event.target.closest('button[data-action="delete-product"]');

        if (editButton) {
            populateProductFormForEdit(editButton.dataset.id);
        } else if (deleteButton) {
            deleteProduct(deleteButton.dataset.id);
        }
    });

    // --- INITIAL LOAD ---
    await fetchAllData();
});

