const express = require('express');
const router = express.Router();

const {
    importDataset,
    getLocations,
    getByLocation,
    createOne,
    updateOne,
    deleteOne,
} = require('../controller/educationController');

router.post('/import', importDataset);
router.get('/locations', getLocations);
router.post('/', createOne);
router.get('/:location', getByLocation);
router.put('/:location/:year/:education_level/:sex', updateOne);
router.delete('/:location/:year/:education_level/:sex', deleteOne);

module.exports = router;