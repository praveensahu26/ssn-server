const httpStatus = require('http-status');
const Stripe = require('stripe');

const config = require('../config/config');
const { Campaign, Donation } = require('../models');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');

const stripe = Stripe(config.stripe.secretKey);

// Google Pay rides on top of Stripe's 'card' payment method type (it's a wallet, not a distinct
// PM type) — both 'card' and 'google_pay' map to the same Stripe payment_method_types value.
const PAYMENT_METHOD_TYPES = {
  card: ['card'],
  google_pay: ['card'],
  paypal: ['paypal'],
};

const createDonationIntent = async (user, campaignId, { amount, message, paymentMethod }) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }
  if (campaign.status !== 'active') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This campaign is not currently accepting donations');
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: campaign.currency.toLowerCase(),
    payment_method_types: PAYMENT_METHOD_TYPES[paymentMethod],
    metadata: {
      campaignId: campaign.id,
      donorId: user.id,
      message: message || '',
    },
  });

  const donation = await Donation.create({
    campaign: campaign.id,
    donor: user.id,
    amount,
    currency: campaign.currency,
    message: message || null,
    paymentMethod,
    stripePaymentIntentId: intent.id,
    status: 'pending',
  });

  return { donation, clientSecret: intent.client_secret };
};

const markDonationSucceeded = async (paymentIntentId) => {
  const donation = await Donation.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId, status: { $ne: 'succeeded' } },
    { status: 'succeeded' },
  );
  // No match means it was already processed (webhook retry) or doesn't belong to us — either way,
  // there's nothing further to do, and we must not throw or Stripe will keep retrying forever.
  if (!donation) {
    return;
  }
  await Campaign.findByIdAndUpdate(donation.campaign, {
    $inc: { raisedAmount: donation.amount, donationsCount: 1 },
  });
};

const markDonationStatus = async (paymentIntentId, status) => {
  await Donation.findOneAndUpdate({ stripePaymentIntentId: paymentIntentId }, { status });
};

const handleStripeWebhook = async (rawBody, signature) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Webhook signature verification failed');
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await markDonationSucceeded(event.data.object.id);
      break;
    case 'payment_intent.payment_failed':
      await markDonationStatus(event.data.object.id, 'failed');
      break;
    case 'payment_intent.canceled':
      await markDonationStatus(event.data.object.id, 'canceled');
      break;
    default:
      break;
  }
};

const listSupportFeed = (campaignId, query) =>
  paginate(Donation, { campaign: campaignId, status: 'succeeded' }, query.page, query.limit, [['donor', 'name avatar']]);

module.exports = {
  createDonationIntent,
  handleStripeWebhook,
  listSupportFeed,
};
