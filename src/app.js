const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const httpStatus = require('http-status');

const { errorConverter, errorHandler } = require('./middlewares/error');
const stripeWebhookRoute = require('./routes/v1/stripeWebhook.route');
const v1Routes = require('./routes/v1');
const { sendError } = require('./utils/response');

const app = express();

// Stripe webhook signature verification needs the raw request body, so it must be mounted with
// express.raw() before the global express.json() below ever gets a chance to parse this path.
app.use('/v1/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookRoute);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());
app.options('*', cors());
app.use(compression());

app.use('/v1', v1Routes);

app.use((req, res) => {
  sendError(res, httpStatus.NOT_FOUND, 'Not found');
});

app.use(errorConverter);
app.use(errorHandler);

module.exports = app;
