const request = require('supertest');

const app = require('../../src/app');

describe('Health route', () => {
  test('should return ok status', async () => {
    await request(app).get('/v1/health').expect(200).expect({ status: 'ok' });
  });
});
