const API_URL = 'http://localhost:3000/api/education';
const csvFileInput = document.getElementById('csv-file');
const importBtn = document.getElementById('import-btn');
const importStatus = document.getElementById('import-status');
const locationSelect = document.getElementById('location-select');
const locationDatalist = document.getElementById('location-datalist');
const dataTbody = document.getElementById('data-tbody');
const datasetStatus = document.getElementById('dataset-status');
const sortSelect = document.getElementById('sort-select');
const geolocationInput = document.getElementById('geolocation-input');
const yearInput = document.getElementById('year-input');
const educationLevelInput = document.getElementById('education-level-input');
const sexInput = document.getElementById('sex-input');
const indicatorInput = document.getElementById('indicator-input');
const survivalRateInput = document.getElementById('survival-rate-input');
const createBtn = document.getElementById('create-btn');
const updateBtn = document.getElementById('update-btn');
const deleteBtn = document.getElementById('delete-btn');
const clearBtn = document.getElementById('clear-btn');

let datasetImported = false;
let selectedRecord = null;

// IMPORT CSV
importBtn.addEventListener('click', async () => {
    const file = csvFileInput.files[0];

    if (!file) {
        importStatus.textContent = 'Please select a CSV file before importing.';
        importStatus.classList.remove('hidden', 'success', 'error');
        importStatus.classList.add('error');
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
    importStatus.classList.remove('hidden', 'success', 'error');
    importStatus.classList.add(res.ok ? 'success' : 'error');

    if (!res.ok) {
        return;
    }

    datasetImported = true;
    await loadLocations();
    await loadData();
});

// LOAD LOCATIONS
async function loadLocations() {
    const res = await fetch(`${API_URL}/locations`);
    const locations = await res.json();

    locationSelect.innerHTML =
        '<option value="">All Locations</option>';
    if (locationDatalist) {
        locationDatalist.innerHTML = '';
    }

    locations.forEach((loc) => {
        const option = document.createElement('option');
        option.value = loc;
        option.textContent = loc;
        locationSelect.appendChild(option);

        if (locationDatalist) {
            const dataOption = document.createElement('option');
            dataOption.value = loc;
            locationDatalist.appendChild(dataOption);
        }
    });
}

// LOAD DATA
async function loadData() {
    if (!datasetImported) {
        renderTable([]);
        return;
    }

    const selected = locationSelect.value;
    const sortOrder = sortSelect.value;
    let rows = [];

    if (selected) {
        const res = await fetch(
            `${API_URL}/${encodeURIComponent(selected)}`
        );
        rows = await res.json();
    } else {
        const res = await fetch(API_URL);
        rows = await res.json();
    }

    // Apply sorting
    if (sortOrder === 'asc') {
        rows.sort((a, b) => a.year - b.year);
    } else if (sortOrder === 'desc') {
        rows.sort((a, b) => b.year - a.year);
    }

    renderTable(rows);
}

// SHOW STATUS
function showDatasetStatus(message, type = 'success') {
    datasetStatus.textContent = message;
    datasetStatus.classList.remove('hidden', 'success', 'error');
    datasetStatus.classList.add(type);
}

function clearDatasetStatus() {
    datasetStatus.textContent = '';
    datasetStatus.classList.add('hidden');
}

// RENDER TABLE
function renderTable(rows) {
    dataTbody.innerHTML = '';

    if (!rows || rows.length === 0) {
        dataTbody.innerHTML = `
            <tr><td class="no-data" colspan="5">No dataset rows found.</td></tr>
        `;
        return;
    }

    rows.forEach((r) => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${r.geolocation}</td>
            <td>${r.year}</td>
            <td>${r.education_level}</td>
            <td>${r.sex}</td>
            <td>${r.survival_rate}</td>
        `;

        tr.style.cursor = 'pointer';
        
        // Handle double click to populate form and highlight row
        tr.addEventListener('dblclick', () => {
            // 1. Remove highlight from any other row first
            const activeRow = dataTbody.querySelector('.selected-row');
            if (activeRow) {
                activeRow.classList.remove('selected-row');
            }

            // 2. Add highlight class to the current row
            tr.classList.add('selected-row');

            // 3. Track the currently selected record key
            selectedRecord = {
                geolocation: r.geolocation,
                year: String(r.year),
                education_level: r.education_level,
                sex: r.sex,
            };

            // 4. Populate the form fields
            populateForm({
                geolocation: r.geolocation,
                year: r.year,
                education_level: r.education_level,
                sex: r.sex,
                indicator: r.indicator || 'Cohort Survival Rate',
                survival_rate: r.survival_rate,
            });
        });

        dataTbody.appendChild(tr);
    });
}

// CREATE RECORD
async function createRecord() {
    const location = geolocationInput.value.trim();
    const year = yearInput.value;
    const education_level = educationLevelInput.value.trim();
    const sex = sexInput.value;
    const indicator = indicatorInput.value;
    const survival_rate = survivalRateInput.value;

    if (!location || !year || !education_level || !sex || !survival_rate) {
        showDatasetStatus('Please fill in all required fields before creating a record.', 'error');
        return;
    }

    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geolocation: location, year, education_level, sex, indicator, survival_rate }),
    });

    const data = await res.json();

    if (!res.ok) {
        showDatasetStatus(data.message || 'Failed to create record.', 'error');
        return;
    }

    showDatasetStatus(data.message || 'Successfully added record', 'success');
    clearForm();
    await loadLocations();
    await loadData();
}

// UPDATE RECORD
async function updateRecord() {
    if (!selectedRecord) {
        showDatasetStatus('Select a record before updating.', 'error');
        return;
    }

    const location = geolocationInput.value.trim();
    const year = yearInput.value;
    const education_level = educationLevelInput.value.trim();
    const sex = sexInput.value;
    const indicator = indicatorInput.value;
    const survival_rate = survivalRateInput.value;

    if (!location || !year || !education_level || !sex || !survival_rate) {
        showDatasetStatus('Select a record and enter all required fields before updating.', 'error');
        return;
    }

    const keyChanged =
        location !== selectedRecord.geolocation ||
        year !== String(selectedRecord.year) ||
        education_level !== selectedRecord.education_level ||
        sex !== selectedRecord.sex;

    if (keyChanged) {
        // If the user changed the primary key fields, replace the old row.
        const createRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                geolocation: location,
                year: parseInt(year, 10),
                education_level,
                sex,
                indicator,
                survival_rate: parseFloat(survival_rate),
            }),
        });

        const createData = await createRes.json();
        if (!createRes.ok) {
            showDatasetStatus(createData.message || 'Failed to update record.', 'error');
            return;
        }

        const deleteRes = await fetch(
            `${API_URL}/${encodeURIComponent(selectedRecord.geolocation)}/${encodeURIComponent(selectedRecord.year)}/${encodeURIComponent(selectedRecord.education_level)}/${encodeURIComponent(selectedRecord.sex)}`,
            { method: 'DELETE' }
        );
        const deleteData = await deleteRes.json();

        if (!deleteRes.ok) {
            showDatasetStatus(deleteData.message || 'Partial update: old record not removed.', 'error');
            return;
        }

        showDatasetStatus('Record updated successfully', 'success');
    } else {
        const res = await fetch(
            `${API_URL}/${encodeURIComponent(location)}/${encodeURIComponent(year)}/${encodeURIComponent(education_level)}/${encodeURIComponent(sex)}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ survival_rate: parseFloat(survival_rate) }),
            }
        );

        const data = await res.json();
        if (!res.ok) {
            showDatasetStatus(data.message || 'Failed to update record.', 'error');
            return;
        }

        showDatasetStatus(data.message || 'Record updated successfully', 'success');
    }

    await loadLocations();
    await loadData();
    clearForm();
}

// DELETE RECORD
async function deleteRecord() {
    const location = geolocationInput.value.trim();
    const year = yearInput.value;
    const education_level = educationLevelInput.value.trim();
    const sex = sexInput.value;

    if (!location || !year || !education_level || !sex) {
        showDatasetStatus('Select a record before deleting.', 'error');
        return;
    }

    const res = await fetch(
        `${API_URL}/${encodeURIComponent(location)}/${encodeURIComponent(year)}/${encodeURIComponent(education_level)}/${encodeURIComponent(sex)}`,
        { method: 'DELETE' }
    );

    const data = await res.json();

    if (!res.ok) {
        showDatasetStatus(data.message || 'Failed to delete record.', 'error');
        return;
    }

    showDatasetStatus(data.message || 'Record deleted successfully', 'success');
    await loadLocations();
    await loadData();
    clearForm();
}

// POPULATE FORM
function populateForm(record) {
    geolocationInput.value = record.geolocation;
    yearInput.value = record.year;
    educationLevelInput.value = record.education_level;
    sexInput.value = record.sex;
    indicatorInput.value = record.indicator || 'Cohort Survival Rate';
    survivalRateInput.value = record.survival_rate;
    clearDatasetStatus();
}

// CLEAR FORM
function clearForm() {
    geolocationInput.value = '';
    yearInput.value = '';
    educationLevelInput.value = '';
    sexInput.value = 'Both Sexes';
    indicatorInput.value = 'Cohort Survival Rate';
    survivalRateInput.value = '';
    clearDatasetStatus();
    selectedRecord = null;

    // Remove selection highlight when form is cleared
    const activeRow = dataTbody.querySelector('.selected-row');
    if (activeRow) {
        activeRow.classList.remove('selected-row');
    }
}

// EVENT LISTENERS
locationSelect.addEventListener('change', loadData);
sortSelect.addEventListener('change', loadData);
createBtn.addEventListener('click', createRecord);
updateBtn.addEventListener('click', updateRecord);
deleteBtn.addEventListener('click', deleteRecord);
clearBtn.addEventListener('click', clearForm);

// INITIAL SETUP CALLS
renderTable([]);
clearDatasetStatus();