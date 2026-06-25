const mongoose = require('mongoose');

const config = require('../config/config');
const toJSON = require('./plugins/toJSON.plugin');

const donationSchema = mongoose.Schema(
  {
    campaign: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    donor: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    // Major currency unit (e.g. dollars), not cents — converted to Stripe's minor-unit integer
    // only at the stripe.paymentIntents.create call site in donation.service.js.
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: () => config.stripe.currency,
      uppercase: true,
    },
    message: {
      type: String,
      trim: true,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'google_pay', 'paypal'],
      required: true,
    },
    // Doubles as the idempotency key when processing Stripe webhook retries/replays.
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'canceled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  },
);

donationSchema.index({ campaign: 1, status: 1, createdAt: -1 });

donationSchema.plugin(toJSON);

const Donation = mongoose.model('Donation', donationSchema);

module.exports = Donation;
