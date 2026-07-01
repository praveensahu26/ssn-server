jest.mock('stripe', () => {
  const paymentIntentsCreate = jest.fn();
  const webhooksConstructEvent = jest.fn();
  const stripeFactory = jest.fn(() => ({
    paymentIntents: { create: paymentIntentsCreate },
    webhooks: { constructEvent: webhooksConstructEvent },
  }));
  stripeFactory.__mocks__ = { paymentIntentsCreate, webhooksConstructEvent };
  return stripeFactory;
});

const request = require('supertest');

const Stripe = require('stripe');
const app = require('../../src/app');
const { Campaign, Category, Donation, User } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const setupTestDB = require('../utils/setupTestDB');

const { paymentIntentsCreate, webhooksConstructEvent } = Stripe.__mocks__;

setupTestDB();

const makeUser = (overrides = {}) => ({
  name: 'Test User',
  email: `user${Date.now()}${Math.random()}@test.com`,
  password: 'Password@123',
  role: 'user',
  ...overrides,
});

const tokenFor = async (user) => {
  const tokens = await tokenService.generateAuthTokens(user);
  return tokens.access.token;
};

const futureDate = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

let category;
let organizer;
let campaign;

beforeEach(async () => {
  paymentIntentsCreate.mockReset();
  webhooksConstructEvent.mockReset();
  category = await Category.create({ name: 'Healthcare' });
  organizer = await User.create(makeUser());
  campaign = await Campaign.create({
    organizer: organizer.id,
    caption: 'Support Our Medical Camp',
    category: category.id,
    goalAmount: 1000,
    endDate: futureDate(),
    status: 'active',
  });
});

describe('POST /v1/campaigns/:id/donate', () => {
  test('rejects donations to a non-active campaign', async () => {
    campaign.status = 'pending';
    await campaign.save();
    const donor = await User.create(makeUser());

    await request(app)
      .post(`/v1/campaigns/${campaign.id}/donate`)
      .set('Authorization', `Bearer ${await tokenFor(donor)}`)
      .send({ amount: 25, paymentMethod: 'card' })
      .expect(400);
  });

  test('creates a Stripe PaymentIntent and a pending Donation', async () => {
    paymentIntentsCreate.mockResolvedValue({ id: 'pi_test123', client_secret: 'secret_abc' });
    const donor = await User.create(makeUser());

    const res = await request(app)
      .post(`/v1/campaigns/${campaign.id}/donate`)
      .set('Authorization', `Bearer ${await tokenFor(donor)}`)
      .send({ amount: 25, message: 'Get well soon!', paymentMethod: 'card' })
      .expect(201);

    expect(res.body.data.clientSecret).toBe('secret_abc');
    expect(res.body.data.donation.status).toBe('pending');
    expect(paymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2500, payment_method_types: ['card'] }),
    );

    const stored = await Donation.findOne({ stripePaymentIntentId: 'pi_test123' });
    expect(stored.amount).toBe(25);
    expect(stored.message).toBe('Get well soon!');
  });
});

describe('Stripe webhook processing', () => {
  test('marks a donation succeeded and increments campaign counters, idempotently on replay', async () => {
    const donor = await User.create(makeUser());
    const donation = await Donation.create({
      campaign: campaign.id,
      donor: donor.id,
      amount: 50,
      message: 'Stay strong!',
      paymentMethod: 'card',
      stripePaymentIntentId: 'pi_webhook123',
      status: 'pending',
    });

    webhooksConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_webhook123' } },
    });

    await request(app)
      .post('/v1/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'test_sig')
      .send(JSON.stringify({ id: 'evt_1' }))
      .expect(200);

    let foundDonation = await Donation.findById(donation.id);
    let foundCampaign = await Campaign.findById(campaign.id);
    expect(foundDonation.status).toBe('succeeded');
    expect(foundCampaign.raisedAmount).toBe(50);
    expect(foundCampaign.donationsCount).toBe(1);

    // Replay the same event (Stripe retries deliveries) — counters must not double-increment.
    await request(app)
      .post('/v1/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'test_sig')
      .send(JSON.stringify({ id: 'evt_1' }))
      .expect(200);

    foundDonation = await Donation.findById(donation.id);
    foundCampaign = await Campaign.findById(campaign.id);
    expect(foundDonation.status).toBe('succeeded');
    expect(foundCampaign.raisedAmount).toBe(50);
    expect(foundCampaign.donationsCount).toBe(1);
  });

  test('marks a donation failed without touching campaign counters', async () => {
    const donor = await User.create(makeUser());
    const donation = await Donation.create({
      campaign: campaign.id,
      donor: donor.id,
      amount: 50,
      paymentMethod: 'card',
      stripePaymentIntentId: 'pi_failed123',
      status: 'pending',
    });

    webhooksConstructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_failed123' } },
    });

    await request(app)
      .post('/v1/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'test_sig')
      .send(JSON.stringify({ id: 'evt_2' }))
      .expect(200);

    const found = await Donation.findById(donation.id);
    expect(found.status).toBe('failed');
    const foundCampaign = await Campaign.findById(campaign.id);
    expect(foundCampaign.raisedAmount).toBe(0);
  });

  test('rejects an invalid signature', async () => {
    webhooksConstructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    await request(app)
      .post('/v1/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'bad_sig')
      .send(JSON.stringify({ id: 'evt_3' }))
      .expect(400);
  });
});

describe('GET /v1/campaigns/:id/support', () => {
  test('only returns succeeded donations, with donor and message', async () => {
    const donor = await User.create(makeUser({ name: 'Amanda Cerny' }));
    await Donation.create([
      {
        campaign: campaign.id,
        donor: donor.id,
        amount: 300,
        message: 'Stay strong!',
        paymentMethod: 'card',
        stripePaymentIntentId: 'pi_a',
        status: 'succeeded',
      },
      {
        campaign: campaign.id,
        donor: donor.id,
        amount: 100,
        paymentMethod: 'card',
        stripePaymentIntentId: 'pi_b',
        status: 'pending',
      },
    ]);

    const res = await request(app).get(`/v1/campaigns/${campaign.id}/support`).expect(200);

    expect(res.body.data.supporters).toHaveLength(1);
    expect(res.body.data.supporters[0].message).toBe('Stay strong!');
    expect(res.body.data.supporters[0].donor.name).toBe('Amanda Cerny');
  });
});
