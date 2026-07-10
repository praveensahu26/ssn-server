const express = require('express');

const { searchController } = require('../../controllers');
const { optionalAuthenticate } = require('../../middlewares/auth');

const router = express.Router();

router.get('/', optionalAuthenticate, searchController.globalSearch);

module.exports = router;
