const { client } = require('../config/db');

// IMPORT CSV (No Validation / Direct Mapping)
// IMPORT CSV (With Trailing Line Defense / Direct Mapping)
const importDataset = async (req, res) => {
    try {
        const { csv } = req.body;

        if (!csv) {
            return res.status(400).json({ message: 'CSV data is required' });
        }

        // Split lines handling both Windows and Unix line endings
        const lines = csv
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

        const queries = [];

        // Loop starts at 1 to skip the header row
        for (let i = 1; i < lines.length; i++) {
            // Split by comma, handling potential quotes safely
            let cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            cols = cols.map(c => c.trim().replace(/^"|"$/g, ''));

            // DEFENSE: If the entire row split results in an empty or single-element array, skip it
            if (cols.length < 5 || !cols[1] || !cols[4]) {
                continue; 
            }

            // Map columns directly to your database schema layout
            const indicator = cols[0];
            const geolocation = cols[1];
            const education_level = cols[2];
            const sex = cols[3];
            const year = parseInt(cols[4], 10);
            const survival_rate = parseFloat(cols[5]);

            // DEFENSE: Ensure primary keys are mathematically present before pushing to Cassandra
            if (!geolocation || isNaN(year) || !education_level || !sex) {
                continue;
            }

            queries.push({
                query: `
                    INSERT INTO education_survival_rate
                    (geolocation, year, education_level, sex, indicator, survival_rate)
                    VALUES (?, ?, ?, ?, ?, ?)
                `,
                params: [
                    geolocation,
                    year,
                    education_level,
                    sex,
                    indicator,
                    survival_rate,
                ],
            });
        }

        if (queries.length === 0) {
            return res.status(400).json({ message: 'No valid data rows found to import.' });
        }

        // Execute the batch insertion directly
        const BATCH_SIZE = 30;
        for (let i = 0; i < queries.length; i += BATCH_SIZE) {
            await client.batch(queries.slice(i, i + BATCH_SIZE), {
                prepare: true,
            });
        }

        res.json({ message: `Successfully imported all ${queries.length} records.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET LOCATIONS
const getLocations = async (req, res) => {
    try {
        const result = await client.execute(
            'SELECT DISTINCT geolocation FROM education_survival_rate'
        );

        const locations = result.rows
            .map((r) => r.geolocation)
            .sort();

        res.json(locations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET DATA BY LOCATION
const getByLocation = async (req, res) => {
    try {
        const location = req.params.location;

        const result = await client.execute(
            'SELECT * FROM education_survival_rate WHERE geolocation = ?',
            [location],
            { prepare: true }
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET ALL DATA
const getAll = async (req, res) => {
    try {
        const result = await client.execute(
            'SELECT * FROM education_survival_rate'
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE
const createOne = async (req, res) => {
    try {
        const {
            geolocation,
            year,
            education_level,
            sex,
            indicator,
            survival_rate,
        } = req.body;

        await client.execute(
            `
            INSERT INTO education_survival_rate
            (geolocation, year, education_level, sex, indicator, survival_rate)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                geolocation,
                year,
                education_level,
                sex,
                indicator,
                survival_rate,
            ],
            { prepare: true }
        );

        res.status(201).json({ message: 'Added successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPDATE
const updateOne = async (req, res) => {
    try {
        const {
            location,
            year,
            education_level,
            sex,
        } = req.params;

        const { survival_rate } = req.body;

        await client.execute(
            `
            UPDATE education_survival_rate
            SET survival_rate = ?
            WHERE geolocation = ?
            AND year = ?
            AND education_level = ?
            AND sex = ?
            `,
            [
                parseFloat(survival_rate),
                location,
                parseInt(year),
                education_level,
                sex,
            ],
            { prepare: true }
        );

        res.json({ message: 'Updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE
const deleteOne = async (req, res) => {
    try {
        const {
            location,
            year,
            education_level,
            sex,
        } = req.params;

        await client.execute(
            `
            DELETE FROM education_survival_rate
            WHERE geolocation = ?
            AND year = ?
            AND education_level = ?
            AND sex = ?
            `,
            [
                location,
                parseInt(year),
                education_level,
                sex,
            ],
            { prepare: true }
        );

        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    importDataset,
    getLocations,
    getByLocation,
    getAll,
    createOne,
    updateOne,
    deleteOne,
};