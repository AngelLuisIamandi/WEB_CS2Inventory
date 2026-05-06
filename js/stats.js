/**
 * Statistics and Charting Logic
 * Handles data aggregation and ApexCharts visualization.
 */

const STORAGE_KEY = 'cs2_inventory_data';
let inventory = {};
let masterCases = [];
let chart = null;

document.addEventListener("DOMContentLoaded", async () => {
    await loadMasterData();
    loadInventory();
    populateFilter();
    initChart();
    
    document.getElementById('filter-case').addEventListener('change', () => {
        updateChartData();
    });
});

/**
 * Loads the master list of cases from JSON
 */
async function loadMasterData() {
    try {
        const response = await fetch('data/cajas.json');
        const data = await response.json();
        masterCases = data.cajas || [];
    } catch (error) {
        console.error("Error loading master data:", error);
    }
}

/**
 * Loads inventory from localStorage
 */
function loadInventory() {
    const data = localStorage.getItem(STORAGE_KEY);
    inventory = data ? JSON.parse(data) : {};
}

/**
 * Populates the filter dropdown with items currently in inventory
 */
function populateFilter() {
    const select = document.getElementById('filter-case');
    if (!select) return;

    const inventoryArray = Object.values(inventory);
    
    inventoryArray.forEach(item => {
        const master = masterCases.find(c => c.id === item.id) || {};
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = master.nombre || item.id;
        select.appendChild(option);
    });
}

/**
 * Processes data for the chart based on the selected filter
 */
function getChartData(filterId = 'all') {
    let allTransactions = [];

    const itemsToProcess = filterId === 'all' 
        ? Object.values(inventory) 
        : [inventory[filterId]].filter(Boolean);

    itemsToProcess.forEach(item => {
        // Add purchases
        item.history.forEach(h => {
            allTransactions.push({
                date: new Date(h.date),
                qty: h.quantity,
                cost: h.quantity * h.price,
                type: 'buy',
                id: item.id
            });
        });
        // Add sales
        (item.sales || []).forEach(s => {
            allTransactions.push({
                date: new Date(s.date),
                qty: s.quantity,
                cost: s.quantity * s.price,
                type: 'sell',
                id: item.id
            });
        });
    });

    // Sort by date
    allTransactions.sort((a, b) => a.date - b.date);

    // Group by date to handle multiple transactions on the same day
    const dailyData = {};
    
    // We need to track average cost per item to calculate realized profit
    const itemStats = {}; 

    let cumulativeQty = 0;
    let cumulativeInvested = 0;
    let cumulativeProfit = 0;

    allTransactions.forEach(t => {
        const dateStr = t.date.toISOString().split('T')[0];
        
        if (!itemStats[t.id]) {
            itemStats[t.id] = { totalQty: 0, totalCost: 0 };
        }

        if (t.type === 'buy') {
            cumulativeQty += t.qty;
            cumulativeInvested += t.cost;
            
            // Update item stats for avg cost
            itemStats[t.id].totalQty += t.qty;
            itemStats[t.id].totalCost += t.cost;
        } else {
            cumulativeQty -= t.qty;
            
            // Calculate profit for this sale
            const avgCost = itemStats[t.id].totalQty > 0 
                ? itemStats[t.id].totalCost / itemStats[t.id].totalQty 
                : 0;
            
            const costOfItemsSold = t.qty * avgCost;
            const profitFromSale = t.cost - costOfItemsSold;
            
            cumulativeProfit += profitFromSale;

            // Update item stats (reduce proportionately)
            itemStats[t.id].totalQty -= t.qty;
            itemStats[t.id].totalCost -= costOfItemsSold;
        }

        dailyData[dateStr] = {
            qty: cumulativeQty,
            invested: cumulativeInvested,
            profit: cumulativeProfit
        };
    });

    const dates = Object.keys(dailyData).sort();
    return {
        labels: dates,
        series: [
            {
                name: 'Cantidad de Cajas',
                data: dates.map(d => dailyData[d].qty)
            },
            {
                name: 'Inversión Acumulada (€)',
                data: dates.map(d => dailyData[d].invested.toFixed(2))
            },
            {
                name: 'Beneficio Realizado (€)',
                data: dates.map(d => dailyData[d].profit.toFixed(2))
            }
        ]
    };
}

/**
 * Initializes the ApexCharts instance
 */
function initChart() {
    const data = getChartData();
    
    const options = {
        series: data.series,
        chart: {
            type: 'line',
            height: 500,
            background: 'transparent',
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                }
            },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800
            }
        },
        colors: ['#ffffff', '#007bff', '#28a745'],
        stroke: {
            curve: 'smooth',
            width: [2, 3, 3]
        },
        theme: {
            mode: 'dark'
        },
        xaxis: {
            categories: data.labels,
            type: 'datetime',
            labels: {
                style: {
                    colors: 'rgba(255, 255, 255, 0.6)'
                }
            },
            axisBorder: {
                show: false
            }
        },
        yaxis: [
            {
                title: {
                    text: 'Unidades',
                    style: { color: '#ffffff' }
                },
                labels: {
                    style: { colors: '#ffffff' }
                }
            },
            {
                opposite: true,
                title: {
                    text: 'Euros (€)',
                    style: { color: '#007bff' }
                },
                labels: {
                    style: { colors: '#007bff' },
                    formatter: (val) => `€${parseFloat(val).toFixed(2)}`
                }
            }
        ],
        legend: {
            position: 'top',
            horizontalAlign: 'center',
            labels: {
                colors: '#ffffff'
            }
        },
        grid: {
            borderColor: 'rgba(255, 255, 255, 0.05)',
            strokeDashArray: 4
        },
        tooltip: {
            shared: true,
            intersect: false,
            theme: 'dark',
            x: {
                format: 'dd MMM yyyy'
            },
            y: {
                formatter: (val, { seriesIndex }) => {
                    if (seriesIndex === 0) return `${val} uds`;
                    return `€${parseFloat(val).toFixed(2)}`;
                }
            }
        }
    };

    chart = new ApexCharts(document.querySelector("#mainChart"), options);
    chart.render().then(() => {
        // Refresh ScrollTrigger after chart is rendered to account for layout changes
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    });
}

/**
 * Updates chart data when filter changes
 */
function updateChartData() {
    const filterId = document.getElementById('filter-case').value;
    const newData = getChartData(filterId);
    
    chart.updateOptions({
        xaxis: {
            categories: newData.labels
        }
    });
    chart.updateSeries(newData.series);
}
