const express = require('express');
const swaggerUi = require('swagger-ui-express');

const openapiDocument = require('../../docs/openapi.json');

const router = express.Router();

router.get('/openapi.json', (req, res) => res.json(openapiDocument));
router.use('/', swaggerUi.serve, swaggerUi.setup(openapiDocument));

module.exports = router;
