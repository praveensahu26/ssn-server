const httpStatus = require('http-status');

const { donationService } = require('../services');
const catchAsync = require('../utils/catchAsync');

// Deliberately not using sendSuccess's envelope here — Stripe expects a bare 2xx response,
// matching its own example payloads avoids confusing the dashboard's webhook test viewer.
const handleWebhook = catchAsync(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  await donationService.handleStripeWebhook(req.body, signature);
  res.status(httpStatus.OK).send({ received: true });
});

module.exports = {
  handleWebhook,
};
