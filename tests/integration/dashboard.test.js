const request = require('supertest');

const app = require('../../src/app');
const { Campaign, Category, News, User } = require('../../src/models');
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

const setCreatedAt = async (doc, createdAt) => {
  await doc.constructor.collection.updateOne({ _id: doc._id }, { $set: { createdAt, updatedAt: createdAt } });
};

describe('GET /v1/admin/dashboard/stats', () => {
  let category;

  beforeEach(async () => {
    category = await Category.create({ name: 'Dashboard' });
  });

  test('requires admin access', async () => {
    await request(app).get('/v1/admin/dashboard/stats').expect(401);

    const user = await User.create(makeUser());
    await request(app)
      .get('/v1/admin/dashboard/stats')
      .set('Authorization', `Bearer ${await tokenFor(user)}`)
      .expect(403);
  });

  test('returns dashboard card stats and respects from/to filters', async () => {
    const admin = await User.create(makeAdmin());
    const inRange = new Date('2026-06-15T12:00:00.000Z');
    const outOfRange = new Date('2026-05-15T12:00:00.000Z');

    const activeUser = await User.create(makeUser({ email: 'active@test.com' }));
    const oldUser = await User.create(makeUser({ email: 'old@test.com' }));
    const reporter = await User.create(
      makeUser({
        email: 'reporter@test.com',
        role: 'reporter',
        reporterProfile: { approvalStatus: 'approved', appliedAt: inRange },
      }),
    );
    await setCreatedAt(oldUser, outOfRange);
    await setCreatedAt(reporter, inRange);

    const news = await News.create({
      author: activeUser.id,
      type: 'image',
      mediaUrl: 'https://example.com/image.jpg',
      mediaKey: 'image.jpg',
      caption: 'News one',
      category: category.id,
    });
    await setCreatedAt(news, inRange);

    const deletedNews = await News.create({
      author: activeUser.id,
      type: 'image',
      mediaUrl: 'https://example.com/deleted.jpg',
      mediaKey: 'deleted.jpg',
      caption: 'Deleted news',
      category: category.id,
      status: 'deleted',
    });
    await setCreatedAt(deletedNews, inRange);

    const campaign = await Campaign.create({
      organizer: activeUser.id,
      caption: 'Campaign one',
      category: category.id,
      goalAmount: 100,
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      status: 'active',
    });
    await setCreatedAt(campaign, inRange);

    const oldCampaign = await Campaign.create({
      organizer: activeUser.id,
      caption: 'Campaign old',
      category: category.id,
      goalAmount: 100,
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      status: 'active',
    });
    await setCreatedAt(oldCampaign, outOfRange);

    const res = await request(app)
      .get('/v1/admin/dashboard/stats?from=2026-06-01&to=2026-06-30')
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .expect(200);

    expect(res.body.data.stats).toEqual(
      expect.objectContaining({
        totalUsers: expect.objectContaining({ total: 1 }),
        totalVerifiedReporters: expect.objectContaining({ total: 1 }),
        totalWatchHours: expect.objectContaining({ total: 0 }),
        totalNewsReported: expect.objectContaining({ total: 1 }),
        totalCampaigns: expect.objectContaining({ total: 1 }),
      }),
    );
  });
});
