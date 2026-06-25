const mongoose = require('mongoose');
const request = require('supertest');

jest.mock('multer-s3', () => {
  const fakeStorage = () => ({
    _handleFile(req, file, cb) {
      let size = 0;
      file.stream.on('data', (chunk) => {
        size += chunk.length;
      });
      file.stream.on('end', () => {
        const key = `campaigns/fake/${Date.now()}-${file.originalname}`;
        cb(null, { location: `https://fake-bucket.s3.amazonaws.com/${key}`, key, size });
      });
    },
    _removeFile(req, file, cb) {
      cb(null);
    },
  });
  fakeStorage.AUTO_CONTENT_TYPE = 'AUTO_CONTENT_TYPE';
  return fakeStorage;
});

const app = require('../../src/app');
const { Campaign, Category, User } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const setupTestDB = require('../utils/setupTestDB');

setupTestDB();

const makeUser = (overrides = {}) => ({
  name: 'Test User',
  email: `user${Date.now()}${Math.random()}@test.com`,
  password: 'Password@123',
  role: 'user',
  ...overrides,
});

const makeAdmin = (overrides = {}) => ({
  name: 'Admin User',
  email: `admin${Date.now()}${Math.random()}@test.com`,
  password: 'Password@123',
  role: 'admin',
  isSuperAdmin: true,
  ...overrides,
});

const tokenFor = async (user) => {
  const tokens = await tokenService.generateAuthTokens(user);
  return tokens.access.token;
};

const futureDate = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

let category;

beforeEach(async () => {
  category = await Category.create({ name: 'Healthcare' });
});

describe('POST /v1/campaigns (create campaign)', () => {
  test('should create a campaign without attachments, status pending', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    const res = await request(app)
      .post('/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .field('caption', 'Support Our Medical Camp')
      .field('category', category.id)
      .field('goalAmount', 5000)
      .field('endDate', futureDate())
      .expect(201);

    expect(res.body.data.campaign.status).toBe('pending');
    expect(res.body.data.campaign.attachments).toHaveLength(0);
  });

  test('should create a campaign with multiple attachments', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    const res = await request(app)
      .post('/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .field('caption', 'Flood Relief')
      .field('category', category.id)
      .field('goalAmount', 1000)
      .field('endDate', futureDate())
      .attach('attachments', Buffer.from('a'), { filename: 'one.jpg', contentType: 'image/jpeg' })
      .attach('attachments', Buffer.from('b'), { filename: 'two.jpg', contentType: 'image/jpeg' })
      .expect(201);

    expect(res.body.data.campaign.attachments).toHaveLength(2);
  });

  test('should reject missing caption', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    await request(app)
      .post('/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .field('category', category.id)
      .field('goalAmount', 1000)
      .field('endDate', futureDate())
      .expect(400);
  });

  test('should reject a past end date', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    await request(app)
      .post('/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .field('caption', 'Old campaign')
      .field('category', category.id)
      .field('goalAmount', 1000)
      .field('endDate', new Date(Date.now() - 86400000).toISOString())
      .expect(400);
  });

  test('should reject an unknown category', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    await request(app)
      .post('/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .field('caption', 'Mystery campaign')
      .field('category', new mongoose.Types.ObjectId().toString())
      .field('goalAmount', 1000)
      .field('endDate', futureDate())
      .expect(400);
  });
});

describe('GET /v1/campaigns (discover vs mine)', () => {
  test('discover scope only returns active/completed campaigns', async () => {
    const organizer = await User.create(makeUser());
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    await Campaign.create([
      {
        organizer: organizer.id,
        caption: 'a',
        category: category.id,
        goalAmount: 100,
        endDate: futureDate(),
        status: 'pending',
      },
      {
        organizer: organizer.id,
        caption: 'b',
        category: category.id,
        goalAmount: 100,
        endDate: futureDate(),
        status: 'active',
      },
      {
        organizer: organizer.id,
        caption: 'c',
        category: category.id,
        goalAmount: 100,
        endDate: futureDate(),
        status: 'completed',
      },
      {
        organizer: organizer.id,
        caption: 'd',
        category: category.id,
        goalAmount: 100,
        endDate: futureDate(),
        status: 'suspended',
      },
    ]);

    const res = await request(app).get('/v1/campaigns?scope=discover').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.campaigns).toHaveLength(2);
  });

  test("mine scope returns the organizer's campaigns regardless of status", async () => {
    const organizer = await User.create(makeUser());
    const token = await tokenFor(organizer);

    await Campaign.create([
      {
        organizer: organizer.id,
        caption: 'a',
        category: category.id,
        goalAmount: 100,
        endDate: futureDate(),
        status: 'pending',
      },
      {
        organizer: organizer.id,
        caption: 'b',
        category: category.id,
        goalAmount: 100,
        endDate: futureDate(),
        status: 'rejected',
      },
    ]);

    const res = await request(app).get('/v1/campaigns?scope=mine').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.campaigns).toHaveLength(2);
  });
});

describe('GET /v1/campaigns/:id', () => {
  test('404s a pending campaign for a stranger but 200s for the organizer and an admin, and increments viewsCount', async () => {
    const organizer = await User.create(makeUser());
    const stranger = await User.create(makeUser());
    const admin = await User.create(makeAdmin());
    const campaign = await Campaign.create({
      organizer: organizer.id,
      caption: 'a',
      category: category.id,
      goalAmount: 100,
      endDate: futureDate(),
      status: 'pending',
    });

    await request(app).get(`/v1/campaigns/${campaign.id}`).expect(404);

    await request(app)
      .get(`/v1/campaigns/${campaign.id}`)
      .set('Authorization', `Bearer ${await tokenFor(stranger)}`)
      .expect(404);

    await request(app)
      .get(`/v1/campaigns/${campaign.id}`)
      .set('Authorization', `Bearer ${await tokenFor(organizer)}`)
      .expect(200);

    await request(app)
      .get(`/v1/campaigns/${campaign.id}`)
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .expect(200);

    const found = await Campaign.findById(campaign.id);
    expect(found.viewsCount).toBe(2);
  });
});

describe('Admin campaign moderation', () => {
  let organizer;
  let campaign;

  beforeEach(async () => {
    organizer = await User.create(makeUser());
    campaign = await Campaign.create({
      organizer: organizer.id,
      caption: 'a',
      category: category.id,
      goalAmount: 100,
      endDate: futureDate(),
      status: 'pending',
    });
  });

  test('admin approves a pending campaign', async () => {
    const admin = await User.create(makeAdmin());
    const res = await request(app)
      .post(`/v1/admin/campaigns/${campaign.id}/approve`)
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .expect(200);

    expect(res.body.data.campaign.status).toBe('active');
  });

  test('admin rejects a pending campaign with a reason', async () => {
    const admin = await User.create(makeAdmin());
    await request(app)
      .post(`/v1/admin/campaigns/${campaign.id}/reject`)
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .send({})
      .expect(400);

    const res = await request(app)
      .post(`/v1/admin/campaigns/${campaign.id}/reject`)
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .send({ rejectionReason: 'Insufficient documentation' })
      .expect(200);

    expect(res.body.data.campaign.status).toBe('rejected');
  });

  test('admin suspends an active campaign, requiring a note when "Other" is selected', async () => {
    const admin = await User.create(makeAdmin());
    campaign.status = 'active';
    await campaign.save();

    await request(app)
      .post(`/v1/admin/campaigns/${campaign.id}/suspend`)
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .send({ suspensionReasons: ['Other'] })
      .expect(400);

    const res = await request(app)
      .post(`/v1/admin/campaigns/${campaign.id}/suspend`)
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .send({ suspensionReasons: ['Other'], suspensionNote: 'Manual review flagged' })
      .expect(200);

    expect(res.body.data.campaign.status).toBe('suspended');
  });

  test('admin completes an active campaign', async () => {
    const admin = await User.create(makeAdmin());
    campaign.status = 'active';
    await campaign.save();

    const res = await request(app)
      .post(`/v1/admin/campaigns/${campaign.id}/complete`)
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .expect(200);

    expect(res.body.data.campaign.status).toBe('completed');
  });

  test('tab filters only return campaigns in that bucket', async () => {
    const admin = await User.create(makeAdmin());
    const token = await tokenFor(admin);
    await Campaign.create({
      organizer: organizer.id,
      caption: 'active one',
      category: category.id,
      goalAmount: 100,
      endDate: futureDate(),
      status: 'active',
    });

    const requests = await request(app)
      .get('/v1/admin/campaigns?tab=requests')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(requests.body.data.campaigns).toHaveLength(1);
    expect(requests.body.data.campaigns[0].status).toBe('pending');

    const active = await request(app)
      .get('/v1/admin/campaigns?tab=active')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(active.body.data.campaigns).toHaveLength(1);
    expect(active.body.data.campaigns[0].status).toBe('active');
  });

  test('stats endpoint returns the expected shape', async () => {
    const admin = await User.create(makeAdmin());
    const res = await request(app)
      .get('/v1/admin/campaigns/stats')
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .expect(200);

    expect(res.body.data.stats).toEqual(
      expect.objectContaining({
        totalCampaigns: expect.any(Number),
        totalRaised: expect.any(Number),
        activeCampaigns: expect.any(Number),
        activeRaised: expect.any(Number),
        completedCampaigns: expect.any(Number),
        completedRaised: expect.any(Number),
        fansThisWeek: expect.any(Number),
      }),
    );
  });

  test('non-admin cannot moderate campaigns', async () => {
    const user = await User.create(makeUser());
    await request(app)
      .post(`/v1/admin/campaigns/${campaign.id}/approve`)
      .set('Authorization', `Bearer ${await tokenFor(user)}`)
      .expect(403);
  });
});
