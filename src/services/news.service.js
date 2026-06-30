const httpStatus = require('http-status');

const { Category, Comment, News, Reaction } = require('../models');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');

const getNewsOr404 = async (id) => {
  const news = await News.findById(id);
  if (!news) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
  }
  return news;
};

const createNews = async (user, file, body) => {
  const category = await Category.findById(body.category);
  if (!category) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid category');
  }

  const type = file.mimetype.startsWith('video/') ? 'video' : 'image';

  return News.create({
    author: user.id,
    type,
    mediaUrl: file.location,
    mediaKey: file.key,
    caption: body.caption,
    description: body.description || null,
    category: body.category,
    location: {
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      city: body.city || null,
      state: body.state || null,
      country: body.country || null,
    },
  });
};

const buildAdminFilter = (query) => {
  const filter = query.status ? { status: query.status } : { status: { $ne: 'deleted' } };
  if (query.category) filter.category = query.category;
  if (query.author) filter.author = query.author;
  if (query.city) filter['location.city'] = query.city;
  if (query.state) filter['location.state'] = query.state;
  if (query.country) filter['location.country'] = query.country;
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
  }
  return filter;
};

const buildUserFilter = (user, query) => {
  const authorId = query.author || user.id;
  const isSelf = authorId === user.id;
  const filter = { author: authorId };
  filter.status = isSelf ? query.status || { $ne: 'deleted' } : 'public';
  if (query.category) {
    filter.category = query.category;
  }
  return filter;
};

const attachReactionsAndComments = async (newsItems) => {
  if (!newsItems.length) return newsItems;
  const ids = newsItems.map((news) => news.id);
  const [reactions, comments] = await Promise.all([
    Reaction.find({ news: { $in: ids } }).populate('user', 'name avatar role'),
    Comment.find({ news: { $in: ids } })
      .sort({ createdAt: -1 })
      .populate('author', 'name avatar role'),
  ]);

  return newsItems.map((news) => {
    const json = news.toJSON();
    json.likedBy = reactions.filter((r) => r.type === 'like' && r.news.toString() === news.id && r.user).map((r) => r.user);
    json.dislikedBy = reactions
      .filter((r) => r.type === 'dislike' && r.news.toString() === news.id && r.user)
      .map((r) => r.user);
    json.comments = comments
      .filter((c) => c.news.toString() === news.id && c.author)
      .map((c) => ({ id: c.id, text: c.text, createdAt: c.createdAt, author: c.author }));
    return json;
  });
};

const listNews = async (user, query) => {
  const filter = user.isOperator() ? buildAdminFilter(query) : buildUserFilter(user, query);
  const paginated = await paginate(News, filter, query.page, query.limit, [
    ['author', 'name avatar role'],
    ['category', 'name'],
  ]);
  paginated.results = await attachReactionsAndComments(paginated.results);
  return paginated;
};

const listNewsByCategory = async (user, categoryId, query) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  const isOperator = user.isOperator();
  if (!isOperator) {
    const isFollowing = user.followedCategories.some((c) => c.toString() === categoryId);
    if (!isFollowing) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You can only view news for categories you follow');
    }
  }

  const filter = { category: categoryId };
  filter.status = isOperator ? query.status || { $ne: 'deleted' } : 'public';

  const paginated = await paginate(News, filter, query.page, query.limit, [
    ['author', 'name avatar role'],
    ['category', 'name'],
  ]);
  paginated.results = await attachReactionsAndComments(paginated.results);
  return paginated;
};

const getNewsById = async (user, id) => {
  const news = await getNewsOr404(id);
  const isOwner = Boolean(user) && news.author.toString() === user.id;
  const isOperator = Boolean(user) && user.isOperator();
  if (!isOperator && !isOwner && news.status !== 'public') {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
  }
  const populated = await News.findById(id).populate('author', 'name avatar role').populate('category', 'name');
  const [withDetails] = await attachReactionsAndComments([populated]);
  return withDetails;
};

const deleteNews = async (user, id) => {
  const news = await getNewsOr404(id);
  const isOwner = news.author.toString() === user.id;
  if (!isOwner && !user.isOperator()) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete your own posts');
  }
  news.status = 'deleted';
  await news.save();
};

const reactToNews = async (user, id, type) => {
  const news = await getNewsOr404(id);
  const existing = await Reaction.findOne({ news: id, user: user.id });

  if (existing && existing.type === type) {
    return news;
  }

  if (existing) {
    existing.type = type;
    await existing.save();
    if (type === 'like') {
      news.likesCount += 1;
      news.dislikesCount = Math.max(0, news.dislikesCount - 1);
    } else {
      news.dislikesCount += 1;
      news.likesCount = Math.max(0, news.likesCount - 1);
    }
  } else {
    await Reaction.create({ news: id, user: user.id, type });
    if (type === 'like') {
      news.likesCount += 1;
    } else {
      news.dislikesCount += 1;
    }
  }

  await news.save();
  return news;
};

const removeReaction = async (user, id) => {
  const news = await getNewsOr404(id);
  const existing = await Reaction.findOneAndDelete({ news: id, user: user.id });
  if (!existing) {
    return news;
  }

  if (existing.type === 'like') {
    news.likesCount = Math.max(0, news.likesCount - 1);
  } else {
    news.dislikesCount = Math.max(0, news.dislikesCount - 1);
  }
  await news.save();
  return news;
};

const addComment = async (user, id, text) => {
  await getNewsOr404(id);
  const comment = await Comment.create({ news: id, author: user.id, text });
  await News.findByIdAndUpdate(id, { $inc: { commentsCount: 1 } });
  return comment.populate('author', 'name avatar role');
};

const listComments = async (id, query) => {
  await getNewsOr404(id);
  return paginate(Comment, { news: id }, query.page, query.limit, [['author', 'name avatar role']]);
};

const deleteComment = async (user, commentId) => {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Comment not found');
  }
  const isOwner = comment.author.toString() === user.id;
  if (!isOwner && !user.isOperator()) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete your own comments');
  }
  await comment.deleteOne();
  await News.findByIdAndUpdate(comment.news, { $inc: { commentsCount: -1 } });
};

module.exports = {
  addComment,
  createNews,
  deleteComment,
  deleteNews,
  getNewsById,
  listComments,
  listNews,
  listNewsByCategory,
  reactToNews,
  removeReaction,
};
