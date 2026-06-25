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
        const key = `news/fake/${Date.now()}-${file.originalname}`;
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
const { Category, Comment, News, Reaction, User } = require('../../src/models');
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

let catA;
let catB;

beforeEach(async () => {
  [catA, catB] = await Category.create([{ name: 'Politics' }, { name: 'Sports' }]);
});

describe('POST /v1/news (create post)', () => {
  test('should create an image post and upload to S3', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    const res = await request(app)
      .post('/v1/news')
      .set('Authorization', `Bearer ${token}`)
      .field('caption', 'Breaking news')
      .field('category', catA.id)
      .attach('media', Buffer.from('fake-image-bytes'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(201);

    expect(res.body.data.news.type).toBe('image');
    expect(res.body.data.news.mediaUrl).toContain('fake-bucket.s3.amazonaws.com');
    expect(res.body.data.news.status).toBe('public');
    expect(res.body.data.news.category).toBe(catA.id);
  });

  test('should create a video post and infer type from mimetype', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    const res = await request(app)
      .post('/v1/news')
      .set('Authorization', `Bearer ${token}`)
      .field('caption', 'Live footage')
      .field('category', catA.id)
      .attach('media', Buffer.from('fake-video-bytes'), { filename: 'clip.mp4', contentType: 'video/mp4' })
      .expect(201);

    expect(res.body.data.news.type).toBe('video');
  });

  test('should reject missing caption', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    await request(app)
      .post('/v1/news')
      .set('Authorization', `Bearer ${token}`)
      .field('category', catA.id)
      .attach('media', Buffer.from('x'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(400);
  });

  test('should reject an unknown category', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    await request(app)
      .post('/v1/news')
      .set('Authorization', `Bearer ${token}`)
      .field('caption', 'Hello')
      .field('category', new mongoose.Types.ObjectId().toString())
      .attach('media', Buffer.from('x'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(400);
  });

  test('should reject a disallowed mimetype', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    await request(app)
      .post('/v1/news')
      .set('Authorization', `Bearer ${token}`)
      .field('caption', 'Hello')
      .field('category', catA.id)
      .attach('media', Buffer.from('x'), { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(400);
  });

  test('should reject when no media file is attached', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    await request(app)
      .post('/v1/news')
      .set('Authorization', `Bearer ${token}`)
      .field('caption', 'Hello')
      .field('category', catA.id)
      .expect(400);
  });
});

describe('GET /v1/news (role-based getAll)', () => {
  test('regular user only sees public posts in followed categories', async () => {
    const user = await User.create(makeUser({ followedCategories: [catA._id] }));
    const author = await User.create(makeUser());
    const token = await tokenFor(user);

    await News.create([
      {
        author: author.id,
        type: 'image',
        mediaUrl: 'u1',
        mediaKey: 'k1',
        caption: 'a',
        category: catA.id,
        status: 'public',
      },
      {
        author: author.id,
        type: 'image',
        mediaUrl: 'u2',
        mediaKey: 'k2',
        caption: 'b',
        category: catB.id,
        status: 'public',
      },
      {
        author: author.id,
        type: 'image',
        mediaUrl: 'u3',
        mediaKey: 'k3',
        caption: 'c',
        category: catA.id,
        status: 'flagged',
      },
    ]);

    const res = await request(app).get('/v1/news').set('Authorization', `Bearer ${token}`).expect(200);

    expect(res.body.data.posts).toHaveLength(1);
    expect(res.body.data.posts[0].caption).toBe('a');
  });

  test('regular user with no followed categories sees all public posts', async () => {
    const user = await User.create(makeUser());
    const author = await User.create(makeUser());
    const token = await tokenFor(user);

    await News.create([
      {
        author: author.id,
        type: 'image',
        mediaUrl: 'u1',
        mediaKey: 'k1',
        caption: 'a',
        category: catA.id,
        status: 'public',
      },
      {
        author: author.id,
        type: 'image',
        mediaUrl: 'u2',
        mediaKey: 'k2',
        caption: 'b',
        category: catB.id,
        status: 'public',
      },
    ]);

    const res = await request(app).get('/v1/news').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.posts).toHaveLength(2);
  });

  test('admin sees all posts including flagged, and can filter by status/category', async () => {
    const admin = await User.create(makeAdmin());
    const author = await User.create(makeUser());
    const token = await tokenFor(admin);

    await News.create([
      {
        author: author.id,
        type: 'image',
        mediaUrl: 'u1',
        mediaKey: 'k1',
        caption: 'a',
        category: catA.id,
        status: 'public',
      },
      {
        author: author.id,
        type: 'image',
        mediaUrl: 'u2',
        mediaKey: 'k2',
        caption: 'b',
        category: catB.id,
        status: 'flagged',
      },
    ]);

    const all = await request(app).get('/v1/news').set('Authorization', `Bearer ${token}`).expect(200);
    expect(all.body.data.posts).toHaveLength(2);

    const flaggedOnly = await request(app)
      .get('/v1/news?status=flagged')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(flaggedOnly.body.data.posts).toHaveLength(1);
    expect(flaggedOnly.body.data.posts[0].caption).toBe('b');
  });

  test('should reject unauthenticated request', async () => {
    await request(app).get('/v1/news').expect(401);
  });
});

describe('GET /v1/news/:id', () => {
  test('404s a flagged post for a stranger but 200s for the owner and an admin', async () => {
    const owner = await User.create(makeUser());
    const stranger = await User.create(makeUser());
    const admin = await User.create(makeAdmin());
    const news = await News.create({
      author: owner.id,
      type: 'image',
      mediaUrl: 'u1',
      mediaKey: 'k1',
      caption: 'a',
      category: catA.id,
      status: 'flagged',
    });

    await request(app)
      .get(`/v1/news/${news.id}`)
      .set('Authorization', `Bearer ${await tokenFor(stranger)}`)
      .expect(404);

    await request(app)
      .get(`/v1/news/${news.id}`)
      .set('Authorization', `Bearer ${await tokenFor(owner)}`)
      .expect(200);

    await request(app)
      .get(`/v1/news/${news.id}`)
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .expect(200);
  });
});

describe('DELETE /v1/news/:id', () => {
  test('owner can soft-delete their own post', async () => {
    const owner = await User.create(makeUser());
    const news = await News.create({
      author: owner.id,
      type: 'image',
      mediaUrl: 'u1',
      mediaKey: 'k1',
      caption: 'a',
      category: catA.id,
    });

    await request(app)
      .delete(`/v1/news/${news.id}`)
      .set('Authorization', `Bearer ${await tokenFor(owner)}`)
      .expect(200);

    const found = await News.findById(news.id);
    expect(found.status).toBe('deleted');
  });

  test('non-owner non-admin cannot delete', async () => {
    const owner = await User.create(makeUser());
    const stranger = await User.create(makeUser());
    const news = await News.create({
      author: owner.id,
      type: 'image',
      mediaUrl: 'u1',
      mediaKey: 'k1',
      caption: 'a',
      category: catA.id,
    });

    await request(app)
      .delete(`/v1/news/${news.id}`)
      .set('Authorization', `Bearer ${await tokenFor(stranger)}`)
      .expect(403);
  });

  test('admin can delete any post', async () => {
    const owner = await User.create(makeUser());
    const admin = await User.create(makeAdmin());
    const news = await News.create({
      author: owner.id,
      type: 'image',
      mediaUrl: 'u1',
      mediaKey: 'k1',
      caption: 'a',
      category: catA.id,
    });

    await request(app)
      .delete(`/v1/news/${news.id}`)
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .expect(200);

    const found = await News.findById(news.id);
    expect(found.status).toBe('deleted');
  });
});

describe('Reactions', () => {
  let news;
  let user;
  let token;

  beforeEach(async () => {
    const author = await User.create(makeUser());
    user = await User.create(makeUser());
    token = await tokenFor(user);
    news = await News.create({
      author: author.id,
      type: 'image',
      mediaUrl: 'u1',
      mediaKey: 'k1',
      caption: 'a',
      category: catA.id,
    });
  });

  test('like increments likesCount and is idempotent on repeat', async () => {
    await request(app).post(`/v1/news/${news.id}/like`).set('Authorization', `Bearer ${token}`).expect(200);
    let found = await News.findById(news.id);
    expect(found.likesCount).toBe(1);

    await request(app).post(`/v1/news/${news.id}/like`).set('Authorization', `Bearer ${token}`).expect(200);
    found = await News.findById(news.id);
    expect(found.likesCount).toBe(1);

    const reactions = await Reaction.find({ news: news.id, user: user.id });
    expect(reactions).toHaveLength(1);
  });

  test('switching from like to dislike adjusts both counters', async () => {
    await request(app).post(`/v1/news/${news.id}/like`).set('Authorization', `Bearer ${token}`).expect(200);
    await request(app).post(`/v1/news/${news.id}/dislike`).set('Authorization', `Bearer ${token}`).expect(200);

    const found = await News.findById(news.id);
    expect(found.likesCount).toBe(0);
    expect(found.dislikesCount).toBe(1);
  });

  test('removing a reaction decrements the counter', async () => {
    await request(app).post(`/v1/news/${news.id}/like`).set('Authorization', `Bearer ${token}`).expect(200);
    await request(app).delete(`/v1/news/${news.id}/reaction`).set('Authorization', `Bearer ${token}`).expect(200);

    const found = await News.findById(news.id);
    expect(found.likesCount).toBe(0);
  });
});

describe('Comments', () => {
  let news;
  let author;

  beforeEach(async () => {
    author = await User.create(makeUser());
    news = await News.create({
      author: author.id,
      type: 'image',
      mediaUrl: 'u1',
      mediaKey: 'k1',
      caption: 'a',
      category: catA.id,
    });
  });

  test('adding a comment increments commentsCount and is listable', async () => {
    const commenter = await User.create(makeUser());
    const token = await tokenFor(commenter);

    const res = await request(app)
      .post(`/v1/news/${news.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Nice post!' })
      .expect(201);

    expect(res.body.data.comment.text).toBe('Nice post!');

    const found = await News.findById(news.id);
    expect(found.commentsCount).toBe(1);

    const list = await request(app).get(`/v1/news/${news.id}/comments`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(list.body.data.comments).toHaveLength(1);
  });

  test('only the comment author or an admin can delete it', async () => {
    const commenter = await User.create(makeUser());
    const stranger = await User.create(makeUser());
    const admin = await User.create(makeAdmin());
    const comment = await Comment.create({ news: news.id, author: commenter.id, text: 'hi' });
    await News.findByIdAndUpdate(news.id, { $inc: { commentsCount: 1 } });

    await request(app)
      .delete(`/v1/news/comments/${comment.id}`)
      .set('Authorization', `Bearer ${await tokenFor(stranger)}`)
      .expect(403);

    await request(app)
      .delete(`/v1/news/comments/${comment.id}`)
      .set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .expect(200);

    const found = await News.findById(news.id);
    expect(found.commentsCount).toBe(0);
  });
});
