const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../../src/app');
const { Category, User } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const setupTestDB = require('../utils/setupTestDB');

setupTestDB();

const makeUser = (overrides = {}) => ({
  name: 'Test User',
  email: 'user@test.com',
  password: 'Password@123',
  role: 'user',
  ...overrides,
});

const makeAdmin = (overrides = {}) => ({
  name: 'Admin User',
  email: 'admin@test.com',
  password: 'Password@123',
  role: 'admin',
  isSuperAdmin: true,
  ...overrides,
});

let userToken;
let adminToken;
let testUser;
let testAdmin;

beforeEach(async () => {
  testUser = await User.create(makeUser());
  testAdmin = await User.create(makeAdmin());
  const userTokens = await tokenService.generateAuthTokens(testUser);
  const adminTokens = await tokenService.generateAuthTokens(testAdmin);
  userToken = userTokens.access.token;
  adminToken = adminTokens.access.token;
});

describe('Admin Category CRUD', () => {
  describe('POST /v1/admin/categories', () => {
    test('should create a category', async () => {
      const res = await request(app)
        .post('/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Politics', icon: 'https://example.com/icon.png' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.category.name).toBe('Politics');
    });

    test('should reject duplicate category name', async () => {
      await Category.create({ name: 'Sports' });
      await request(app)
        .post('/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sports' })
        .expect(409);
    });

    test('should reject non-admin', async () => {
      await request(app)
        .post('/v1/admin/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Tech' })
        .expect(403);
    });

    test('should reject missing name', async () => {
      await request(app)
        .post('/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ icon: 'https://example.com/icon.png' })
        .expect(400);
    });
  });

  describe('GET /v1/admin/categories', () => {
    test('should list all categories', async () => {
      await Category.create([{ name: 'Sports' }, { name: 'Tech' }]);
      const res = await request(app).get('/v1/admin/categories').set('Authorization', `Bearer ${adminToken}`).expect(200);

      expect(res.body.data.categories).toHaveLength(2);
    });
  });

  describe('GET /v1/admin/categories/:id', () => {
    test('should get a single category', async () => {
      const cat = await Category.create({ name: 'Health' });
      const res = await request(app)
        .get(`/v1/admin/categories/${cat.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.category.name).toBe('Health');
    });

    test('should 404 for unknown id', async () => {
      await request(app)
        .get(`/v1/admin/categories/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PUT /v1/admin/categories/:id', () => {
    test('should update a category', async () => {
      const cat = await Category.create({ name: 'Old Name' });
      const res = await request(app)
        .put(`/v1/admin/categories/${cat.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body.data.category.name).toBe('New Name');
    });
  });

  describe('DELETE /v1/admin/categories/:id', () => {
    test('should delete a category', async () => {
      const cat = await Category.create({ name: 'ToDelete' });
      await request(app).delete(`/v1/admin/categories/${cat.id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);

      const found = await Category.findById(cat.id);
      expect(found).toBeNull();
    });
  });
});

describe('Mobile Category endpoints', () => {
  describe('GET /v1/categories', () => {
    test('should return all categories for authenticated user', async () => {
      await Category.create([{ name: 'Finance' }, { name: 'Entertainment' }]);
      const res = await request(app).get('/v1/categories').set('Authorization', `Bearer ${userToken}`).expect(200);

      expect(res.body.data.categories).toHaveLength(2);
    });

    test('should reject unauthenticated request', async () => {
      await request(app).get('/v1/categories').expect(401);
    });
  });

  describe('POST /v1/categories/:id/follow', () => {
    test('should follow a category', async () => {
      const cat = await Category.create({ name: 'Science' });
      const res = await request(app)
        .post(`/v1/categories/${cat.id}/follow`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.user.followedCategories).toContainEqual(cat.id);
    });

    test('should not duplicate follow', async () => {
      const cat = await Category.create({ name: 'Science' });
      await request(app).post(`/v1/categories/${cat.id}/follow`).set('Authorization', `Bearer ${userToken}`);
      const res = await request(app)
        .post(`/v1/categories/${cat.id}/follow`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const followedIds = res.body.data.user.followedCategories;
      const count = followedIds.filter((id) => id === cat.id).length;
      expect(count).toBe(1);
    });

    test('should 404 for non-existent category', async () => {
      await request(app)
        .post(`/v1/categories/${new mongoose.Types.ObjectId()}/follow`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('DELETE /v1/categories/:id/follow', () => {
    test('should unfollow a category', async () => {
      const cat = await Category.create({ name: 'Travel' });
      testUser.followedCategories.push(cat._id);
      await testUser.save();

      const res = await request(app)
        .delete(`/v1/categories/${cat.id}/follow`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.user.followedCategories).not.toContainEqual(cat.id);
    });
  });
});
