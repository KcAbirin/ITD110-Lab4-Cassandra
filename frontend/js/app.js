const API_URL = 'http://localhost:3000/api/education';

const csvFileInput = document.getElementById('csv-file');
const importBtn = document.getElementById('import-btn');
const importStatus = document.getElementById('import-status');
const locationSelect = document.getElementById('location-select');
const dataTbody = document.getElementById('data-tbody');

// IMPORT CSV
importBtn.addEventListener('click', async () => {
    const file = csvFileInput.files[0];

    if (!file) {
        alert('Please select a CSV file');
        return;
    }

    const text = await file.text();

     const res = await fetch(`${API_URL}/import`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: text }),
    });

    const data = await res.json();

    importStatus.textContent = data.message;
    importStatus.classList.remove('hidden');

    loadLocations();
    loadData();
});

// LOAD LOCATIONS
async function loadLocations() {
    const res = await fetch(`${API_URL}/locations`);
    const locations = await res.json();

    locationSelect.innerHTML =
        '<option value="">All Locations</option>';

    locations.forEach((loc) => {
        const option = document.createElement('option');
        option.value = loc;
        option.textContent = loc;
        locationSelect.appendChild(option);
    });
}

// LOAD DATA
async function loadData() {
    const selected = locationSelect.value;
    let rows = [];

    if (selected) {
        const res = await fetch(
            `${API_URL}/${encodeURIComponent(selected)}`
        );

        rows = await res.json();
    }

    renderTable(rows);
}

locationSelect.addEventListener('change', loadData);

// RENDER TABLE
function renderTable(rows) {
    dataTbody.innerHTML = '';

    rows.forEach((r) => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${r.geolocation}</td>
            <td>${r.year}</td>
            <td>${r.education_level}</td>
            <td>${r.sex}</td>
            <td>${r.survival_rate}</td>
        `;

        dataTbody.appendChild(tr);
    });
}

loadLocations();