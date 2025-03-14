// Initialize local storage or get existing data
let projectData = JSON.parse(localStorage.getItem('gamingClosetProject')) || {
    components: []
};

// DOM Elements
const componentsList = document.getElementById('components-list');
const addComponentBtn = document.getElementById('add-component-btn');
const componentNameInput = document.getElementById('component-name');
const componentNotesInput = document.getElementById('component-notes');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Edit mode tracker
let editingComponentId = null;

// Default components to start with
const defaultComponents = [
    { id: 'comp-1', name: 'Gaming Chair', notes: 'Need something comfortable for long sessions, preferably with lumbar support', products: [], purchased: null, searchResults: [] },
    { id: 'comp-2', name: 'PS5', notes: 'Already have this', products: [], purchased: true, searchResults: [] },
    { id: 'comp-3', name: 'Gaming Monitor', notes: 'Already have this - LG 27GL850', products: [], purchased: true, searchResults: [] },
    { id: 'comp-4', name: 'HDMI Cable', notes: 'Need HDMI 2.1 for PS5', products: [], purchased: null, searchResults: [] }
];

// Initialize with default components if none exist
if (projectData.components.length === 0) {
    projectData.components = defaultComponents;
    saveData();
}

// Add event listeners
addComponentBtn.addEventListener('click', addComponent);
cancelEditBtn.addEventListener('click', cancelEdit);

// Initial render
renderComponents();

/**
 * Add a new component or update an existing one
 */
function addComponent() {
    const name = componentNameInput.value.trim();
    const notes = componentNotesInput.value.trim();
    
    if (!name) {
        alert('Please enter a component name');
        return;
    }
    
    if (editingComponentId) {
        // Update existing component
        const component = projectData.components.find(c => c.id === editingComponentId);
        if (component) {
            component.name = name;
            component.notes = notes;
            
            // Run a new search if name changed significantly
            runSearch(component);
            
            exitEditMode();
        }
    } else {
        // Add new component
        const newComponent = {
            id: 'comp-' + Date.now(),
            name,
            notes,
            products: [],
            purchased: null,
            searchResults: [],
            showResults: true  // Auto-expand search results for new components
        };
        
        projectData.components.push(newComponent);
        
        // Auto-run search for new component
        runSearch(newComponent);
        
        // Clear inputs
        componentNameInput.value = '';
        componentNotesInput.value = '';
    }
    
    saveData();
    renderComponents();
}

/**
 * Cancel editing a component
 */
function cancelEdit() {
    exitEditMode();
    renderComponents();
}

/**
 * Exit edit mode and reset the form
 */
function exitEditMode() {
    editingComponentId = null;
    componentNameInput.value = '';
    componentNotesInput.value = '';
    addComponentBtn.textContent = 'Add Component';
    cancelEditBtn.style.display = 'none';
}

/**
 * Render all components to the DOM
 */
function renderComponents() {
    componentsList.innerHTML = '';
    
    projectData.components.forEach(component => {
        const card = document.createElement('div');
        card.className = `component-card ${component.purchased ? 'purchased' : ''}`;
        card.dataset.id = component.id;
        
        // Generate product list HTML
        const productsList = component.products.map(product => {
            const isPurchased = product.isPurchased;
            return `
                <div class="product-item ${isPurchased ? 'purchased-item' : ''}" data-id="${product.id}">
                    <div class="product-title">${product.title}</div>
                    <div class="product-details">
                        <span class="product-price">${product.price || 'N/A'}</span>
                        ${product.rating ? `
                        <div class="product-rating">
                            <span class="stars">★★★★★</span>
                            <span>${product.rating}</span>
                        </div>` : ''}
                    </div>
                    ${product.source ? `<div class="product-source"><small>Source: ${product.source}</small></div>` : ''}
                    <div class="product-actions">
                        <a href="${product.url}" target="_blank" class="sm-button neutral-btn">View</a>
                        ${!component.purchased ? 
                            `<button class="sm-button secondary-btn mark-purchased-btn" data-component-id="${component.id}" data-product-id="${product.id}">Mark Purchased</button>` : 
                            (product.isPurchased ? `<span class="badge">Purchased</span>` : '')}
                    </div>
                </div>
            `;
        }).join('');
        
        // Generate search results HTML
        const searchResultsHtml = component.searchResults && component.searchResults.length > 0 ? `
            <div class="search-results">
                <div class="search-results-header">
                    <h3>Product Options</h3>
                    <button class="sm-button neutral-btn refresh-search-btn" data-component-id="${component.id}">Refresh</button>
                </div>
                <div class="manual-link-input">
                    <input type="text" placeholder="Or paste a product URL here" class="manual-url-input" data-component-id="${component.id}">
                    <button class="sm-button secondary-btn add-manual-btn" data-component-id="${component.id}">Add Link</button>
                </div>
                <div class="search-results-list">
                    ${component.searchResults.map(result => `
                        <div class="search-result-item">
                            <div class="search-result-title">${result.title}</div>
                            ${result.price ? `<div class="product-price">${result.price}</div>` : ''}
                            <div class="product-actions">
                                <a href="${result.url}" target="_blank" class="sm-button neutral-btn">View</a>
                                <button class="sm-button secondary-btn save-product-btn" 
                                        data-component-id="${component.id}"
                                        data-result-id="${result.id}">
                                    Save
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : `
            <div class="search-results">
                <p>No search results yet.</p>
                <button class="sm-button secondary-btn refresh-search-btn" data-component-id="${component.id}">Find Products</button>
                <div class="manual-link-input">
                    <input type="text" placeholder="Or paste a product URL here" class="manual-url-input" data-component-id="${component.id}">
                    <button class="sm-button secondary-btn add-manual-btn" data-component-id="${component.id}">Add Link</button>
                </div>
            </div>
        `;
        
        // Build the component card HTML
        card.innerHTML = `
            <div class="component-header">
                <span class="component-title">${component.name}</span>
                ${component.purchased ? '<span class="badge">Purchased</span>' : ''}
            </div>
            ${component.notes ? `<p>${component.notes}</p>` : ''}
            
            <div class="product-list">
                ${component.products.length > 0 ? productsList : '<p>No products saved yet</p>'}
            </div>
            
            ${!component.purchased ? searchResultsHtml : ''}
            
            <div class="component-actions">
                <button class="sm-button edit-btn" data-component-id="${component.id}">Edit</button>
                <button class="sm-button danger-btn delete-btn" data-component-id="${component.id}">Delete</button>
                ${component.purchased ? `<button class="sm-button neutral-btn unmark-btn" data-component-id="${component.id}">Unmark Purchase</button>` : ''}
            </div>
        `;
        
        componentsList.appendChild(card);
    });
    
    // Add event listeners to the new elements
    addComponentEventListeners();
}

/**
 * Add event listeners to component elements
 */
function addComponentEventListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', editComponent);
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', deleteComponent);
    });
    
    // Mark purchased buttons
    document.querySelectorAll('.mark-purchased-btn').forEach(btn => {
        btn.addEventListener('click', markPurchased);
    });
    
    // Unmark purchased buttons
    document.querySelectorAll('.unmark-btn').forEach(btn => {
        btn.addEventListener('click', unmarkPurchased);
    });
    
    // Refresh search buttons
    document.querySelectorAll('.refresh-search-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const componentId = e.target.dataset.componentId;
            const component = projectData.components.find(c => c.id === componentId);
            if (component) {
                runSearch(component);
                saveData();
                renderComponents();
            }
        });
    });
    
    // Save product buttons
    document.querySelectorAll('.save-product-btn').forEach(btn => {
        btn.addEventListener('click', saveProductFromResults);
    });
    
    // Add manual link buttons
    document.querySelectorAll('.add-manual-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const componentId = e.target.dataset.componentId;
            const inputField = document.querySelector(`.manual-url-input[data-component-id="${componentId}"]`);
            const url = inputField.value.trim();
            
            if (url) {
                addManualLink(componentId, url);
                inputField.value = '';
            }
        });
    });
}

/**
 * Save data to localStorage
 */
function saveData() {
    localStorage.setItem('gamingClosetProject', JSON.stringify(projectData));
}

/**
 * Edit a component
 */
function editComponent(e) {
    const componentId = e.target.dataset.componentId;
    const component = projectData.components.find(c => c.id === componentId);
    
    if (component) {
        // Set the form to edit mode
        componentNameInput.value = component.name;
        componentNotesInput.value = component.notes || '';
        editingComponentId = component.id;
        addComponentBtn.textContent = 'Update Component';
        cancelEditBtn.style.display = 'inline-block';
        
        // Scroll to the form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Delete a component
 */
function deleteComponent(e) {
    const componentId = e.target.dataset.componentId;
    
    if (confirm('Are you sure you want to delete this component?')) {
        projectData.components = projectData.components.filter(c => c.id !== componentId);
        saveData();
        renderComponents();
        
        // If we're editing this component, cancel edit mode
        if (editingComponentId === componentId) {
            exitEditMode();
        }
    }
}

/**
 * Mark a product as purchased
 */
function markPurchased(e) {
    const componentId = e.target.dataset.componentId;
    const productId = e.target.dataset.productId;
    
    const component = projectData.components.find(c => c.id === componentId);
    if (component) {
        // Mark the product as purchased
        const product = component.products.find(p => p.id === productId);
        if (product) {
            // Mark this product as purchased
            product.isPurchased = true;
            // Mark the component as purchased
            component.purchased = true;
            
            saveData();
            renderComponents();
        }
    }
}

/**
 * Unmark a component as purchased
 */
function unmarkPurchased(e) {
    const componentId = e.target.dataset.componentId;
    const component = projectData.components.find(c => c.id === componentId);
    
    if (component) {
        component.purchased = false;
        // Also unmark all products
        component.products.forEach(product => {
            product.isPurchased = false;
        });
        
        saveData();
        renderComponents();
    }
}

/**
 * Run a search for a component
 */
function runSearch(component) {
    // In a real app, this would call an API
    // For now, we'll simulate results based on the component name
    
    // Show loading state
    component.searchResults = [{ id: 'loading', title: 'Loading...', url: '#' }];
    renderComponents();
    
    // Simulate API delay
    setTimeout(() => {
        // Generate search results based on component name
        const searchTerm = component.name.toLowerCase();
        let results = [];
        
        // Generate some fake search results
        results = generateFakeSearchResults(searchTerm);
        
        // Update the component with search results
        component.searchResults = results;
        component.showResults = true;
        
        saveData();
        renderComponents();
    }, 500);
}

/**
 * Generate fake search results for demo purposes
 */
function generateFakeSearchResults(term) {
    // Create some fake product results based on the search term
    const results = [];
    const brands = ['Amazon', 'Best Buy', 'Walmart', 'Target', 'Newegg'];
    const priceRanges = {
        'chair': { min: 89, max: 299 },
        'monitor': { min: 149, max: 699 },
        'cable': { min: 9, max: 49 },
        'headset': { min: 49, max: 199 },
        'controller': { min: 39, max: 179 },
        'stand': { min: 19, max: 99 },
        'default': { min: 29, max: 199 }
    };
    
    // Find the appropriate price range
    let range = priceRanges.default;
    for (const key in priceRanges) {
        if (term.includes(key)) {
            range = priceRanges[key];
            break;
        }
    }
    
    // Generate 4-6 random results
    const count = Math.floor(Math.random() * 3) + 4;
    for (let i = 0; i < count; i++) {
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const price = (Math.random() * (range.max - range.min) + range.min).toFixed(2);
        const rating = (Math.random() * 2 + 3).toFixed(1); // 3.0 to 5.0
        
        let title;
        if (term.includes('chair')) {
            const chairTypes = ['Gaming Chair', 'Racing Style Chair', 'Ergonomic Chair', 'Office Gaming Chair'];
            const features = ['with Lumbar Support', 'with Footrest', 'with Massage', 'Reclining', 'High Back'];
            title = `${brand} ${chairTypes[i % chairTypes.length]} ${features[i % features.length]}`;
        } else if (term.includes('monitor')) {
            const sizes = ['24"', '27"', '32"', '34"'];
            const resolutions = ['1080p', '1440p', '4K', 'UltraWide QHD'];
            title = `${brand} ${sizes[i % sizes.length]} ${resolutions[i % resolutions.length]} Gaming Monitor`;
        } else if (term.includes('cable')) {
            const lengths = ['6ft', '10ft', '15ft'];
            const types = ['HDMI 2.1', 'DisplayPort 1.4', 'Ultra High Speed', 'Braided'];
            title = `${brand} ${types[i % types.length]} ${lengths[i % lengths.length]} Cable`;
        } else {
            // Generic title
            title = `${brand} ${term.charAt(0).toUpperCase() + term.slice(1)} Model ${String.fromCharCode(65 + i)}`;
        }
        
        results.push({
            id: `search-${Date.now()}-${i}`,
            title,
            price: `$${price}`,
            rating,
            source: brand,
            url: `https://example.com/product?q=${encodeURIComponent(title)}`
        });
    }
    
    return results;
}

/**
 * Save a product from search results to the component
 */
function saveProductFromResults(e) {
    const componentId = e.target.dataset.componentId;
    const resultId = e.target.dataset.resultId;
    
    const component = projectData.components.find(c => c.id === componentId);
    if (component) {
        const result = component.searchResults.find(r => r.id === resultId);
        if (result) {
            // Check if this product is already saved
            const existingProductIndex = component.products.findIndex(p => 
                p.title === result.title && p.url === result.url);
            
            if (existingProductIndex === -1) {
                // Add to saved products
                component.products.push({
                    id: `product-${Date.now()}`,
                    title: result.title,
                    price: result.price,
                    rating: result.rating,
                    source: result.source,
                    url: result.url,
                    isPurchased: false
                });
                
                saveData();
                renderComponents();
            } else {
                alert('This product is already saved to this component.');
            }
        }
    }
}

/**
 * Add a manual product link to a component
 */
function addManualLink(componentId, url) {
    // Validate URL format
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }
    
    try {
        new URL(url); // Will throw if invalid URL
        
        const component = projectData.components.find(c => c.id === componentId);
        if (component) {
            // Extract domain as source
            const domain = new URL(url).hostname.replace('www.', '');
            
            // Create a simple product from the URL
            const newProduct = {
                id: `product-${Date.now()}`,
                title: `Product from ${domain}`,
                price: null,
                rating: null,
                source: domain,
                url: url,
                isPurchased: false
            };
            
            // Check if URL already exists
            const existingProduct = component.products.find(p => p.url === url);
            if (!existingProduct) {
                component.products.push(newProduct);
                saveData();
                renderComponents();
            } else {
                alert('This URL is already saved to this component.');
            }
        }
    } catch (e) {
        alert('Please enter a valid URL');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Auto-run searches for components that don't have results yet
    projectData.components.forEach(component => {
        if (!component.purchased && (!component.searchResults || component.searchResults.length === 0)) {
            runSearch(component);
        }
    });
    
    saveData();
});