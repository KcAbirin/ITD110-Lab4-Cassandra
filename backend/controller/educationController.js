const { client } = require('../config/db');

// IMPORT CSV
const importDataset = async (req, res) => {
    try {
        const { csv } = req.body;

        if (!csv) {
            return res.status(400).json({ message: 'CSV data is required' });
        }

        const lines = csv.split('\n').filter((l) => l.trim());

        const header = lines[0].split(',');

        const years = ['2018', '2019', '2020', '2021', '2022', '2023'];
        let inserted = 0;
        const queries = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');

            const indicator = cols[0]?.trim();
            const geolocation = cols[1]?.trim();
            const education_level = cols[2]?.trim();
            const sex = cols[3]?.trim();

            for (let j = 0; j < years.length; j++) {
                const value = parseFloat(cols[j + 4]);

                if (isNaN(value)) continue;
                queries.push({
                    query: `
                        INSERT INTO education_survival_rate
                        (geolocation, year, education_level, sex, indicator, survival_rate)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    params: [
                        geolocation,
                        parseInt(years[j]),
                        education_level,
                        sex,
                        indicator,
                        value,
                    ],
                });

                inserted++;
            }
            }

        const BATCH_SIZE = 30;

        for (let i = 0; i < queries.length; i += BATCH_SIZE) {
            await client.batch(queries.slice(i, i + BATCH_SIZE), {
                prepare: true,
            });
        }

        res.json({ message: `Imported ${inserted} data points` });
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
    createOne,
    updateOne,
    deleteOne,
};