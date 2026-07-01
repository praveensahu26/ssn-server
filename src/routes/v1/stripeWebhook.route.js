const express = require('express');

const { stripeWebhookController } = require('../../controllers');

const router = express.Router();

// Body is the raw Buffer required for Stripe signature verification — the raw-body parser is
// applied at the app level (src/app.js), before the global express.json() middleware runs.
router.post('/', stripeWebhookController.handleWebhook);

module.exports = router;
