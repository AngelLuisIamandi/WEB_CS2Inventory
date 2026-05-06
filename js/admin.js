/**
 * Admin Panel Logic
 * Handles loading, editing, and exporting master case data.
 */

let masterCases = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadMasterData();
    initEventListeners();
});

/**
 * Loads the master list of cases from JSON
 */
async function loadMasterData() {
    try {
        const response = await fetch('data/cajas.json');
        masterCases = await response.json();
        renderAdminTable();
    } catch (error) {
        console.error("Error loading master data:", error);
    }
}

/**
 * Renders the administration table
 */
function renderAdminTable() {
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;

    tbody.innerHTML = masterCases.map((c, index) => `
        <tr class="align-middle border-secondary">
            <td>
                <div class="d-flex align-items-center">
                    <img src="${c.foto}" alt="" style="width: 40px; height: 40px; object-fit: contain;" class="me-3">
                    <span class="fw-bold">${c.nombre}</span>
                </div>
            </td>
            <td><span class="tag" style="font-size: 0.6rem;">${c.categoria || 'N/A'}</span></td>
            <td class="text-center">
                <a href="${c.link}" target="_blank" class="btn btn-sm btn-premium-outline btn-premium px-3">
                    <i class="fa-brands fa-steam me-1"></i> Abrir Steam
                </a>
            </td>
            <td class="text-end">
                <input type="number" 
                       class="form-control form-control-sm bg-dark border-secondary text-white text-end price-input" 
                       value="${c.precio}" 
                       step="0.01" 
                       min="0"
                       data-index="${index}">
            </td>
        </tr>
    `).join('');

    // Add event listeners to price inputs to update the local array
    document.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = e.target.getAttribute('data-index');
            const newPrice = parseFloat(e.target.value);
            if (!isNaN(newPrice)) {
                masterCases[index].precio = newPrice;
            }
        });
    });
}

/**
 * Initializes event listeners for the admin page
 */
function initEventListeners() {
    // Generate JSON Button
    document.getElementById('btn-generate-json')?.addEventListener('click', () => {
        const jsonOutput = document.getElementById('json-output');
        if (jsonOutput) {
            jsonOutput.value = JSON.stringify(masterCases, null, 4);
            const modal = new bootstrap.Modal(document.getElementById('jsonModal'));
            modal.show();
        }
    });

    // Copy JSON Button
    document.getElementById('btn-copy-json')?.addEventListener('click', () => {
        const jsonOutput = document.getElementById('json-output');
        if (jsonOutput) {
            jsonOutput.select();
            document.execCommand('copy');
            
            const btn = document.getElementById('btn-copy-json');
            const originalText = btn.innerText;
            btn.innerText = "¡Copiado!";
            btn.classList.replace('btn-premium-primary', 'btn-success');
            
            setTimeout(() => {
                btn.innerText = originalText;
                btn.classList.replace('btn-success', 'btn-premium-primary');
            }, 2000);
        }
    });
}
