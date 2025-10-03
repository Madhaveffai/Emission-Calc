// Add Chart.js via CDN if not already present
// Cache bust: All property types loaded - v2.0
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('chartjs-cdn')) {
        const script = document.createElement('script');
        script.id = 'chartjs-cdn';
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        document.head.appendChild(script);
    }
    // Use types from limit_factors.json (keep in sync with backend) - Updated with all property types
    const USE_TYPES = [
        "Adult Education",
        "Ambulatory Surgical Center",
        "Automobile Dealership",
        "Bank Branch",
        "Bowling Alley",
        "College/University",
        "Convenience Store without Gas Station",
        "Courthouse",
        "Data Center",
        "Distribution Center",
        "Enclosed Mall",
        "Financial Office",
        "Fitness Center/Health Club/Gym",
        "Food Sales",
        "Food Service",
        "Hospital (General Medical & Surgical)",
        "Hotel",
        "K-12 School",
        "Laboratory",
        "Library",
        "Lifestyle Center",
        "Mailing Center/Post Office",
        "Manufacturing/Industrial Plant",
        "Medical Office",
        "Movie Theater",
        "Multifamily Housing",
        "Museum",
        "Non-Refrigerated Warehouse",
        "Office",
        "Other - Education",
        "Other - Entertainment & Public Assembly",
        "Other - Mall",
        "Other - Public Services",
        "Other - Recreation",
        "Other - Restaurant /Bar",
        "Other - Services",
        "Other - Specialty Hospital",
        "Other-  Lodging/Residential",
        "OtherTechnology /Science",
        "Outpatient Rehabilitation/Physical Therapy",
        "Parking",
        "Performing Arts",
        "Personal Services (Health/Beauty, Dry Cleaning, etc.)",
        "Pre-school/Daycare",
        "Refrigerated Warehouse",
        "Repair Services (Vehicle, Shoe, Locksmith, etc.)",
        "Residence Hall or Dormitory",
        "Residential Care Facility",
        "Restaurant",
        "Retail Store",
        "Self-Storage Facility",
        "Senior Care Community",
        "Social/Meeting Hall",
        "Strip Mall",
        "Supermarket /Grocery Store",
        "Transportation Terminal/Station",
        "Urgent Care/Clinic/Other Outpatient",
        "Vocational School",
        "Wholesale Club or Supercenter",
        "Worship Facility",
        "None"
    ];

    function createUseTypeRow(selected, area) {
        const div = document.createElement('div');
        div.className = 'flex space-x-2 items-center mb-2';

        const select = document.createElement('select');
        select.className = 'border rounded px-2 py-1';
        USE_TYPES.forEach(type => {
            const opt = document.createElement('option');
            opt.value = type;
            opt.textContent = type;
            if (type === selected) opt.selected = true;
            select.appendChild(opt);
        });

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.placeholder = 'Area (sq ft)';
        input.className = 'border rounded px-2 py-1 w-32';
        input.value = area || '';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '×';
        removeBtn.className = 'ml-2 px-2 py-1 bg-red-100 text-red-600 rounded';
        removeBtn.onclick = () => div.remove();

        div.appendChild(select);
        div.appendChild(input);
        div.appendChild(removeBtn);
        return div;
    }

    function renderUseTypesList() {
        const list = document.getElementById('use-types-list');
        list.innerHTML = '';
        list.appendChild(createUseTypeRow('Office', ''));
    }

    document.getElementById('add-use-type').onclick = function() {
        document.getElementById('use-types-list').appendChild(createUseTypeRow('Office', ''));
    };
    // Ensure at least one row is visible on load
    renderUseTypesList();
});

document.getElementById('emissions-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    // Gather use types
    const useTypes = [];
    document.querySelectorAll('#use-types-list > div').forEach(row => {
        const type = row.querySelector('select').value;
        const area = parseFloat(row.querySelector('input').value) || 0;
        if (area > 0) useTypes.push({ useType: type, area });
    });
    const data = {
        buildingName: document.getElementById('buildingName').value,
        useTypes: useTypes,
        electricity: Number(document.getElementById('electricity').value),
        gas: Number(document.getElementById('gas').value),
        fuelOil2: Number(document.getElementById('fuelOil2').value),
        fuelOil4: Number(document.getElementById('fuelOil4').value),
        steam: Number(document.getElementById('steam').value)
    };
    const res = await fetch('/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    // Persist payload for PDF generation
    try { localStorage.setItem('lastPayload', JSON.stringify(data)); } catch (e) {}
    const result = await res.json();
    renderResults(result);
    document.getElementById('sidebar-container').style.display = 'none';
    document.getElementById('results-container').style.display = 'block';
});

document.getElementById('back-btn').addEventListener('click', function() {
    document.getElementById('results-container').style.display = 'none';
    document.getElementById('sidebar-container').style.display = 'flex';
});

function renderResults(result) {
    const resultDiv = document.getElementById('result');
    if (!result || !result.periods) {
        resultDiv.innerText = 'No results.';
        return;
    }
    // Header + summary tables
    const areaEntries = Object.entries(result.areas || {});
    const areaRows = areaEntries.length > 0
        ? areaEntries.map(([useType, area]) => `<tr><td class="border px-2 py-1 text-left">${useType}</td><td class="border px-2 py-1 text-right">${Number(area).toLocaleString()}</td></tr>`).join('')
        : `<tr><td class="border px-2 py-1 text-center" colspan="2">—</td></tr>`;

    const units = {
        electricity: 'kWh',
        gas: 'therms',
        fuelOil2: 'gal',
        fuelOil4: 'gal',
        steam: 'MLb'
    };
    const utilityEntries = Object.entries(result.utilityUsage || {});
    const utilityRows = utilityEntries.map(([k, v]) => {
        const labelMap = {
            electricity: 'Electricity',
            gas: 'Gas',
            fuelOil2: 'Fuel Oil #2',
            fuelOil4: 'Fuel Oil #4',
            steam: 'Steam'
        };
        const label = labelMap[k] || k;
        const val = Number(v || 0);
        return `<tr><td class="border px-2 py-1 text-left">${label}</td><td class="border px-2 py-1 text-right">${val.toLocaleString()} ${units[k] || ''}</td></tr>`;
    }).join('');

    let html = `<div class="results-section">
        <h2 class="text-2xl font-semibold mb-3">${result.buildingName || ''}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div class="card">
                <div class="font-semibold mb-2">Areas (sq ft)</div>
                <div class="overflow-x-auto"><table class="table min-w-full text-sm text-center">
                    <thead><tr><th class="text-left">Use Type</th><th class="text-right">Area</th></tr></thead>
                    <tbody>${areaRows}</tbody>
                </table></div>
            </div>
            <div class="card">
                <div class="font-semibold mb-2">Utility Usage</div>
                <div class="overflow-x-auto"><table class="table min-w-full text-sm text-center">
                    <thead><tr><th class="text-left">Utility</th><th class="text-right">Usage</th></tr></thead>
                    <tbody>${utilityRows}</tbody>
                </table></div>
            </div>
        </div>
    </div>`;
    // Table header (periods as columns)
    html += `<div class="overflow-x-auto card"><table class="table min-w-full text-sm text-center">
        <thead>
            <tr>
                <th>&nbsp;</th>`;
    result.periods.forEach(p => {
        html += `<th>${p.label}</th>`;
    });
    html += `</tr></thead><tbody>`;
    // Emissions
    html += `<tr><td class="font-medium">Emissions<br/>(tCO2e/yr)</td>`;
    result.periods.forEach(p => {
        html += `<td>${p.totalEmissions.toFixed(2)}</td>`;
    });
    html += `</tr>`;
    // Limit
    html += `<tr><td class="font-medium">Threshold<br/>(tCO2e/yr)</td>`;
    result.periods.forEach(p => {
        html += `<td>${p.totalLimit ? p.totalLimit.toFixed(2) : '-'}</td>`;
    });
    html += `</tr>`;
    // Over Threshold (only row kept)
    html += `<tr><td class="font-medium">Carbon Over Threshold<br/>(tCO2e/yr)</td>`;
    result.periods.forEach(p => {
        html += `<td>${p.overage !== null && p.overage !== undefined ? p.overage.toFixed(2) : '-'}</td>`;
    });
    html += `</tr>`;
    // Penalty
    html += `<tr><td class="font-medium">Est Penalty<br/>($/yr)</td>`;
    result.periods.forEach(p => {
        html += `<td>${p.penalty !== null && p.penalty !== undefined ? ('$' + p.penalty.toLocaleString(undefined, {maximumFractionDigits:0})) : '-'}</td>`;
    });
    html += `</tr>`;
    html += `</tbody></table></div>`;
    // Chart placeholder
    html += `<div class="mt-8 card" style="height: 28rem;"><canvas id="emissionsChart"></canvas></div>`;
    resultDiv.innerHTML = html;
    // Wait for Chart.js to load
    function drawChart() {
        const ctx = document.getElementById('emissionsChart').getContext('2d');
        const labels = result.periods.map(p => p.label);
        const emissions = result.periods.map(p => {
            if (p.totalEmissions <= p.totalLimit) return p.totalEmissions;
            return p.totalLimit;
        });
        const overages = result.periods.map(p => {
            if (p.totalEmissions > p.totalLimit) return p.totalEmissions - p.totalLimit;
            return 0;
        });
        const limits = result.periods.map(p => p.totalLimit);
        const chartMaxCandidate = Math.max(
            ...result.periods.map(p => Math.max(p.totalEmissions || 0, p.totalLimit || 0))
        );
        const limitLinePoints = [{ x: -0.5, y: chartMaxCandidate }, ...limits.map((y, i) => ({ x: i + 0.5, y }))];
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Emissions Below Limit (tCO2e/yr)',
                        data: emissions,
                        backgroundColor: 'rgba(34,197,94,0.35)',
                        stack: 'emissions',
                        borderWidth: 0,
                        borderRadius: 6,
                        categoryPercentage: 0.7,
                        barPercentage: 0.85
                    },
                    {
                        label: 'Overage (tCO2e/yr)',
                        data: overages,
                        backgroundColor: 'rgba(234,179,8,0.75)',
                        stack: 'emissions',
                        borderWidth: 0,
                        borderRadius: 6,
                        categoryPercentage: 0.7,
                        barPercentage: 0.85
                    },
                    {
                        label: 'Emissions Limit (tCO2e/yr)',
                        data: limitLinePoints,
                        type: 'line',
                        parsing: false,
                        fill: false,
                        borderColor: '#ef4444',
                        backgroundColor: '#ef4444',
                        borderWidth: 2,
                        pointRadius: 0,
                        stepped: 'after',
                        order: 0,
                        clip: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12 } },
                    title: { display: true, text: 'LL97 Carbon Emissions' }
                },
                scales: {
                    x: {
                        stacked: true,
                        offset: true,
                        grid: { offset: true }
                    },
                    y: { beginAtZero: true, title: { display: true, text: 'tons CO2e/yr' }, ticks: { precision: 0 } }
                }
            }
        });
    }
    if (window.Chart) {
        drawChart();
    } else {
        // Wait for Chart.js to load
        const interval = setInterval(() => {
            if (window.Chart) {
                clearInterval(interval);
                drawChart();
            }
        }, 100);
    }

    // Add Generate PDF button
    const pdfBtn = document.createElement('button');
    pdfBtn.textContent = 'Generate PDF Report';
    pdfBtn.className = 'mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700';
    pdfBtn.onclick = async () => {
        const payload = JSON.parse(localStorage.getItem('lastPayload') || '{}');
        // Fallback to current inputs if not stored
        if (!payload.buildingName) {
            payload.buildingName = result.buildingName;
            payload.useTypes = Object.entries(result.areas || {}).map(([useType, area]) => ({ useType, area }));
            payload = { ...payload, ...(result.utilityUsage || {}) };
        }
        // Capture chart image as base64 PNG to embed in report
        try {
            const canvas = document.getElementById('emissionsChart');
            payload.chartImageBase64 = canvas.toDataURL('image/png');
        } catch (e) {}
        const res = await fetch('/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        // When backend returns a file, trigger download
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const cd = res.headers.get('Content-Disposition') || '';
            const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
            const filename = decodeURIComponent(match?.[1] || match?.[2] || 'll97_report.pdf');
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } else {
            alert('Failed to generate report');
        }
    };
    resultDiv.appendChild(pdfBtn);
}
