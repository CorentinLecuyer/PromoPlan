// scripts/catalogApp.js

import { supabase, signOut, getSession } from './supabaseAuth.js';
import { showToast } from './shared/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Authentication Check ---
    const session = await getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // --- DOM Elements ---
    const catalogWrapper = document.querySelector('.catalog-management-grid');
    const logoutButton = document.getElementById('logoutButton');

    // Brand elements
    const brandForm = document.getElementById('brandForm');
    const brandIdInput = document.getElementById('brandId');
    const brandNameInput = document.getElementById('brandName');
    const brandLogoInput = document.getElementById('brandLogo');
    const brandFormMessage = document.getElementById('brandFormMessage');
    const brandsListDiv = document.getElementById('brandsList');
    const clearBrandFormButton = document.getElementById('clearBrandFormButton');
    
    // Sub-Brand elements
    const subBrandsSection = document.getElementById('subBrandsSection');
    const subBrandsHeader = document.getElementById('subBrandsHeader');
    const subBrandForm = document.getElementById('subBrandForm');
    const subBrandIdInput = document.getElementById('subBrandId');
    const subBrandNameInput = document.getElementById('subBrandName');
    const subBrandLogoInput = document.getElementById('subBrandLogo');
    const subBrandFormMessage = document.getElementById('subBrandFormMessage');
    const subBrandsListDiv = document.getElementById('subBrandsList');
    const clearSubBrandFormButton = document.getElementById('clearSubBrandFormButton');
    
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

    // --- State ---
    let allBrands = [];
    let allSubBrands = [];
    let allProducts = [];
    let selectedBrandId = null;
    let selectedSubBrandId = null;

    // --- RENDER FUNCTIONS ---
    const renderBrands = () => {
        brandsListDiv.innerHTML = allBrands.length > 0 ? allBrands.map(brand => `
            <div class="user-card brand-card" data-brand-id="${brand.id}">
                <img class="brand-logo" src="${brand.logo_medium_url || 'https://placehold.co/60x60/EEE/31343C?text=Logo'}" alt="${brand.name} Logo">
                <div class="user-card-details"><p>${brand.name}</p></div>
                <div class="user-card-actions">
                    <button class="edit-button" data-action="edit-brand" data-id="${brand.id}">Edit</button>
                    <button class="delete-button" data-action="delete-brand" data-id="${brand.id}">Delete</button>
                </div>
            </div>
        `).join('') : `<p>No brands found. Add one to get started.</p>`;
    };

    const renderSubBrands = () => {
        if (!selectedBrandId) {
            subBrandsListDiv.innerHTML = `<p>Select a brand to see its sub-brands.</p>`;
            return;
        }
        const filteredSubBrands = allSubBrands.filter(sb => sb.brand_id === selectedBrandId);
        subBrandsListDiv.innerHTML = filteredSubBrands.length > 0 ? filteredSubBrands.map(subBrand => `
            <div class="user-card sub-brand-card" data-sub-brand-id="${subBrand.id}">
                <img class="sub-brand-logo" src="${subBrand.logo_url || 'https://placehold.co/60x60/EEE/31343C?text=Logo'}" alt="${subBrand.name} Logo">
                <div class="user-card-details"><p>${subBrand.name}</p></div>
                <div class="user-card-actions">
                    <button class="edit-button" data-action="edit-sub-brand" data-id="${subBrand.id}">Edit</button>
                    <button class="delete-button" data-action="delete-sub-brand" data-id="${subBrand.id}">Delete</button>
                </div>
            </div>
        `).join('') : `<p>No sub-brands found for this brand.</p>`;
    };

    const renderProducts = () => {
        let filteredProducts = [];
        let headerText = 'Products';

        if (selectedSubBrandId) {
            // CASE 1: A specific sub-brand IS selected. Show its products.
            const subBrand = allSubBrands.find(sb => sb.id === selectedSubBrandId);
            headerText = `Products for ${subBrand?.name || ''}`;
            filteredProducts = allProducts.filter(p => p.sub_brand_id === selectedSubBrandId);
        } else if (selectedBrandId) {
            // CASE 2: Only a brand is selected. Show all products for all of its sub-brands.
            const brand = allBrands.find(b => b.id === selectedBrandId);
            headerText = `All Products for ${brand?.name || ''}`;
            const subBrandIdsForBrand = allSubBrands
                .filter(sb => sb.brand_id === selectedBrandId)
                .map(sb => sb.id);
            filteredProducts = allProducts.filter(p => p.sub_brands?.brand_id === selectedBrandId);
    }

        productsHeader.textContent = headerText;

        if (filteredProducts.length > 0) {
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
        } else if (selectedBrandId) {
            productsListDiv.innerHTML = `<p>No products found for this brand.</p>`;
        } else {
            productsListDiv.innerHTML = `<p>Select a brand to see products.</p>`;
        }
    };


    // --- DATA FETCHING ---
    const fetchAllData = async () => {
        const [brandsRes, subBrandsRes, productsRes] = await Promise.all([
            supabase.from('brands').select('*').order('name'),
            supabase.from('sub_brands').select('*').order('name'),
            supabase.from('products').select('*, sub_brands(brand_id)').order('name')
        ]);

        allBrands = brandsRes.data || [];
        allSubBrands = subBrandsRes.data || [];
        allProducts = productsRes.data || [];

        renderBrands();
    };
    
    // --- HELPER & FORM FUNCTIONS ---
    const clearBrandForm = () => { brandForm.reset(); brandIdInput.value = ''; brandFormMessage.textContent = ''; };
    const clearSubBrandForm = () => { subBrandForm.reset(); subBrandIdInput.value = ''; subBrandFormMessage.textContent = ''; };
    const clearProductForm = () => { productForm.reset(); productIdInput.value = ''; productFormMessage.textContent = ''; };

    const populateBrandFormForEdit = (id) => {
        const brand = allBrands.find(b => b.id == id);
        if (brand) { brandIdInput.value = brand.id; brandNameInput.value = brand.name; }
    };
    const populateSubBrandFormForEdit = (id) => {
        const subBrand = allSubBrands.find(sb => sb.id == id);
        if (subBrand) { subBrandIdInput.value = subBrand.id; subBrandNameInput.value = subBrand.name; }
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
    
    const handleLogoUpload = async (file) => {
        if (!file) return null;
        showToast('Compressing image...', 'info');

        const options = { maxSizeMB: 0.4, maxWidthOrHeight: 1024, useWebWorker: true };
        try {
            const compressedFile = await imageCompression(file, options);
            showToast('Uploading logo...', 'info');
            const filePath = `public/${Date.now()}-${compressedFile.name}`;
            const { error } = await supabase.storage.from('brand-logos').upload(filePath, compressedFile);
            if (error) throw error;
            return supabase.storage.from('brand-logos').getPublicUrl(filePath).data.publicUrl;
        } catch (error) {
            showToast(`Failed to process logo: ${error.message}`, 'error');
            return null;
        }
    };

    // --- FORM SUBMISSION HANDLERS ---
    const handleBrandFormSubmit = async (event) => {
        event.preventDefault();
        const brandData = { name: brandNameInput.value.trim() };
        if (!brandData.name) { showToast('Brand name is required.', 'error'); return; }
        
        const logoUrl = await handleLogoUpload(brandLogoInput.files[0], brandFormMessage);
        if (logoUrl) { brandData.logo_medium_url = logoUrl; }
        
        const { error } = brandIdInput.value
            ? await supabase.from('brands').update(brandData).eq('id', brandIdInput.value)
            : await supabase.from('brands').insert(brandData);

        if (error) { showToast(`Error: ${error.message}`, 'error'); } 
        else { showToast('Brand saved!', 'success'); clearBrandForm(); await fetchAllData(); }
    };

    const handleSubBrandFormSubmit = async (event) => {
        event.preventDefault();
        if (!selectedBrandId) { showToast('A parent brand must be selected.', 'error'); return; }
        const subBrandData = { name: subBrandNameInput.value.trim(), brand_id: selectedBrandId };
        if (!subBrandData.name) {  showToast('Sub-brand name is required.', 'error'); return; }

        const logoUrl = await handleLogoUpload(subBrandLogoInput.files[0], subBrandFormMessage);
        if (logoUrl) { subBrandData.logo_url = logoUrl; }

        const { error } = subBrandIdInput.value
            ? await supabase.from('sub_brands').update(subBrandData).eq('id', subBrandIdInput.value)
            : await supabase.from('sub_brands').insert(subBrandData);
        
        if (error) { showToast(`Error: ${error.message}`, 'error'); }
        else {
            showToast('Sub-brand saved!', 'success');
            clearSubBrandForm();
            const { data } = await supabase.from('sub_brands').select('*').order('name');
            allSubBrands = data || [];
            renderSubBrands();
        }
    };

    const handleProductFormSubmit = async (event) => {
        event.preventDefault();
        if (!selectedSubBrandId) { showToast('A sub-brand must be selected.', 'error'); return; }
        const productData = {
            name: productNameInput.value.trim(),
            sub_brand_id: selectedSubBrandId,
            product_packaging: productPackagingInput.value.trim(),
            hl_per_product: productHlInput.value ? parseFloat(productHlInput.value) : null,
        };
        if (!productData.name) { showToast('Product name is required.', 'error'); return; }

        const { error } = productIdInput.value
            ? await supabase.from('products').update(productData).eq('id', productIdInput.value)
            : await supabase.from('products').insert(productData);

        if (error) { showToast(`Error: ${error.message}`, 'error'); } 
        else {
            showToast('Product saved!', 'success');            
            clearProductForm();
            const { data } = await supabase.from('products').select('*').order('name');
            allProducts = data || [];
            renderProducts();
        }
    };
    
    const deleteBrand = async (id) => {
    if (!confirm('Are you sure you want to delete this brand and all its sub-brands/products?')) return;
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) {
        showToast(`Failed to delete brand: ${error.message}`, 'error'); }
        else { showToast('Brand deleted.', 'success'); await fetchAllData(); }
    }


    const deleteSubBrand = async (id) => {
        if (!confirm('Are you sure you want to delete this sub-brand and its products?')) return;
        const { error } = await supabase.from('sub_brands').delete().eq('id', id);
        if (error) {
            showToast(`Failed to delete sub-brand: ${error.message}`, 'error'); }
        else {
            showToast('Sub-brand deleted.', 'success');
            allSubBrands = allSubBrands.filter(sb => sb.id != id);
            renderSubBrands();
            renderProducts(); // Re-render products to remove those from the deleted sub-brand
        }
};
    const deleteProduct = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) { showToast(`Failed to delete product: ${error.message}`, 'error'); }
        else {
            showToast('Product deleted.', 'success');
            allProducts = allProducts.filter(p => p.id != id);
            renderProducts();
        }
    };

    // --- EVENT LISTENERS ---
    logoutButton.addEventListener('click', () => { signOut(); window.location.href = 'login.html'; });
    brandForm.addEventListener('submit', handleBrandFormSubmit);
    subBrandForm.addEventListener('submit', handleSubBrandFormSubmit);
    productForm.addEventListener('submit', handleProductFormSubmit);
    clearBrandFormButton.addEventListener('click', clearBrandForm);
    clearSubBrandFormButton.addEventListener('click', clearSubBrandForm);
    clearProductFormButton.addEventListener('click', clearProductForm);

    catalogWrapper.addEventListener('click', (event) => {
        const brandCard = event.target.closest('.brand-card');
        const subBrandCard = event.target.closest('.sub-brand-card');
        const actionButton = event.target.closest('button[data-action]');
        const saveProductButton = productForm.querySelector('button[type="submit"]');

        
        if (actionButton) {
            const { action, id } = actionButton.dataset;
            switch(action) {
                case 'edit-brand': populateBrandFormForEdit(id); break;
                case 'delete-brand': deleteBrand(id); break; // Add this
                case 'edit-sub-brand': populateSubBrandFormForEdit(id); break;
                case 'delete-sub-brand': deleteSubBrand(id); break; // Add this
                case 'edit-product': populateProductFormForEdit(id); break;
                case 'delete-product': deleteProduct(id); break;
            }
            return;
        }

        if (brandCard) {
            selectedBrandId = parseInt(brandCard.dataset.brandId);
            selectedSubBrandId = null; // Reset sub-brand selection

            document.querySelectorAll('.brand-card.is-active, .sub-brand-card.is-active').forEach(c => c.classList.remove('is-active'));
            brandCard.classList.add('is-active');
            
            const selectedBrand = allBrands.find(b => b.id === selectedBrandId);
            subBrandsHeader.textContent = `Sub-Brands for ${selectedBrand.name}`;
            
            subBrandsSection.classList.remove('is-hidden');
            productsSection.classList.remove('is-hidden');

            saveProductButton.disabled = true;
            showToast('Select a sub-brand to add a new product.', 'info');

            clearSubBrandForm();
            clearProductForm();
            renderSubBrands();
            renderProducts(); // Will show "select a sub-brand" message
        }

        if (subBrandCard) {
            selectedSubBrandId = parseInt(subBrandCard.dataset.subBrandId);

            document.querySelectorAll('.sub-brand-card.is-active').forEach(c => c.classList.remove('is-active'));
            subBrandCard.classList.add('is-active');

            const selectedSubBrand = allSubBrands.find(sb => sb.id === selectedSubBrandId);
            productsHeader.textContent = `Products for ${selectedSubBrand.name}`;

            productsSection.classList.remove('is-hidden');

            saveProductButton.disabled = false;
            productFormMessage.textContent = '';
            
            clearProductForm();
            renderProducts();
        }
    });

    // --- INITIAL LOAD ---
    await fetchAllData();
});