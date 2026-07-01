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

const fakeMedia = (overrides = {}) => ({
  url: 'https://fake-bucket.s3.amazonaws.com/news/fake/photo.jpg',
  key: 'news/fake/photo.jpg',
  type: 'image',
  ...overrides,
});

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
      .field('categories', catA.id)
      .attach('media', Buffer.from('fake-image-bytes'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(201);

    expect(res.body.data.news.media[0].type).toBe('image');
    expect(res.body.data.news.media[0].url).toContain('fake-bucket.s3.amazonaws.com');
    expect(res.body.data.news.status).toBe('public');
    expect(res.body.data.news.categories.map((c) => c.id || c)).toContain(catA.id);
  });

  test('should create a video post and infer type from mimetype', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    const res = await request(app)
      .post('/v1/news')
      .set('Authorization', `Bearer ${token}`)
      .field('caption', 'Live footage')
      .field('categories', catA.id)
      .attach('media', Buffer.from('fake-video-bytes'), { filename: 'clip.mp4', contentType: 'video/mp4' })
      .expect(201);

    expect(res.body.data.news.media[0].type).toBe('video');
  });

  test('should reject missing caption', async () => {
    const user = await User.create(makeUser());
    const token = await tokenFor(user);

    await request(app)
      .post('/v1/news')
      .set('Authorization', `Bearer ${token}`)
      .field('categories', catA.id)
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
      .field('categories', new mongoose.Types.ObjectId().toString())
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
      .field('categories', catA.id)
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
      .field('categories', catA.id)
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
        media: [fakeMedia({ url: 'u1', key: 'k1' })],
        caption: 'a',
        categories: [catA.id],
        status: 'public',
      },
      {
        author: author.id,
        media: [fakeMedia({ url: 'u2', key: 'k2' })],
        caption: 'b',
        categories: [catB.id],
        status: 'public',
      },
      {
        author: author.id,
        media: [fakeMedia({ url: 'u3', key: 'k3' })],
        caption: 'c',
        categories: [catA.id],
        status: 'flagged',
      },
    ]);

    const res = await request(app).get('/v1/news').set('Authorization', `Bearer ${token}`).expect(200);

    expect(res.body.data.posts).toHaveLength(1);
    expect(res.body.data.posts[0].caption).toBe('a');
    expect(res.body.data.meta).toMatchObject({ page: 1, total: 1 });
  });

  test('regular user with no followed categories sees all public posts', async () => {
    const user = await User.create(makeUser());
    const author = await User.create(makeUser());
    const token = await tokenFor(user);

    await News.create([
      {
        author: author.id,
        media: [fakeMedia({ url: 'u1', key: 'k1' })],
        caption: 'a',
        categories: [catA.id],
        status: 'public',
      },
      {
        author: author.id,
        media: [fakeMedia({ url: 'u2', key: 'k2' })],
        caption: 'b',
        categories: [catB.id],
        status: 'public',
      },
    ]);

    const res = await request(app).get('/v1/news').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.posts).toHaveLength(2);
  });

  test('pagination meta is correct when limit is applied', async () => {
    const user = await User.create(makeUser());
    const author = await User.create(makeUser());
    const token = await tokenFor(user);

    await News.create(
      Array.from({ length: 5 }, (_, i) => ({
        author: author.id,
        media: [fakeMedia({ url: `u${i}`, key: `k${i}` })],
        caption: `post ${i}`,
        categories: [catA.id],
        status: 'public',
      })),
    );

    const res = await request(app).get('/v1/news?page=1&limit=2').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.posts).toHaveLength(2);
    expect(res.body.data.meta).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
  });

  test('admin sees all posts including flagged, and can filter by status/category', async () => {
    const admin = await User.create(makeAdmin());
    const author = await User.create(makeUser());
    const token = await tokenFor(admin);

    await News.create([
      {
        author: author.id,
        media: [fakeMedia({ url: 'u1', key: 'k1' })],
        caption: 'a',
        categories: [catA.id],
        status: 'public',
      },
      {
        author: author.id,
        media: [fakeMedia({ url: 'u2', key: 'k2' })],
        caption: 'b',
        categories: [catB.id],
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
      media: [fakeMedia()],
      caption: 'a',
      categories: [catA.id],
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
      media: [fakeMedia()],
      caption: 'a',
      categories: [catA.id],
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
      media: [fakeMedia()],
      caption: 'a',
      categories: [catA.id],
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
      media: [fakeMedia()],
      caption: 'a',
      categories: [catA.id],
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
      media: [fakeMedia()],
      caption: 'a',
      categories: [catA.id],
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

  test('GET /:id/reactions returns paginated list filterable by type', async () => {
    const otherUser = await User.create(makeUser());
    await request(app).post(`/v1/news/${news.id}/like`).set('Authorization', `Bearer ${token}`).expect(200);
    await request(app)
      .post(`/v1/news/${news.id}/dislike`)
      .set('Authorization', `Bearer ${await tokenFor(otherUser)}`)
      .expect(200);

    const all = await request(app).get(`/v1/news/${news.id}/reactions`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(all.body.data.reactions).toHaveLength(2);
    expect(all.body.data.meta).toMatchObject({ page: 1, total: 2 });

    const likesOnly = await request(app)
      .get(`/v1/news/${news.id}/reactions?type=like`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(likesOnly.body.data.reactions).toHaveLength(1);
    expect(likesOnly.body.data.reactions[0].type).toBe('like');

    const dislikesOnly = await request(app)
      .get(`/v1/news/${news.id}/reactions?type=dislike`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(dislikesOnly.body.data.reactions).toHaveLength(1);
    expect(dislikesOnly.body.data.reactions[0].type).toBe('dislike');
  });

  test('GET /:id/reactions rejects invalid type', async () => {
    await request(app)
      .get(`/v1/news/${news.id}/reactions?type=love`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});

describe('Comments', () => {
  let news;
  let author;

  beforeEach(async () => {
    author = await User.create(makeUser());
    news = await News.create({
      author: author.id,
      media: [fakeMedia()],
      caption: 'a',
      categories: [catA.id],
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
    expect(list.body.data.meta).toMatchObject({ page: 1, total: 1 });
  });

  test('listComments only returns top-level comments, not replies', async () => {
    const commenter = await User.create(makeUser());
    const token = await tokenFor(commenter);

    const commentRes = await request(app)
      .post(`/v1/news/${news.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Top-level comment' })
      .expect(201);

    await request(app)
      .post(`/v1/news/${news.id}/comments/${commentRes.body.data.comment.id}/replies`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'A reply' })
      .expect(201);

    const list = await request(app).get(`/v1/news/${news.id}/comments`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(list.body.data.comments).toHaveLength(1);
    expect(list.body.data.comments[0].text).toBe('Top-level comment');
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

describe('Comment Replies', () => {
  let news;
  let commenter;
  let token;
  let comment;

  beforeEach(async () => {
    const author = await User.create(makeUser());
    commenter = await User.create(makeUser());
    token = await tokenFor(commenter);
    news = await News.create({
      author: author.id,
      media: [fakeMedia()],
      caption: 'a',
      categories: [catA.id],
    });
    comment = await Comment.create({ news: news.id, author: commenter.id, text: 'parent comment' });
  });

  test('adding a reply increments repliesCount on parent and does not change commentsCount', async () => {
    const res = await request(app)
      .post(`/v1/news/${news.id}/comments/${comment.id}/replies`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'great point!' })
      .expect(201);

    expect(res.body.data.reply.text).toBe('great point!');
    expect(res.body.data.reply.author).toBeDefined();

    const updatedComment = await Comment.findById(comment.id);
    expect(updatedComment.repliesCount).toBe(1);

    const updatedNews = await News.findById(news.id);
    expect(updatedNews.commentsCount).toBe(0);
  });

  test('listReplies returns replies in chronological order with pagination', async () => {
    for (let i = 0; i < 3; i++) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post(`/v1/news/${news.id}/comments/${comment.id}/replies`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: `reply ${i}` })
        .expect(201);
    }

    const res = await request(app)
      .get(`/v1/news/${news.id}/comments/${comment.id}/replies?page=1&limit=2`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.replies).toHaveLength(2);
    expect(res.body.data.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(res.body.data.replies[0].text).toBe('reply 0');
    expect(res.body.data.replies[1].text).toBe('reply 1');
  });

  test('reply to a non-existent comment returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await request(app)
      .post(`/v1/news/${news.id}/comments/${fakeId}/replies`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'orphan reply' })
      .expect(404);
  });

  test('cannot reply to a reply (only top-level comments accept replies)', async () => {
    const replyRes = await request(app)
      .post(`/v1/news/${news.id}/comments/${comment.id}/replies`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'first reply' })
      .expect(201);

    const replyId = replyRes.body.data.reply.id;

    await request(app)
      .post(`/v1/news/${news.id}/comments/${replyId}/replies`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'nested reply' })
      .expect(404);
  });

  test('deleting a reply decrements repliesCount on the parent', async () => {
    const replyRes = await request(app)
      .post(`/v1/news/${news.id}/comments/${comment.id}/replies`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'will be deleted' })
      .expect(201);

    await request(app)
      .delete(`/v1/news/comments/${replyRes.body.data.reply.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const updatedComment = await Comment.findById(comment.id);
    expect(updatedComment.repliesCount).toBe(0);
  });
});
