/**
 * Inventory Management Logic
 * Handles persistence, rendering, and data aggregation for cases.
 */

const STORAGE_KEY = 'cs2_inventory_data';
let inventory = {};
let masterCases = [];
let lastUpdate = 'Desconocida';
let viewMode = 'grid'; // 'grid' or 'list'

// Global state for pending actions
let pendingDelete = null;
let pendingImportData = null;

document.addEventListener("DOMContentLoaded", async () => {
    // Set default dates
    const dateInput = document.getElementById('input-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    
    const sellDateInput = document.getElementById('sell-date');
    if (sellDateInput) sellDateInput.value = new Date().toISOString().split('T')[0];

    await loadMasterData();
    loadInventory();
    initEventListeners();
    initEditForm();
    initSellForm();
    initDeleteConfirmation();
    initImportConfirmation();
    renderInventory();

    // Nested modal backdrop fix
    document.addEventListener('hidden.bs.modal', function (event) {
        if (document.querySelectorAll('.modal.show').length > 0) {
            document.body.classList.add('modal-open');
        }
    });
});

/**
 * Shows a custom premium notice modal instead of alert()
 */
function showNotice(title, message) {
    document.getElementById('notice-title').innerText = title;
    document.getElementById('notice-message').innerText = message;
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('noticeModal'));
    modal.show();
}

/**
 * Loads the master list of cases from JSON
 */
async function loadMasterData() {
    try {
        const response = await fetch('data/cajas.json');
        const data = await response.json();
        masterCases = data.cajas || [];
        lastUpdate = data.last_update || 'Desconocida';
        
        // Mostrar fecha de actualización si existe el elemento
        const updateEl = document.getElementById('last-update-display');
        if (updateEl) {
            updateEl.innerText = lastUpdate;
        }

        populateCaseSelect();
    } catch (error) {
        console.error("Error loading master data:", error);
    }
}

/**
 * Populates the select dropdown with cases grouped by category
 */
function populateCaseSelect() {
    const select = document.getElementById('select-case');
    if (!select) return;

    const grouped = masterCases.reduce((acc, c) => {
        const cat = c.categoria || 'Otros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(c);
        return acc;
    }, {});

    const sortedCategories = Object.keys(grouped).sort();
    let html = '<option value="" selected disabled>Seleccionar una caja...</option>';

    sortedCategories.forEach(cat => {
        const sortedCases = grouped[cat].sort((a, b) => a.nombre.localeCompare(b.nombre));
        html += `<optgroup label="${cat}">`;
        sortedCases.forEach(c => {
            html += `<option value="${c.id}">${c.nombre}</option>`;
        });
        html += `</optgroup>`;
    });

    select.innerHTML = html;

    select.addEventListener('change', (e) => {
        const selectedCase = masterCases.find(c => c.id === e.target.value);
        if (selectedCase) {
            document.getElementById('input-price').value = selectedCase.price || selectedCase.precio || 0;
        }
    });
}

/**
 * Loads inventory from localStorage and ensures sales array exists
 */
function loadInventory() {
    const data = localStorage.getItem(STORAGE_KEY);
    inventory = data ? JSON.parse(data) : {};
    
    // Migration: ensure all items have a sales array and sources
    Object.values(inventory).forEach(item => {
        if (!item.sales) item.sales = [];
        item.history.forEach(h => {
            if (!h.sourceType) h.sourceType = 'Otro';
            if (!h.sourceDetail) h.sourceDetail = 'No especificado';
        });
    });
}

/**
 * Saves inventory to localStorage
 */
function saveInventory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}

/**
 * Initializes all event listeners for the inventory page
 */
function initEventListeners() {
    const form = document.getElementById('form-add-case');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            addCaseToInventory();
        });
    }

    document.getElementById('btn-grid-view')?.addEventListener('click', () => setViewMode('grid'));
    document.getElementById('btn-list-view')?.addEventListener('click', () => setViewMode('list'));
    document.getElementById('btn-export')?.addEventListener('click', exportInventory);
    document.getElementById('btn-import-trigger')?.addEventListener('click', () => document.getElementById('input-import').click());
    document.getElementById('input-import')?.addEventListener('change', importInventory);
}

/**
 * Handles the sell form submission
 */
function initSellForm() {
    const form = document.getElementById('form-sell-case');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            sellCaseFromInventory();
        });
    }
}

/**
 * Sets the view mode and re-renders
 */
function setViewMode(mode) {
    viewMode = mode;
    document.getElementById('btn-grid-view').classList.toggle('active', mode === 'grid');
    document.getElementById('btn-list-view').classList.toggle('active', mode === 'list');
    
    const container = document.getElementById('inventory-container');
    container.className = mode === 'grid' ? 'grid-view' : 'list-view';
    
    renderInventory();
}

/**
 * Adds a new entry to the inventory
 */
function addCaseToInventory() {
    const caseId = document.getElementById('select-case').value;
    const quantity = parseInt(document.getElementById('input-quantity').value);
    const price = parseFloat(document.getElementById('input-price').value);
    const date = document.getElementById('input-date').value;
    const sourceType = document.getElementById('input-source-type').value;
    const sourceDetail = document.getElementById('input-source-detail').value.trim() || 'No especificado';

    if (!caseId || isNaN(quantity) || isNaN(price)) return;

    if (!inventory[caseId]) {
        inventory[caseId] = {
            id: caseId,
            total_quantity: 0,
            history: [],
            sales: []
        };
    }

    inventory[caseId].total_quantity += quantity;
    inventory[caseId].history.push({
        date,
        quantity,
        price,
        sourceType,
        sourceDetail
    });

    saveInventory();
    renderInventory();

    const modal = bootstrap.Modal.getInstance(document.getElementById('addCaseModal'));
    modal.hide();
    document.getElementById('form-add-case').reset();
    document.getElementById('input-date').value = new Date().toISOString().split('T')[0];
}

/**
 * Opens the sell modal for a specific case
 */
window.openSellModal = function(caseId) {
    const item = inventory[caseId];
    if (!item || item.total_quantity <= 0) {
        showNotice("Sin Stock", "No tienes unidades disponibles para vender en este momento.");
        return;
    }

    const master = masterCases.find(c => c.id === caseId) || {};
    
    document.getElementById('sell-case-id').value = caseId;
    document.getElementById('sell-case-name').value = master.nombre || caseId;
    document.getElementById('sell-quantity').max = item.total_quantity;
    document.getElementById('sell-max-hint').innerText = `Disponible: ${item.total_quantity}`;
    document.getElementById('sell-price').value = master.precio || 0;
    document.getElementById('sell-date').value = new Date().toISOString().split('T')[0];

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('sellCaseModal'));
    modal.show();
};

/**
 * Records a sale in the inventory
 */
function sellCaseFromInventory() {
    const caseId = document.getElementById('sell-case-id').value;
    const quantity = parseInt(document.getElementById('sell-quantity').value);
    const price = parseFloat(document.getElementById('sell-price').value);
    const date = document.getElementById('sell-date').value;

    const item = inventory[caseId];
    if (!item || isNaN(quantity) || quantity > item.total_quantity) return;

    if (!item.sales) item.sales = [];

    item.total_quantity -= quantity;
    item.sales.push({
        date,
        quantity,
        price
    });

    saveInventory();
    renderInventory();

    const modal = bootstrap.Modal.getInstance(document.getElementById('sellCaseModal'));
    modal.hide();
}

/**
 * Renders the inventory based on current viewMode
 */
function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;

    const inventoryArray = Object.values(inventory);
    
    if (inventoryArray.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-5"><p class="text-secondary">Tu inventario está vacío. ¡Añade tu primera caja!</p></div>';
        updateStats(0, 0, 0, 0);
        return;
    }

    let totalCases = 0;
    let totalInvestedAllTime = 0;
    let totalCurrentInventoryValue = 0;
    let totalSalesRevenue = 0;
    let totalCostOfSales = 0;

    let html = '';

    if (viewMode === 'grid') {
        html = inventoryArray.map(item => {
            const master = masterCases.find(c => c.id === item.id) || {};
            
            const totalPurchasedQty = item.history.reduce((acc, h) => acc + h.quantity, 0);
            const totalPurchasedCost = item.history.reduce((acc, h) => acc + (h.quantity * h.price), 0);
            const avgPurchasePrice = totalPurchasedQty > 0 ? totalPurchasedCost / totalPurchasedQty : 0;
            
            const currentInventoryVal = item.total_quantity * (master.precio || 0);
            const salesRevenue = (item.sales || []).reduce((acc, s) => acc + (s.quantity * s.price), 0);
            const costOfSoldItems = (item.sales || []).reduce((acc, s) => acc + (s.quantity * avgPurchasePrice), 0);
            const realizedProfit = salesRevenue - costOfSoldItems;

            totalCases += item.total_quantity;
            totalInvestedAllTime += totalPurchasedCost;
            totalCurrentInventoryValue += currentInventoryVal;
            totalSalesRevenue += salesRevenue;
            totalCostOfSales += costOfSoldItems;

            return `
                <div class="col-md-4 col-lg-3">
                    <div class="glass-card p-0 overflow-hidden h-100 position-relative">
                        <div class="case-price-tag" title="Precio unitario actual">
                            €${(master.precio || 0).toFixed(2)}
                        </div>
                        <a href="${master.link || '#'}" target="_blank" class="steam-link-icon" title="Ver en Steam Market">
                            <i class="fa-brands fa-steam"></i>
                        </a>
                        <div class="case-img-container p-3 text-center" style="background: rgba(255,255,255,0.02);">
                            <img src="${master.foto}" alt="${master.nombre}" style="width: 100px; height: 100px; object-fit: contain; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.5));">
                        </div>
                        <div class="p-4">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <span class="tag">${master.categoria || 'N/A'}</span>
                                <small class="text-secondary">x${item.total_quantity}</small>
                            </div>
                            <h5 class="mb-3">${master.nombre || item.id}</h5>
                            <div class="d-flex justify-content-between mb-1 small">
                                <span class="text-secondary">Invertido:</span>
                                <span>€${totalPurchasedCost.toFixed(2)}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-3 small">
                                <span class="text-secondary">Valor Stock:</span>
                                <span class="text-primary fw-bold">€${currentInventoryVal.toFixed(2)}</span>
                            </div>
                            <div class="d-flex justify-content-center gap-2 mt-3">
                                <button class="btn btn-premium-action" onclick="openSellModal('${item.id}')">
                                    <i class="fa-solid fa-tag"></i> Vender
                                </button>
                                <button class="btn btn-premium-action" onclick="showDetails('${item.id}')">
                                    <i class="fa-solid fa-chart-line"></i> Info
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        html = `
            <div class="col-12">
                <div class="glass-card p-4 overflow-auto">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr class="text-secondary border-secondary">
                                <th>Caja</th>
                                <th>Categoría</th>
                                <th>Stock</th>
                                <th>Inversión</th>
                                <th>Valor Stock</th>
                                <th>Profit Realizado</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inventoryArray.map(item => {
                                const master = masterCases.find(c => c.id === item.id) || {};
                                
                                const totalPurchasedQty = item.history.reduce((acc, h) => acc + h.quantity, 0);
                                const totalPurchasedCost = item.history.reduce((acc, h) => acc + (h.quantity * h.price), 0);
                                const avgPurchasePrice = totalPurchasedQty > 0 ? totalPurchasedCost / totalPurchasedQty : 0;
                                
                                const currentInventoryVal = item.total_quantity * (master.precio || 0);
                                const salesRevenue = (item.sales || []).reduce((acc, s) => acc + (s.quantity * s.price), 0);
                                const costOfSoldItems = (item.sales || []).reduce((acc, s) => acc + (s.quantity * avgPurchasePrice), 0);
                                const realizedProfit = salesRevenue - costOfSoldItems;

                                totalCases += item.total_quantity;
                                totalInvestedAllTime += totalPurchasedCost;
                                totalCurrentInventoryValue += currentInventoryVal;
                                totalSalesRevenue += salesRevenue;
                                totalCostOfSales += costOfSoldItems;

                                return `
                                    <tr class="align-middle border-secondary">
                                        <td>
                                            <div class="d-flex align-items-center">
                                                <img src="${master.foto}" alt="" style="width: 40px; height: 40px; object-fit: contain;" class="me-3">
                                                <span class="fw-bold">${master.nombre || item.id}</span>
                                            </div>
                                        </td>
                                        <td><span class="tag" style="font-size: 0.6rem;">${master.categoria || 'N/A'}</span></td>
                                        <td>${item.total_quantity}</td>
                                        <td>€${totalPurchasedCost.toFixed(2)}</td>
                                        <td class="text-primary fw-bold">€${currentInventoryVal.toFixed(2)}</td>
                                        <td class="${realizedProfit > 0 ? 'text-success' : realizedProfit < 0 ? 'text-danger' : 'text-secondary'}">
                                            €${realizedProfit.toFixed(2)}
                                        </td>
                                        <td class="text-end">
                                            <div class="d-flex gap-2 justify-content-end">
                                                <button class="btn btn-premium-action" onclick="openSellModal('${item.id}')">
                                                    <i class="fa-solid fa-tag"></i> Vender
                                                </button>
                                                <button class="btn btn-premium-action" onclick="showDetails('${item.id}')">
                                                    <i class="fa-solid fa-chart-line"></i> Info
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    grid.innerHTML = html;
    updateStats(totalCases, totalInvestedAllTime, totalCurrentInventoryValue, totalSalesRevenue - totalCostOfSales);
}

/**
 * Updates the summary statistics at the top
 */
function updateStats(totalQty, totalInvested, inventoryVal, realizedProfit) {
    let totalCurrentStockCost = 0;
    Object.values(inventory).forEach(item => {
        const totalPurchasedQty = item.history.reduce((acc, h) => acc + h.quantity, 0);
        const totalPurchasedCost = item.history.reduce((acc, h) => acc + (h.quantity * h.price), 0);
        const avg = totalPurchasedQty > 0 ? totalPurchasedCost / totalPurchasedQty : 0;
        totalCurrentStockCost += item.total_quantity * avg;
    });

    const potentialProfit = inventoryVal - totalCurrentStockCost;
    const finalBalance = potentialProfit + realizedProfit;

    document.getElementById('stat-total-cases').innerText = totalQty;
    document.getElementById('stat-total-invested').innerText = `€${totalInvested.toFixed(2)}`;
    document.getElementById('stat-total-current').innerText = `€${inventoryVal.toFixed(2)}`;
    document.getElementById('stat-realized-profit').innerText = `€${realizedProfit.toFixed(2)}`;
    
    const profitElement = document.getElementById('stat-total-profit');
    if (profitElement) {
        profitElement.innerText = `€${finalBalance.toFixed(2)}`;
        profitElement.className = `mb-0 ${finalBalance >= 0 ? 'text-success' : 'text-danger'}`;
    }
}

/**
 * Exports inventory as a JSON file
 */
function exportInventory() {
    const dataStr = JSON.stringify(inventory, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `cs2_inventory_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

/**
 * Initial step for importing: Read the file
 */
function importInventory(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (typeof importedData === 'object' && importedData !== null) {
                // Store data and show confirmation modal
                pendingImportData = importedData;
                const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmImportModal'));
                modal.show();
            } else {
                showNotice("Error", "El archivo JSON no tiene un formato válido.");
            }
        } catch (err) {
            console.error('Error parsing JSON:', err);
            showNotice("Error", "No se pudo leer el archivo. Asegúrate de que es un JSON válido.");
        }
        // Clear input so same file can be re-imported if needed
        document.getElementById('input-import').value = '';
    };
    reader.readAsText(file);
}

/**
 * Initializes the import confirmation logic
 */
function initImportConfirmation() {
    document.getElementById('btn-import-merge')?.addEventListener('click', () => {
        if (pendingImportData) {
            executeImport(pendingImportData, 'merge');
            bootstrap.Modal.getInstance(document.getElementById('confirmImportModal')).hide();
            pendingImportData = null;
        }
    });

    document.getElementById('btn-import-overwrite')?.addEventListener('click', () => {
        if (pendingImportData) {
            executeImport(pendingImportData, 'overwrite');
            bootstrap.Modal.getInstance(document.getElementById('confirmImportModal')).hide();
            pendingImportData = null;
        }
    });
}

/**
 * Performs the actual data load based on mode
 */
function executeImport(importedData, mode) {
    if (mode === 'overwrite') {
        inventory = importedData;
    } else {
        // Merge logic
        for (const key in importedData) {
            if (inventory[key]) {
                inventory[key].total_quantity += importedData[key].total_quantity;
                inventory[key].history = [...inventory[key].history, ...(importedData[key].history || [])];
                inventory[key].sales = [...(inventory[key].sales || []), ...(importedData[key].sales || [])];
            } else {
                inventory[key] = importedData[key];
            }
        }
    }
    
    saveInventory();
    renderInventory();
    
    const msg = mode === 'overwrite' 
        ? "El inventario ha sido reemplazado correctamente." 
        : "El inventario se ha importado y fusionado correctamente.";
    showNotice("Éxito", msg);
}

/**
 * Shows detailed history in a modal
 */
window.showDetails = function(caseId) {
    const item = inventory[caseId];
    if (!item) return;
    
    const master = masterCases.find(c => c.id === caseId) || {};
    
    document.getElementById('historyModalTitle').innerText = master.nombre || caseId;
    document.getElementById('historyModalSubtitle').innerText = `Historial completo - ${master.categoria || 'Sin categoría'}`;
    
    const totalInvested = item.history.reduce((acc, h) => acc + (h.quantity * h.price), 0);
    const totalPurchasedQty = item.history.reduce((acc, h) => acc + h.quantity, 0);
    const avgPrice = totalPurchasedQty > 0 ? totalInvested / totalPurchasedQty : 0;

    document.getElementById('detail-total-qty').innerText = item.total_quantity;
    document.getElementById('detail-avg-price').innerText = `€${avgPrice.toFixed(2)}`;
    document.getElementById('detail-total-invested').innerText = `€${totalInvested.toFixed(2)}`;

    const tableBody = document.getElementById('history-table-body');
    
    // Combine purchases and sales for a unified history
    const allTransactions = [
        ...item.history.map((h, i) => ({ ...h, type: 'buy', index: i })),
        ...(item.sales || []).map((s, i) => ({ ...s, type: 'sell', index: i }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    tableBody.innerHTML = allTransactions.map(t => `
        <tr class="align-middle border-secondary-subtle">
            <td>
                <div class="d-flex align-items-center">
                    <div class="history-icon-circle me-3 ${t.type === 'buy' ? '' : 'bg-info'}">
                        <i class="fa-solid ${t.type === 'buy' ? 'fa-cart-shopping' : 'fa-hand-holding-dollar'} text-white" style="font-size: 0.6rem;"></i>
                    </div>
                    <div>
                        <span class="text-secondary small fw-medium d-block">${new Date(t.date).toLocaleDateString('es-ES')}</span>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge ${t.type === 'buy' ? 'bg-success' : 'bg-info'} text-uppercase" style="font-size: 0.5rem;">${t.type === 'buy' ? 'Compra' : 'Venta'}</span>
                            ${t.type === 'buy' ? `<span class="text-secondary" style="font-size: 0.6rem;">[${t.sourceType || 'Otro'}: ${t.sourceDetail || 'No especificado'}]</span>` : ''}
                        </div>
                    </div>
                </div>
            </td>
            <td class="text-center">
                <span class="badge rounded-pill bg-dark border border-secondary px-3 py-2 fw-bold" style="font-size: 0.75rem;">
                    ${t.quantity} <span class="text-secondary ms-1 fw-normal" style="font-size: 0.65rem;">uds</span>
                </span>
            </td>
            <td class="text-end fw-semibold">€${t.price.toFixed(2)}</td>
            <td class="text-end">
                <span class="fw-bold ${t.type === 'buy' ? 'text-white' : 'text-info'}">€${(t.quantity * t.price).toFixed(2)}</span>
            </td>
            <td class="text-end">
                ${t.type === 'buy' ? `
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-action-edit" onclick="openEditEntryModal('${caseId}', ${t.index})" title="Editar entrada">
                            <i class="fa-solid fa-pencil" style="font-size: 0.7rem;"></i>
                        </button>
                        <button class="btn btn-action-delete" onclick="requestDeleteEntry('${caseId}', ${t.index}, 'buy')" title="Eliminar entrada">
                            <i class="fa-solid fa-trash" style="font-size: 0.7rem;"></i>
                        </button>
                    </div>
                ` : `
                    <button class="btn btn-action-delete" onclick="requestDeleteEntry('${caseId}', ${t.index}, 'sell')" title="Eliminar venta">
                        <i class="fa-solid fa-trash" style="font-size: 0.7rem;"></i>
                    </button>
                `}
            </td>
        </tr>
    `).join('');

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('historyModal'));
    modal.show();
};

/**
 * Request delete confirmation via custom modal
 */
window.requestDeleteEntry = function(caseId, index, type) {
    pendingDelete = { caseId, index, type };
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmDeleteModal'));
    modal.show();
};

/**
 * Initializes the delete confirmation modal logic
 */
function initDeleteConfirmation() {
    const btn = document.getElementById('btn-confirm-delete');
    if (btn) {
        btn.addEventListener('click', () => {
            if (pendingDelete) {
                const { caseId, index, type } = pendingDelete;
                if (type === 'buy') {
                    executeDeleteHistoryEntry(caseId, index);
                } else {
                    executeDeleteSaleEntry(caseId, index);
                }
                bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
                pendingDelete = null;
            }
        });
    }
}

/**
 * Deletes a sale entry after confirmation
 */
function executeDeleteSaleEntry(caseId, index) {
    const item = inventory[caseId];
    if (item && item.sales[index]) {
        const removed = item.sales.splice(index, 1)[0];
        item.total_quantity += removed.quantity;
        saveInventory();
        renderInventory();
        showDetails(caseId);
    }
}

/**
 * Deletes a purchase entry after confirmation
 */
function executeDeleteHistoryEntry(caseId, index) {
    const item = inventory[caseId];
    if (!item) return;
    const removed = item.history.splice(index, 1)[0];
    item.total_quantity -= removed.quantity;
    if (item.history.length === 0 && (!item.sales || item.sales.length === 0)) {
        delete inventory[caseId];
        bootstrap.Modal.getInstance(document.getElementById('historyModal')).hide();
    } else {
        showDetails(caseId);
    }
    saveInventory();
    renderInventory();
}

/**
 * Opens the edit modal for a specific entry
 */
window.openEditEntryModal = function(caseId, index) {
    const item = inventory[caseId];
    if (!item || !item.history[index]) return;
    const entry = item.history[index];
    document.getElementById('edit-case-id').value = caseId;
    document.getElementById('edit-entry-index').value = index;
    document.getElementById('edit-quantity').value = entry.quantity;
    document.getElementById('edit-price').value = entry.price;
    document.getElementById('edit-date').value = entry.date;
    document.getElementById('edit-source-type').value = entry.sourceType || 'Otro';
    document.getElementById('edit-source-detail').value = entry.sourceDetail || '';
    
    const editModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('editEntryModal'));
    editModal.show();
};

/**
 * Handles the edit form submission
 */
function initEditForm() {
    const form = document.getElementById('form-edit-entry');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const caseId = document.getElementById('edit-case-id').value;
            const index = parseInt(document.getElementById('edit-entry-index').value);
            const quantity = parseInt(document.getElementById('edit-quantity').value);
            const price = parseFloat(document.getElementById('edit-price').value);
            const date = document.getElementById('edit-date').value;
            const sourceType = document.getElementById('edit-source-type').value;
            const sourceDetail = document.getElementById('edit-source-detail').value.trim() || 'No especificado';

            if (inventory[caseId] && inventory[caseId].history[index]) {
                const oldQty = inventory[caseId].history[index].quantity;
                inventory[caseId].total_quantity = inventory[caseId].total_quantity - oldQty + quantity;
                inventory[caseId].history[index] = { 
                    date, 
                    quantity, 
                    price,
                    sourceType,
                    sourceDetail
                };
                saveInventory();
                renderInventory();
                bootstrap.Modal.getInstance(document.getElementById('editEntryModal')).hide();
                showDetails(caseId);
            }
        });
    }
}
