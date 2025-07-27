// scripts/productsApp.js

import { supabase, signOut, getSession } from './supabaseAuth.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Authentication Check ---
    const session = await getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // --- DOM Elements ---
    const productForm = document.getElementById('productForm');
    const productIdInput = document.getElementById('productId');
    const productNameInput = document.getElementById('productName');
    const productBrandSelect = document.getElementById('productBrand');
    const productPackagingInput = document.getElementById('productPackaging');
    const productHlInput = document.getElementById('productHl');
    const formMessage = document.getElementById('formMessage');
    const productsListDiv = document.getElementById('productsList');
    const clearFormButton = document.getElementById('clearFormButton');
    const logoutButton = document.getElementById('logoutButton');

    // --- State ---
    let allProducts = [];
    let allBrands = [];

    // --- Functions ---

    // Fetch all brands to populate the dropdown
    const fetchBrands = async () => {
        const { data, error } = await supabase.from('brands').select('id, name').order('name');
        if (error) {
            console.error('Error fetching brands:', error);
            productBrandSelect.innerHTML = '<option value="">Could not load brands</option>';
            return;
        }
        allBrands = data;
        productBrandSelect.innerHTML = '<option value="">Select a brand</option>';
        allBrands.forEach(brand => {
            productBrandSelect.innerHTML += `<option value="${brand.id}">${brand.name}</option>`;
        });
    };
    
    // Fetch all products and their associated brand info
    const fetchProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select(`
                id,
                name,
                product_packaging,
                hl_per_product,
                brand_id,
                brands ( name, logo_small_url )
            `)
            .order('name');
            
        if (error) {
            console.error('Error fetching products:', error);
            productsListDiv.innerHTML = `<p style="color: red;">Error loading products.</p>`;
            return;
        }
        allProducts = data;
        renderProducts();
    };

    // Render the list of products
    const renderProducts = () => {
        if (allProducts.length === 0) {
            productsListDiv.innerHTML = `<p>No products found. Add one using the form above.</p>`;
            return;
        }

        productsListDiv.innerHTML = allProducts.map(product => `
            <div class="user-card">
                <img src="${product.brands?.logo_small_url || 'https://placehold.co/60x60/EEE/31343C?text=Logo'}" alt="${product.brands?.name || 'Brand'} Logo" style="width: 60px; height: 60px; border-radius: 8px; object-fit: contain;">
                <div class="user-card-details">
                    <p>${product.name}</p>
                    <small>Brand: ${product.brands?.name || 'N/A'} | Packaging: ${product.product_packaging || 'N/A'}</small>
                </div>
                <div class="user-card-actions">
                    <button class="updateButton" data-action="edit" data-id="${product.id}">Edit</button>
                    <button class="logoutButton" data-action="delete" data-id="${product.id}">Delete</button>
                </div>
            </div>
        `).join('');
    };

    // Handle form submission for creating or updating a product
    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const productName = productNameInput.value.trim();
        const brandId = productBrandSelect.value;
        const productId = productIdInput.value;

        if (!productName || !brandId) {
            formMessage.textContent = 'Product name and brand are required.';
            formMessage.style.color = 'red';
            return;
        }

        const productData = {
            name: productName,
            brand_id: parseInt(brandId),
            product_packaging: productPackagingInput.value.trim(),
            hl_per_product: productHlInput.value ? parseFloat(productHlInput.value) : null,
        };

        let error;
        if (productId) {
            // Update existing product
            const { error: updateError } = await supabase.from('products').update(productData).eq('id', productId);
            error = updateError;
        } else {
            // Create new product
            const { error: insertError } = await supabase.from('products').insert([productData]);
            error = insertError;
        }

        if (error) {
            console.error('Error saving product:', error);
            formMessage.textContent = `Error saving product: ${error.message}`;
            formMessage.style.color = 'red';
        } else {
            formMessage.textContent = 'Product saved successfully!';
            formMessage.style.color = 'green';
            clearForm();
            await fetchProducts(); // Refresh the list
        }
    };
    
    // Populate the form for editing an existing product
    const populateFormForEdit = (id) => {
        const product = allProducts.find(p => p.id == id);
        if (product) {
            productIdInput.value = product.id;
            productNameInput.value = product.name;
            productBrandSelect.value = product.brand_id;
            productPackagingInput.value = product.product_packaging || '';
            productHlInput.value = product.hl_per_product || '';
            
            window.scrollTo(0, 0); // Scroll to top to see the form
        }
    };

    // Delete a product
    const deleteProduct = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
            console.error('Error deleting product:', error);
            alert(`Failed to delete product: ${error.message}`);
        } else {
            await fetchProducts(); // Refresh list
        }
    };

    // Clear form fields and messages
    const clearForm = () => {
        productForm.reset();
        productIdInput.value = '';
        formMessage.textContent = '';
    };

    // --- Event Listeners ---
    productForm.addEventListener('submit', handleFormSubmit);
    clearFormButton.addEventListener('click', clearForm);
    logoutButton.addEventListener('click', () => {
        signOut();
        window.location.href = 'login.html';
    });

    productsListDiv.addEventListener('click', (event) => {
        const target = event.target;
        const action = target.dataset.action;
        const id = target.dataset.id;

        if (action === 'edit') {
            populateFormForEdit(id);
        } else if (action === 'delete') {
            deleteProduct(id);
        }
    });

    // --- Initial Load ---
    await fetchBrands();
    await fetchProducts();
});
