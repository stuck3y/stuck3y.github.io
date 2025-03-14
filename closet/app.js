// Initialize local storage or get existing data
let projectData = JSON.parse(localStorage.getItem('gamingClosetProject')) || {
    components: []
};

// DOM Elements
const componentsList = document.getElementById('components-list');
const addComponentBtn = document.getElementById('add-component-btn');
const componentNameInput = document.getElementById('component-name');
const componentNotesInput = document.getElementById('component-notes');
const searchResults = document.getElementById('search-results');
const searchResultsContent = document.getElementById('search-results-content');
const overlay = document.getElementById('overlay');
const closeSearchBtn = document.getElementById('close-search');

// Edit mode tracker
let editingComponentId = null;

// Current component being searched for
let currentSearchComponent = null;

// Initialize with default components if none exist
if (projectData.components.length === 0) {
    projectData.components = defaultComponents;
    saveData();
}

// Add event listeners
addComponentBtn.addEventListener('click', addComponent);
closeSearchBtn.addEventListener('click', closeSearch);
overlay.addEventListener('click', closeSearch);

// Cancel edit button
const cancelEditBtn = document.getElementById('cancel-edit-btn');
cancelEditBtn.addEventListener('click', () => {
    editingComponentId = null;
    componentNameInput.value = '';
    componentNotesInput.value = '';
    addComponentBtn.textContent = 'Add Component';
    cancelEditBtn.style.display = 'none';
});

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
            editingComponentId = null;
            addComponentBtn.textContent = 'Add Component';
        }
    } else {
        // Add new component
        const newComponent = {
            id: 'comp-' + Date.now(),
            name,
            notes,
            products: [],
            purchased: null
        };
        
        projectData.components.push(newComponent);
    }
    
    saveData();
    renderComponents();
    
    // Clear inputs
    componentNameInput.value = '';
    componentNotesInput.value = '';
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
        
        const productsList = component.products.map(product => {
            const isPurchased = component.purchased === product.id;
            return `
                <div class="product-item ${isPurchased ? 'purchased-item' : ''}" data-id="${product.id}">
                    <div class="product-title">${product.title}</div>
                    <div class="product-details">
                        <span class="product-price">${product.price}</span>
                        <div class="product-rating">
                            <span class="stars">★★★★★</span>
                            <span>${product.rating}</span>
                        </div>
                    </div>
                    <div class="product-source"><small>Source: ${product.source}</small></div>
                    <div class="product-actions">
                        <a href="${product.url}" target="_blank" class="sm-button neutral-btn">View</a>
                        ${!component.purchased ? `<button class="sm-button secondary-btn mark-purchased-btn" data-product-id="${product.id}">Mark Purchased</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        card.innerHTML = `
            <div class="component-header">
                <span class="component-title">${component.name}</span>
                ${component.purchased ? '<span class="badge">Purchased</span>' : ''}
            </div>
            ${component.notes ? `<p>${component.notes}</p>` : ''}
            <div class="product-list">
                ${component.products.length > 0 ? productsList : '<p>No products added yet</p>'}
            </div>
            <div class="component-actions">
                <button class="sm-button search-btn" data-component-id="${component.id}">Search Products</button>
                <button class="sm-button neutral-btn real-search-btn" data-component-id="${component.id}" data-component-name="${component.name}">Google It</button>
                ${component.purchased ? `<button class="sm-button neutral-btn unmark-btn" data-component-id="${component.id}">Unmark Purchase</button>` : ''}
                <button class="sm-button edit-btn" data-component-id="${component.id}">Edit</button>
                <button class="sm-button delete-btn" data-component-id="${component.id}">Delete</button>
            </div>
        `;
        
        componentsList.appendChild(card);
    });
    
    // Add event listeners to the new elements
    document.querySelectorAll('.search-btn').forEach(btn => {
        btn.addEventListener('click', searchProducts);
    });
    
    document.querySelectorAll('.mark-purchased-btn').forEach(btn => {
        btn.addEventListener('click', markPurchased);
    });
    
    document.querySelectorAll('.unmark-btn').forEach(btn => {
        btn.addEventListener('click', unmarkPurchased);
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', editComponent);
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', deleteComponent);
    });
    
    document.querySelectorAll('.real-search-btn').forEach(btn => {
        btn.addEventListener('click', openRealSearch);
    });
}

/**
 * Save data to localStorage
 */
function saveData() {
    localStorage.setItem('gamingClosetProject', JSON.stringify(projectData));
}

/**
 * Search for products related to a component
 */
function searchProducts(e) {
    const componentId = e.target.dataset.componentId;
    const component = projectData.components.find(c => c.id === componentId);
    
    currentSearchComponent = component;
    
    const searchTerm = component.name.toLowerCase();
    let results = [];
    
    // Get products based on search term from our sample data
    for (const [key, products] of Object.entries(sampleProducts)) {
        if (searchTerm.includes(key) || key.includes(searchTerm)) {
            results = products;
            break;
        }
    }
    
    // If no direct match, get random products
    if (results.length === 0) {
        const allProducts = Object.values(sampleProducts).flat();
        results = _.sampleSize(allProducts, 5);
    }
    
    // Display results
    searchResultsContent.innerHTML = `
        <h3>Search results for "${component.name}"</h3>
        <div class="manual-add-section">
            <p>Have a product URL from elsewhere? Add it manually:</p>
            <button class="secondary-btn add-manual-btn" data-component-id="${component.id}">Add from URL</button>
        </div>
        <div class="search-divider"></div>
        ${results.map(product => `
            <div class="search-result-item">
                <div class="product-title">${product.title}</div>
                <div class="product-details">
                    <span class="product-price">${product.price}</span>
                    <div class="product-rating">
                        <span class="stars">★★★★★</span>
                        <span>${product.rating}</span>
                    </div>
                </div>
                <div class="product-source"><small>Source: ${product.source}</small></div>
                <button class="sm-button secondary-btn add-product-btn" 
                        data-product-id="${product.id}"
                        data-product-title="${product.title}"
                        data-product-price="${product.price}"
                        data-product-rating="${product.rating}"
                        data-product-source="${product.source}"
                        data-product-url="${product.url}">
                    Add to Component
                </button>
            </div>
        `).join('')}
    `;
    
    // Add event listeners to the "Add to Component" buttons
    document.querySelectorAll('.add-product-btn').forEach(btn => {
        btn.addEventListener('click', addProductToComponent);
    });
    
    // Add event listener to the "Add from URL" button
    document.querySelectorAll('.add-manual-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const componentId = e.target.dataset.componentId;
            addProductManually(componentId);
        });
    });
    
    // Show the overlay and search results
    overlay.style.display = 'block';
    searchResults.style.display = 'block';
}

/**
 * Close the search results modal
 */
function closeSearch() {
    overlay.style.display = 'none';
    searchResults.style.display = 'none';
    currentSearchComponent = null;
}

/**
 * Add a product to a component
 */
function addProductToComponent(e) {
    if (!currentSearchComponent) return;
    
    const productData = e.target.dataset;
    const newProduct = {
        id: productData.productId,
        title: productData.productTitle,
        price: productData.productPrice,
        rating: parseFloat(productData.productRating),
        source: productData.productSource,
        url: productData.productUrl
    };
    
    // Check if product already exists in the component
    const existingProductIndex = currentSearchComponent.products.findIndex(p => p.id === newProduct.id);
    if (existingProductIndex === -1) {
        currentSearchComponent.products.push(newProduct);
    }
    
    saveData();
    renderComponents();
    closeSearch();
}

/**
 * Mark a product as purchased
 */
function markPurchased(e) {
    const productId = e.target.dataset.productId;
    const componentCard = e.target.closest('.component-card');
    const componentId = componentCard.dataset.id;
    
    const component = projectData.components.find(c => c.id === componentId);
    if (component) {
        component.purchased = productId;
        saveData();
        renderComponents();
    }
}

/**
 * Unmark a component as purchased
 */
function unmarkPurchased(e) {
    const componentId = e.target.dataset.componentId;
    const component = projectData.components.find(c => c.id === componentId);
    
    if (component) {
        component.purchased = null;
        saveData();
        renderComponents();
    }
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
            editingComponentId = null;
            componentNameInput.value = '';
            componentNotesInput.value = '';
            addComponentBtn.textContent = 'Add Component';
            cancelEditBtn.style.display = 'none';
        }
    }
}

/**
 * Open a real search in a new tab
 */
function openRealSearch(e) {
    const componentName = e.target.dataset.componentName;
    const searchQuery = encodeURIComponent(componentName);
    
    // Open a new tab with a Google search for the component
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
}

/**
 * Add a product URL manually from clipboard
 */
function addProductManually(componentId) {
    const component = projectData.components.find(c => c.id === componentId);
    
    if (!component) return;
    
    const url = prompt('Paste the product URL:');
    if (!url) return;
    
    const title = prompt('Enter a title for this product:');
    if (!title) return;
    
    const price = prompt('Enter the price (e.g. $19.99):');
    const rating = parseFloat(prompt('Enter the rating (1-5):', '4.5')) || 4.5;
    const source = prompt('Enter the source (e.g. Amazon, Best Buy):', 'Web');
    
    const newProduct = {
        id: 'manual-' + Date.now(),
        title,
        price: price || 'N/A',
        rating,
        source,
        url
    };
    
    component.products.push(newProduct);
    saveData();
    renderComponents();
}