/**
 * Case Catalog Logic for the Home Page
 * Handles fetching all cases and rendering them by category.
 */

let allCases = [];
let activeCategory = 'all';

document.addEventListener("DOMContentLoaded", async () => {
    await loadCatalogData();
    renderFilters();
    renderCatalog();
});

/**
 * Loads the master list of cases
 */
async function loadCatalogData() {
    try {
        const response = await fetch('data/cajas.json');
        allCases = await response.json();
    } catch (error) {
        console.error("Error loading catalog data:", error);
    }
}

/**
 * Renders the category filter buttons
 */
function renderFilters() {
    const filterContainer = document.getElementById('catalog-filters');
    if (!filterContainer) return;

    // Extract unique categories
    const categories = [...new Set(allCases.map(c => c.categoria))].filter(Boolean).sort();
    
    const filterHtml = categories.map(cat => `
        <button class="btn btn-premium-action px-4" data-category="${cat}">${cat}</button>
    `).join('');

    filterContainer.innerHTML = `<button class="btn btn-premium-action active px-4" data-category="all">Todas</button>` + filterHtml;

    // Add click events
    filterContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            filterContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.getAttribute('data-category');
            renderCatalog();
        });
    });
}

/**
 * Renders the case catalog grid
 */
function renderCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    const filteredCases = activeCategory === 'all' 
        ? allCases 
        : allCases.filter(c => c.categoria === activeCategory);

    // Grouping logic (optional if we want a unified grid, but requested "ordenado por categorias")
    // If "all" is selected, we can still group them for a better layout
    
    let html = '';

    if (activeCategory === 'all') {
        const grouped = filteredCases.reduce((acc, c) => {
            const cat = c.categoria || 'Otros';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(c);
            return acc;
        }, {});

        Object.keys(grouped).sort().forEach(cat => {
            html += `
                <div class="col-12 mt-5 mb-3">
                    <h3 class="fw-bold text-gradient-primary d-inline-block">${cat}</h3>
                    <div class="border-bottom border-primary opacity-25 mt-2" style="width: 50px; border-width: 3px !important;"></div>
                </div>
            `;
            html += grouped[cat].map(c => renderCaseCard(c)).join('');
        });
    } else {
        html = filteredCases.map(c => renderCaseCard(c)).join('');
    }

    grid.innerHTML = html;

    // Trigger entrance animation for new cards
    gsap.from("#catalog-grid .col-md-4", {
        opacity: 0,
        y: 20,
        duration: 0.5,
        stagger: 0.05,
        ease: "power2.out"
    });
}

/**
 * Generates the HTML for a single case card
 */
function renderCaseCard(c) {
    return `
        <div class="col-md-4 col-lg-3">
            <div class="glass-card p-0 overflow-hidden h-100 position-relative">
                <a href="${c.link || '#'}" target="_blank" class="steam-link-icon" title="Ver en Steam Market">
                    <i class="fa-brands fa-steam"></i>
                </a>
                <div class="case-img-container p-3 text-center" style="background: rgba(255,255,255,0.01);">
                    <img src="${c.foto}" alt="${c.nombre}" style="width: 80px; height: 80px; object-fit: contain; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5));">
                </div>
                <div class="p-3">
                    <div class="mb-1">
                        <span class="tag" style="font-size: 0.55rem; padding: 0.2rem 0.6rem;">${c.categoria || 'N/A'}</span>
                    </div>
                    <h6 class="mb-2 fw-bold" style="font-size: 0.9rem;">${c.nombre}</h6>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-secondary small">Precio Market:</span>
                        <span class="text-primary fw-bold">€${c.precio.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
