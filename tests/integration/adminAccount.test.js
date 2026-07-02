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
  isVerified: true,
  ...overrides,
});

const makeAdmin = (overrides = {}) => ({
  name: 'Admin User',
  email: `admin${Date.now()}${Math.random()}@test.com`,
  password: 'Password@123',
  role: 'admin',
  isSuperAdmin: true,
  isVerified: true,
  ...overrides,
});

const tokenFor = async (user) => {
  const tokens = await tokenService.generateAuthTokens(user);
  return tokens.access.token;
};

const setCreatedAt = async (doc, createdAt) => {
  await doc.constructor.collection.updateOne({ _id: doc._id }, { $set: { createdAt, updatedAt: createdAt } });
};

const uniqueEmail = (prefix) => `${prefix}-${Date.now()}-${Math.random()}@test.com`;

describe('Admin accounts', () => {
  test('requires admin access', async () => {
    await request(app).get('/v1/admin/accounts/stats?role=user').expect(401);

    const user = await User.create(makeUser());
    await request(app)
      .get('/v1/admin/accounts/stats?role=user')
      .set('Authorization', `Bearer ${await tokenFor(user)}`)
      .expect(403);
  });

  test('returns only total, active, and blocked account stats with trends', async () => {
    const admin = await User.create(makeAdmin());
    const now = new Date();
    const currentWeek = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const previousWeek = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    const activeUser = await User.create(makeUser({ email: uniqueEmail('active-stats'), status: 'active' }));
    const blockedUser = await User.create(makeUser({ email: uniqueEmail('blocked-stats'), status: 'blocked' }));
    const previousActiveUser = await User.create(makeUser({ email: uniqueEmail('previous-active'), status: 'active' }));
    await setCreatedAt(activeUser, currentWeek);
    await setCreatedAt(blockedUser, currentWeek);
    await setCreatedAt(previousActiveUser, previousWeek);

    const res = await request(app)
      .get('/v1/admin/accounts/stats?role=user')
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .expect(200);

    expect(Object.keys(res.body.data.stats).sort()).toEqual(['active', 'blocked', 'total']);
    expect(res.body.data.stats).toEqual({
      total: expect.objectContaining({
        total: expect.any(Number),
        weeklyNew: expect.any(Number),
        monthlyNew: expect.any(Number),
        changePercent: expect.any(Number),
      }),
      active: expect.objectContaining({
        total: expect.any(Number),
        weeklyNew: expect.any(Number),
        monthlyNew: expect.any(Number),
        changePercent: expect.any(Number),
      }),
      blocked: expect.objectContaining({
        total: expect.any(Number),
        weeklyNew: expect.any(Number),
        monthlyNew: expect.any(Number),
        changePercent: expect.any(Number),
      }),
    });
    expect(res.body.data.stats.total.total).toBeGreaterThanOrEqual(3);
    expect(res.body.data.stats.active.total).toBeGreaterThanOrEqual(2);
    expect(res.body.data.stats.blocked.total).toBeGreaterThanOrEqual(1);
  });

  test('lists users with counts and formatted table fields', async () => {
    const admin = await User.create(makeAdmin());
    const category = await Category.create({ name: 'Politics' });
    const user = await User.create(
      makeUser({
        name: 'Jane Citizen',
        email: uniqueEmail('jane'),
        mobile: '+15550000001',
        avatar: 'https://example.com/jane.jpg',
        location: 'Austin, Texas',
      }),
    );

    await News.create({
      author: user.id,
      media: [{ url: 'https://example.com/news.jpg', key: 'news.jpg', type: 'image' }],
      caption: 'News one',
      categories: [category.id],
    });
    await Campaign.create({
      organizer: user.id,
      caption: 'Campaign one',
      category: category.id,
      goalAmount: 100,
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      status: 'active',
    });

    const res = await request(app)
      .get('/v1/admin/accounts?role=user&tab=all')
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .expect(200);

    expect(res.body.data.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: user.id,
          name: 'Jane Citizen',
          username: 'jane-citizen',
          phoneNumber: '+15550000001',
          profilePicture: 'https://example.com/jane.jpg',
          newsReportCount: 1,
          activeCampaignCount: 1,
          location: 'Austin, Texas, USA',
          locationDetails: { city: 'Austin', state: 'Texas', country: 'USA' },
        }),
      ]),
    );
  });

  test('returns account details with followers and following previews', async () => {
    const admin = await User.create(makeAdmin());
    const follower = await User.create(makeUser({ name: 'Follower One', email: uniqueEmail('follower') }));
    const following = await User.create(makeUser({ name: 'Following One', email: uniqueEmail('following') }));
    const user = await User.create(
      makeUser({
        name: 'Profile Owner',
        email: uniqueEmail('owner'),
        location: null,
        followers: [follower.id],
        following: [following.id],
      }),
    );

    const res = await request(app)
      .get(`/v1/admin/accounts/${user.id}`)
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .expect(200);

    expect(res.body.data.account).toEqual(
      expect.objectContaining({
        id: user.id,
        location: 'USA',
        locationDetails: { city: null, state: null, country: 'USA' },
        followersCount: 1,
        followingCount: 1,
        followers: [expect.objectContaining({ id: follower.id, name: 'Follower One', username: 'follower-one' })],
        following: [expect.objectContaining({ id: following.id, name: 'Following One', username: 'following-one' })],
      }),
    );
  });

  test('blocks an account', async () => {
    const admin = await User.create(makeAdmin());
    const user = await User.create(makeUser({ email: uniqueEmail('blockme') }));

    const res = await request(app)
      .post(`/v1/admin/accounts/${user.id}/block`)
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .send({ reasons: ['Policy Violation'], description: 'Repeated abuse', notifyUser: false })
      .expect(200);

    expect(res.body.data.account.status).toEqual({ value: 'blocked', reason: 'Repeated abuse' });
    await expect(User.findById(user.id).then((doc) => doc.status)).resolves.toBe('blocked');
  });
});
